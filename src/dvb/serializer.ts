import type { SubtitleDocument, SubtitleEvent, ImageEffect } from '../core/types.ts'

const SYNC_BYTE = 0x0F
const PAGE_COMPOSITION = 0x10
const REGION_COMPOSITION = 0x11
const CLUT_DEFINITION = 0x12
const OBJECT_DATA = 0x13
const END_OF_DISPLAY_SET = 0x80

class DVBSerializer {
  private segments: Uint8Array[] = []
  private objectIdCounter = 0
  private regionIdCounter = 0

  serialize(doc: SubtitleDocument): Uint8Array {
    for (const event of doc.events) {
      this.serializeEvent(event)
    }

    // Combine all segments
    const totalLength = this.segments.reduce((sum, seg) => sum + seg.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0

    for (const segment of this.segments) {
      result.set(segment, offset)
      offset += segment.length
    }

    return result
  }

  private serializeEvent(event: SubtitleEvent): void {
    // Extract image effects from segments
    const imageEffects: ImageEffect[] = []
    for (const segment of event.segments) {
      for (const effect of segment.effects) {
        if (effect.type === 'image') {
          imageEffects.push(effect as ImageEffect)
        }
      }
    }

    if (imageEffects.length === 0) return

    const pageId = 0
    const timeout = Math.min(255, Math.floor((event.end - event.start) / 1000))

    // Write page composition segment
    this.writePageComposition(pageId, timeout, imageEffects.length)

    // Write CLUT for each image that has a palette
    const clutWritten = new Set<string>()
    for (let i = 0; i < imageEffects.length; i++) {
      const image = imageEffects[i]
      if (image.params.palette && image.params.palette.length > 0) {
        const paletteKey = image.params.palette.join(',')
        if (!clutWritten.has(paletteKey)) {
          this.writeCLUT(i, image.params.palette)
          clutWritten.add(paletteKey)
        }
      }
    }

    // Write region and object for each image
    for (let i = 0; i < imageEffects.length; i++) {
      const image = imageEffects[i]
      const regionId = this.regionIdCounter++
      const objectId = this.objectIdCounter++

      this.writeRegionComposition(regionId, pageId, image.params.x || 0, image.params.y || 0,
                                   image.params.width, image.params.height, i)
      this.writeObjectData(objectId, pageId, image.params.data, image.params.width, image.params.height)
    }

    // Write end of display set
    this.writeEndOfDisplaySet(pageId)
  }

  private writePageComposition(pageId: number, timeout: number, regionCount: number): void {
    const data = new Uint8Array(2 + regionCount * 6)
    const view = new DataView(data.buffer)

    view.setUint8(0, timeout)
    view.setUint8(1, 0x00) // version 0, page state 0

    // For simplicity, we don't write region references in page composition
    // Real implementation would include region positioning here

    this.writeSegment(PAGE_COMPOSITION, pageId, data)
  }

  private writeRegionComposition(regionId: number, pageId: number, x: number, y: number,
                                  width: number, height: number, clutId: number): void {
    const data = new Uint8Array(16)
    const view = new DataView(data.buffer)

    view.setUint8(0, regionId)
    view.setUint8(1, 0x00) // version 0
    view.setUint8(2, 0x00) // fill flag
    view.setUint16(3, x, false)
    view.setUint16(5, y, false)
    view.setUint16(7, width, false)
    view.setUint16(9, height, false)
    view.setUint8(11, clutId)
    view.setUint8(12, 0x08) // 8-bit depth
    view.setUint8(13, 0x00) // object count
    view.setUint16(14, 0, false) // object ID

    this.writeSegment(REGION_COMPOSITION, pageId, data)
  }

  private writeCLUT(clutId: number, palette: number[]): void {
    const data = new Uint8Array(2 + palette.length * 6)
    const view = new DataView(data.buffer)

    view.setUint8(0, clutId)
    view.setUint8(1, 0x00) // version 0

    let offset = 2
    for (let i = 0; i < palette.length; i++) {
      const rgba = palette[i]
      const r = (rgba >> 24) & 0xFF
      const g = (rgba >> 16) & 0xFF
      const b = (rgba >> 8) & 0xFF
      const a = rgba & 0xFF

      const { y, cr, cb } = this.rgbaToYcrcb(r, g, b)
      const t = 255 - a // Convert alpha to transparency

      view.setUint8(offset, i) // entry ID
      view.setUint8(offset + 1, 0x01) // full range flag
      view.setUint8(offset + 2, y)
      view.setUint8(offset + 3, cr)
      view.setUint8(offset + 4, cb)
      view.setUint8(offset + 5, t)

      offset += 6
    }

    this.writeSegment(CLUT_DEFINITION, 0, data)
  }

  private writeObjectData(objectId: number, pageId: number, pixelData: Uint8Array,
                          width: number, height: number): void {
    // Encode with simple RLE
    const encoded = this.encodeRLE(pixelData)
    const data = new Uint8Array(7 + encoded.length)
    const view = new DataView(data.buffer)

    view.setUint16(0, objectId, false)
    view.setUint8(2, 0x00) // version 0, coding method 0
    view.setUint16(3, encoded.length, false) // top field length
    view.setUint16(5, 0, false) // bottom field length

    data.set(encoded, 7)

    this.writeSegment(OBJECT_DATA, pageId, data)
  }

  private writeEndOfDisplaySet(pageId: number): void {
    this.writeSegment(END_OF_DISPLAY_SET, pageId, new Uint8Array(0))
  }

  private writeSegment(type: number, pageId: number, data: Uint8Array): void {
    const segment = new Uint8Array(6 + data.length)
    const view = new DataView(segment.buffer)

    view.setUint8(0, SYNC_BYTE)
    view.setUint8(1, type)
    view.setUint16(2, pageId, false)
    view.setUint16(4, data.length, false)

    segment.set(data, 6)

    this.segments.push(segment)
  }

  private encodeRLE(data: Uint8Array): Uint8Array {
    const encoded: number[] = []
    let i = 0

    while (i < data.length) {
      const pixel = data[i]
      let runLength = 1

      // Count consecutive pixels
      while (i + runLength < data.length && data[i + runLength] === pixel && runLength < 63) {
        runLength++
      }

      if (runLength === 1) {
        // Single pixel
        if (pixel !== 0) {
          encoded.push(pixel)
        } else {
          encoded.push(0, 0x01) // Run of 1 color 0
        }
      } else if (pixel === 0) {
        // Run of color 0
        if (runLength <= 63) {
          encoded.push(0, runLength)
        } else {
          encoded.push(0, 0x80 | ((runLength >> 8) & 0x3F), runLength & 0xFF)
        }
      } else {
        // Run of color
        if (runLength <= 63) {
          encoded.push(0, 0x40 | runLength, pixel)
        } else {
          encoded.push(0, 0xC0 | ((runLength >> 8) & 0x3F), runLength & 0xFF, pixel)
        }
      }

      i += runLength
    }

    // End of line
    encoded.push(0, 0)

    return new Uint8Array(encoded)
  }

  private rgbaToYcrcb(r: number, g: number, b: number): { y: number, cr: number, cb: number } {
    // ITU-R BT.601 conversion
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    const cr = Math.round(128 + 0.5 * r - 0.418688 * g - 0.081312 * b)
    const cb = Math.round(128 - 0.168736 * r - 0.331264 * g + 0.5 * b)

    return {
      y: Math.max(0, Math.min(255, y)),
      cr: Math.max(0, Math.min(255, cr)),
      cb: Math.max(0, Math.min(255, cb))
    }
  }
}

/**
 * Convert subtitle document to DVB (Digital Video Broadcasting) format
 * @param doc - Subtitle document to serialize
 * @returns Binary DVB subtitle data
 * @example
 * const dvbData = toDVB(document)
 * Bun.write('output.dvb', dvbData)
 */
export function toDVB(doc: SubtitleDocument): Uint8Array {
  const serializer = new DVBSerializer()
  return serializer.serialize(doc)
}
