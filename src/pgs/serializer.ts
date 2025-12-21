import type { SubtitleDocument, SubtitleEvent, ImageEffect, PGSEffect } from '../core/types.ts'
import {
  SegmentType,
  type PaletteEntry,
  compressRLE,
  rgbaToYcbcr,
} from './segments.ts'

class PGSSerializer {
  private doc: SubtitleDocument
  private buffer: number[] = []

  constructor(doc: SubtitleDocument) {
    this.doc = doc
  }

  serialize(): Uint8Array {
    let compositionNumber = 0

    for (const event of this.doc.events) {
      // Find image and PGS effects
      const imageEffect = this.findImageEffect(event)
      const pgsEffect = this.findPGSEffect(event)

      if (!imageEffect) continue

      const { width, height, x, y, data, palette } = imageEffect.params
      const windowId = pgsEffect?.params.windowId ?? 0
      compositionNumber = pgsEffect?.params.compositionNumber ?? compositionNumber

      // Convert times to PTS (90kHz)
      const pts = Math.round(event.start * 90)
      const dts = pts

      // Build palette entries from palette
      const paletteEntries = this.buildPaletteEntries(palette || [])

      // Compress image data
      const compressed = compressRLE(data, width)

      // Write PCS
      this.writeCompositionSegment(pts, dts, compositionNumber, width, height, x || 0, y || 0, windowId, 0)

      // Write WDS
      this.writeWindowSegment(pts, dts, windowId, x || 0, y || 0, width, height)

      // Write PDS
      this.writePaletteSegment(pts, dts, 0, paletteEntries)

      // Write ODS
      this.writeObjectSegment(pts, dts, 0, width, height, compressed)

      // Write END
      this.writeEndSegment(pts, dts)

      compositionNumber++
    }

    return new Uint8Array(this.buffer)
  }

  private findImageEffect(event: SubtitleEvent): ImageEffect | null {
    for (const segment of event.segments) {
      for (const effect of segment.effects) {
        if (effect.type === 'image') {
          return effect as ImageEffect
        }
      }
    }
    return null
  }

  private findPGSEffect(event: SubtitleEvent): PGSEffect | null {
    for (const segment of event.segments) {
      for (const effect of segment.effects) {
        if (effect.type === 'pgs') {
          return effect as PGSEffect
        }
      }
    }
    return null
  }

  private buildPaletteEntries(palette: number[]): PaletteEntry[] {
    const entries: PaletteEntry[] = []
    for (let i = 0; i < palette.length; i++) {
      const entry = rgbaToYcbcr(palette[i])
      entry.id = i
      entries.push(entry)
    }
    return entries
  }

  private writeSegmentHeader(pts: number, dts: number, type: SegmentType, size: number): void {
    // Magic "PG"
    this.buffer.push(0x50, 0x47)
    // PTS (4 bytes)
    this.writeUint32(pts)
    // DTS (4 bytes)
    this.writeUint32(dts)
    // Type (1 byte)
    this.buffer.push(type)
    // Size (2 bytes)
    this.writeUint16(size)
  }

  private writeCompositionSegment(
    pts: number,
    dts: number,
    compositionNumber: number,
    width: number,
    height: number,
    x: number,
    y: number,
    windowId: number,
    objectId: number
  ): void {
    const data: number[] = []

    // Video descriptor
    data.push((width >> 8) & 0xFF, width & 0xFF)
    data.push((height >> 8) & 0xFF, height & 0xFF)
    data.push(0x10) // Frame rate (placeholder)

    // Composition descriptor
    data.push((compositionNumber >> 8) & 0xFF, compositionNumber & 0xFF)
    data.push(0x80) // Composition state (Epoch Start)
    data.push(0x00) // Palette update flag
    data.push(0x00) // Palette ID
    data.push(0x01) // Number of composition objects

    // Composition object
    data.push((objectId >> 8) & 0xFF, objectId & 0xFF)
    data.push(windowId)
    data.push(0x00) // Flags (not forced, not cropped)
    data.push((x >> 8) & 0xFF, x & 0xFF)
    data.push((y >> 8) & 0xFF, y & 0xFF)

    this.writeSegmentHeader(pts, dts, SegmentType.PCS, data.length)
    this.buffer.push(...data)
  }

  private writeWindowSegment(
    pts: number,
    dts: number,
    windowId: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const data: number[] = []

    data.push(0x01) // Number of windows
    data.push(windowId)
    data.push((x >> 8) & 0xFF, x & 0xFF)
    data.push((y >> 8) & 0xFF, y & 0xFF)
    data.push((width >> 8) & 0xFF, width & 0xFF)
    data.push((height >> 8) & 0xFF, height & 0xFF)

    this.writeSegmentHeader(pts, dts, SegmentType.WDS, data.length)
    this.buffer.push(...data)
  }

  private writePaletteSegment(
    pts: number,
    dts: number,
    paletteId: number,
    entries: PaletteEntry[]
  ): void {
    const data: number[] = []

    data.push(paletteId)
    data.push(0x00) // Version

    for (const entry of entries) {
      data.push(entry.id, entry.y, entry.cr, entry.cb, entry.alpha)
    }

    this.writeSegmentHeader(pts, dts, SegmentType.PDS, data.length)
    this.buffer.push(...data)
  }

  private writeObjectSegment(
    pts: number,
    dts: number,
    objectId: number,
    width: number,
    height: number,
    data: Uint8Array
  ): void {
    const header: number[] = []

    header.push((objectId >> 8) & 0xFF, objectId & 0xFF)
    header.push(0x00) // Version
    header.push(0xC0) // Flags (first and last in sequence)

    // Data length (24-bit)
    const dataLen = data.length + 4
    header.push((dataLen >> 16) & 0xFF, (dataLen >> 8) & 0xFF, dataLen & 0xFF)

    // Dimensions
    header.push((width >> 8) & 0xFF, width & 0xFF)
    header.push((height >> 8) & 0xFF, height & 0xFF)

    const totalSize = header.length + data.length
    this.writeSegmentHeader(pts, dts, SegmentType.ODS, totalSize)
    this.buffer.push(...header)

    for (let i = 0; i < data.length; i++) {
      this.buffer.push(data[i])
    }
  }

  private writeEndSegment(pts: number, dts: number): void {
    this.writeSegmentHeader(pts, dts, SegmentType.END, 0)
  }

  private writeUint16(value: number): void {
    this.buffer.push((value >> 8) & 0xFF, value & 0xFF)
  }

  private writeUint32(value: number): void {
    this.buffer.push(
      (value >> 24) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 8) & 0xFF,
      value & 0xFF
    )
  }
}

/**
 * Convert subtitle document to PGS (Presentation Graphic Stream) format
 * @param doc - Subtitle document to serialize
 * @returns Binary PGS data
 * @example
 * const pgsData = toPGS(document)
 * Bun.write('output.sup', pgsData)
 */
export function toPGS(doc: SubtitleDocument): Uint8Array {
  const serializer = new PGSSerializer(doc)
  return serializer.serialize()
}
