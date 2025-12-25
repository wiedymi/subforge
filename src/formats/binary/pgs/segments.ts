/**
 * PGS segment type identifiers
 */
export const enum SegmentType {
  /** Palette Definition Segment */
  PDS = 0x14,
  /** Object Definition Segment */
  ODS = 0x15,
  /** Presentation Composition Segment */
  PCS = 0x16,
  /** Window Definition Segment */
  WDS = 0x17,
  /** End of Display Set */
  END = 0x80,
}

/**
 * Header structure present in all PGS segments
 */
export interface SegmentHeader {
  /** Presentation timestamp in 90kHz clock units */
  pts: number
  /** Decode timestamp in 90kHz clock units */
  dts: number
  /** Type of segment */
  type: SegmentType
  /** Size of segment data in bytes */
  size: number
}

/**
 * Palette Definition Segment containing color palette information
 */
export interface PaletteSegment {
  /** Unique palette identifier */
  paletteId: number
  /** Version number for palette updates */
  version: number
  /** Array of color palette entries */
  entries: PaletteEntry[]
}

/**
 * Single entry in a color palette using YCbCr color space
 */
export interface PaletteEntry {
  /** Palette entry index (0-255) */
  id: number
  /** Luma (brightness) component */
  y: number
  /** Red chroma component */
  cr: number
  /** Blue chroma component */
  cb: number
  /** Alpha (transparency) value */
  alpha: number
}

/**
 * Object Definition Segment containing RLE-compressed image data
 */
export interface ObjectSegment {
  /** Unique object identifier */
  objectId: number
  /** Version number for object updates */
  version: number
  /** True if this is the last segment in a multi-segment object */
  lastInSequence: boolean
  /** True if this is the first segment in a multi-segment object */
  firstInSequence: boolean
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** RLE-compressed image data */
  data: Uint8Array
}

/**
 * Presentation Composition Segment describing how objects are displayed
 */
export interface CompositionSegment {
  /** Video width in pixels */
  width: number
  /** Video height in pixels */
  height: number
  /** Frame rate code */
  frameRate: number
  /** Sequential composition number */
  compositionNumber: number
  /** Composition state flags */
  compositionState: number
  /** True if palette should be updated */
  paletteUpdateFlag: boolean
  /** ID of palette to use */
  paletteId: number
  /** Array of objects to be composed */
  objects: CompositionObject[]
}

/**
 * Object reference within a composition, specifying position and cropping
 */
export interface CompositionObject {
  /** Reference to object ID */
  objectId: number
  /** Window this object belongs to */
  windowId: number
  /** Horizontal position in pixels */
  x: number
  /** Vertical position in pixels */
  y: number
  /** True if this is a forced subtitle */
  forced: boolean
  /** True if object should be cropped */
  cropped: boolean
  /** Crop horizontal offset (if cropped) */
  cropX?: number
  /** Crop vertical offset (if cropped) */
  cropY?: number
  /** Crop width (if cropped) */
  cropWidth?: number
  /** Crop height (if cropped) */
  cropHeight?: number
}

/**
 * Window Definition Segment defining the display window
 */
export interface WindowSegment {
  /** Unique window identifier */
  windowId: number
  /** Horizontal position in pixels */
  x: number
  /** Vertical position in pixels */
  y: number
  /** Window width in pixels */
  width: number
  /** Window height in pixels */
  height: number
}

/**
 * Parse a PGS segment header from binary data
 * @param view - DataView containing PGS data
 * @param offset - Byte offset to start parsing
 * @returns Parsed segment header or null if invalid
 */
export function parseSegmentHeader(view: DataView, offset: number): SegmentHeader | null {
  if (offset + 13 > view.byteLength) return null

  // Check magic bytes "PG"
  if (view.getUint8(offset) !== 0x50 || view.getUint8(offset + 1) !== 0x47) {
    return null
  }

  const pts = view.getUint32(offset + 2)
  const dts = view.getUint32(offset + 6)
  const type = view.getUint8(offset + 10)
  const size = view.getUint16(offset + 11)

  return { pts, dts, type, size }
}

/**
 * Parse a Palette Definition Segment from binary data
 * @param view - DataView containing segment data
 * @param offset - Byte offset to start parsing
 * @param size - Size of segment data in bytes
 * @returns Parsed palette segment or null if invalid
 */
export function parsePaletteSegment(view: DataView, offset: number, size: number): PaletteSegment | null {
  if (offset + size > view.byteLength || size < 2) return null

  const paletteId = view.getUint8(offset)
  const version = view.getUint8(offset + 1)
  const entries: PaletteEntry[] = []

  let pos = offset + 2
  const end = offset + size

  while (pos + 5 <= end) {
    entries.push({
      id: view.getUint8(pos),
      y: view.getUint8(pos + 1),
      cr: view.getUint8(pos + 2),
      cb: view.getUint8(pos + 3),
      alpha: view.getUint8(pos + 4),
    })
    pos += 5
  }

  return { paletteId, version, entries }
}

/**
 * Parse an Object Definition Segment from binary data
 * @param view - DataView containing segment data
 * @param offset - Byte offset to start parsing
 * @param size - Size of segment data in bytes
 * @returns Parsed object segment or null if invalid
 */
export function parseObjectSegment(view: DataView, offset: number, size: number): ObjectSegment | null {
  if (offset + size > view.byteLength || size < 7) return null

  const objectId = view.getUint16(offset)
  const version = view.getUint8(offset + 2)
  const flags = view.getUint8(offset + 3)
  const lastInSequence = (flags & 0x40) !== 0
  const firstInSequence = (flags & 0x80) !== 0

  let dataOffset = offset + 4
  let width = 0
  let height = 0

  if (firstInSequence) {
    if (offset + 11 > view.byteLength) return null
    const dataLen = view.getUint32(offset + 4) >>> 8 // 24-bit length
    width = view.getUint16(offset + 7)
    height = view.getUint16(offset + 9)
    dataOffset = offset + 11
  }

  const dataSize = size - (dataOffset - offset)
  const data = new Uint8Array(view.buffer, view.byteOffset + dataOffset, dataSize)

  return {
    objectId,
    version,
    lastInSequence,
    firstInSequence,
    width,
    height,
    data,
  }
}

/**
 * Parse a Presentation Composition Segment from binary data
 * @param view - DataView containing segment data
 * @param offset - Byte offset to start parsing
 * @param size - Size of segment data in bytes
 * @returns Parsed composition segment or null if invalid
 */
export function parseCompositionSegment(view: DataView, offset: number, size: number): CompositionSegment | null {
  if (offset + size > view.byteLength || size < 11) return null

  const width = view.getUint16(offset)
  const height = view.getUint16(offset + 2)
  const frameRate = view.getUint8(offset + 4)
  const compositionNumber = view.getUint16(offset + 5)
  const compositionState = view.getUint8(offset + 7)
  const paletteUpdateFlag = view.getUint8(offset + 8) !== 0
  const paletteId = view.getUint8(offset + 9)
  const objectCount = view.getUint8(offset + 10)

  const objects: CompositionObject[] = []
  let pos = offset + 11

  for (let i = 0; i < objectCount; i++) {
    if (pos + 8 > view.byteOffset + view.byteLength) break

    const objectId = view.getUint16(pos)
    const windowId = view.getUint8(pos + 2)
    const flags = view.getUint8(pos + 3)
    const x = view.getUint16(pos + 4)
    const y = view.getUint16(pos + 6)
    const forced = (flags & 0x40) !== 0
    const cropped = (flags & 0x80) !== 0

    pos += 8

    const obj: CompositionObject = {
      objectId,
      windowId,
      x,
      y,
      forced,
      cropped,
    }

    if (cropped) {
      if (pos + 8 > view.byteOffset + view.byteLength) break
      obj.cropX = view.getUint16(pos)
      obj.cropY = view.getUint16(pos + 2)
      obj.cropWidth = view.getUint16(pos + 4)
      obj.cropHeight = view.getUint16(pos + 6)
      pos += 8
    }

    objects.push(obj)
  }

  return {
    width,
    height,
    frameRate,
    compositionNumber,
    compositionState,
    paletteUpdateFlag,
    paletteId,
    objects,
  }
}

/**
 * Parse a Window Definition Segment from binary data
 * @param view - DataView containing segment data
 * @param offset - Byte offset to start parsing
 * @param size - Size of segment data in bytes
 * @returns Parsed window segment or null if invalid
 */
export function parseWindowSegment(view: DataView, offset: number, size: number): WindowSegment | null {
  if (offset + size > view.byteLength || size < 10) return null

  const count = view.getUint8(offset)
  if (count < 1) return null

  return {
    windowId: view.getUint8(offset + 1),
    x: view.getUint16(offset + 2),
    y: view.getUint16(offset + 4),
    width: view.getUint16(offset + 6),
    height: view.getUint16(offset + 8),
  }
}

/**
 * Decompress RLE-encoded image data to indexed bitmap
 * @param data - RLE-compressed image data
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Decompressed indexed bitmap data
 */
export function decompressRLE(data: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(width * height)
  let outPos = 0
  let inPos = 0

  while (inPos < data.length && outPos < output.length) {
    const byte = data[inPos++]

    if (byte === 0) {
      if (inPos >= data.length) break
      const flag = data[inPos++]

      if (flag === 0) {
        // End of line
        continue
      } else if ((flag & 0xC0) === 0x40) {
        // Run of one color
        const len = ((flag & 0x3F) << 8) | (data[inPos++] || 0)
        const color = data[inPos++] || 0
        for (let i = 0; i < len && outPos < output.length; i++) {
          output[outPos++] = color
        }
      } else if ((flag & 0xC0) === 0x80) {
        // Run of transparent pixels
        const len = ((flag & 0x3F) << 8) | (data[inPos++] || 0)
        outPos += len
      } else if ((flag & 0xC0) === 0xC0) {
        // Long run of one color
        const len = ((flag & 0x3F) << 8) | (data[inPos++] || 0)
        const color = data[inPos++] || 0
        for (let i = 0; i < len && outPos < output.length; i++) {
          output[outPos++] = color
        }
      } else {
        // Short run of transparent pixels
        outPos += flag & 0x3F
      }
    } else {
      // Literal pixel
      output[outPos++] = byte
    }
  }

  return output
}

/**
 * Convert YCbCr color to RGBA packed integer
 * @param y - Luma (brightness) component (0-255)
 * @param cb - Blue chroma component (0-255)
 * @param cr - Red chroma component (0-255)
 * @param alpha - Alpha (transparency) value (0-255)
 * @returns RGBA color as packed 32-bit integer
 */
export function ycbcrToRgba(y: number, cb: number, cr: number, alpha: number): number {
  const r = Math.max(0, Math.min(255, Math.round(y + 1.402 * (cr - 128))))
  const g = Math.max(0, Math.min(255, Math.round(y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128))))
  const b = Math.max(0, Math.min(255, Math.round(y + 1.772 * (cb - 128))))

  return (r << 24) | (g << 16) | (b << 8) | alpha
}

/**
 * Build RGBA palette array from palette entries
 * @param entries - Array of palette entries in YCbCr format
 * @returns Array of 256 RGBA colors as packed integers
 */
export function buildPalette(entries: PaletteEntry[]): number[] {
  const palette = new Array(256).fill(0)
  for (const entry of entries) {
    palette[entry.id] = ycbcrToRgba(entry.y, entry.cb, entry.cr, entry.alpha)
  }
  return palette
}

/**
 * Compress indexed bitmap to RLE-encoded image data
 * @param data - Indexed bitmap data
 * @param width - Image width in pixels
 * @returns RLE-compressed image data
 */
export function compressRLE(data: Uint8Array, width: number): Uint8Array {
  const output: number[] = []
  let x = 0

  for (let i = 0; i < data.length; ) {
    const color = data[i]
    let runLength = 1

    // Count run length
    while (i + runLength < data.length && data[i + runLength] === color && runLength < 16383) {
      runLength++
    }

    if (color === 0) {
      // Transparent run
      if (runLength < 64) {
        output.push(0, runLength)
      } else {
        output.push(0, 0x80 | (runLength >> 8), runLength & 0xFF)
      }
    } else {
      // Color run
      if (runLength === 1) {
        output.push(color)
      } else if (runLength < 64) {
        output.push(0, 0x40 | (runLength >> 8), runLength & 0xFF, color)
      } else {
        output.push(0, 0xC0 | (runLength >> 8), runLength & 0xFF, color)
      }
    }

    i += runLength
    x += runLength

    // End of line
    if (x >= width) {
      output.push(0, 0)
      x = 0
    }
  }

  return new Uint8Array(output)
}

/**
 * Convert RGBA packed integer to YCbCr palette entry
 * @param rgba - RGBA color as packed 32-bit integer
 * @returns Palette entry in YCbCr format
 */
export function rgbaToYcbcr(rgba: number): PaletteEntry {
  const r = (rgba >>> 24) & 0xFF
  const g = (rgba >>> 16) & 0xFF
  const b = (rgba >>> 8) & 0xFF
  const alpha = rgba & 0xFF

  const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  const cb = Math.round(128 - 0.168736 * r - 0.331264 * g + 0.5 * b)
  const cr = Math.round(128 + 0.5 * r - 0.418688 * g - 0.081312 * b)

  return {
    id: 0,
    y: Math.max(0, Math.min(255, y)),
    cb: Math.max(0, Math.min(255, cb)),
    cr: Math.max(0, Math.min(255, cr)),
    alpha,
  }
}
