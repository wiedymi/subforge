import type { SubtitleDocument, SubtitleEvent, ImageEffect } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId } from '../../../core/document.ts'

const SYNC_BYTE = 0x0F
const END_OF_DISPLAY_SET = 0x80

// Segment types
const PAGE_COMPOSITION = 0x10
const REGION_COMPOSITION = 0x11
const CLUT_DEFINITION = 0x12
const OBJECT_DATA = 0x13

interface DVBSegment {
  type: number
  pageId: number
  length: number
  data: Uint8Array
  offset: number
}

interface DVBPage {
  pageId: number
  timeout: number
  version: number
  state: number
  regions: DVBRegion[]
}

interface DVBRegion {
  id: number
  x: number
  y: number
  width: number
  height: number
  fillFlag: boolean
  depth: number
  clutId: number
  objects: DVBObject[]
}

interface DVBObject {
  id: number
  type: number
  x: number
  y: number
  width: number
  height: number
  data: Uint8Array
}

interface DVBCLUT {
  id: number
  version: number
  colors: number[] // RGBA values
}

class DVBParser {
  private data: Uint8Array
  private view: DataView
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private clutMap = new Map<number, DVBCLUT>()
  private currentDisplaySet: SubtitleEvent | null = null
  private displaySetStart = 0
  private displaySetEnd = 0

  constructor(input: Uint8Array, opts: Partial<ParseOptions> = {}) {
    this.data = input
    this.view = new DataView(input.buffer, input.byteOffset, input.byteLength)
    this.len = input.length
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
  }

  parse(): ParseResult {
    while (this.pos < this.len) {
      const segment = this.readSegment()
      if (!segment) break

      this.processSegment(segment)
    }

    // Finalize last display set if any
    if (this.currentDisplaySet) {
      this.doc.events.push(this.currentDisplaySet)
    }

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private readSegment(): DVBSegment | null {
    if (this.pos + 6 > this.len) return null

    const syncByte = this.data[this.pos]
    if (syncByte !== SYNC_BYTE) {
      this.addError('PARSE_ERROR', `Invalid sync byte: 0x${syncByte.toString(16)}`)
      return null
    }

    const type = this.data[this.pos + 1]
    const pageId = this.view.getUint16(this.pos + 2, false) // big-endian
    const length = this.view.getUint16(this.pos + 4, false)

    const offset = this.pos + 6
    if (offset + length > this.len) {
      this.addError('PARSE_ERROR', `Segment length exceeds data bounds`)
      return null
    }

    const segmentData = this.data.slice(offset, offset + length)
    this.pos = offset + length

    return { type, pageId, length, data: segmentData, offset }
  }

  private processSegment(segment: DVBSegment): void {
    switch (segment.type) {
      case PAGE_COMPOSITION:
        this.processPageComposition(segment)
        break
      case REGION_COMPOSITION:
        // Region info parsed but not directly used
        break
      case CLUT_DEFINITION:
        this.processCLUT(segment)
        break
      case OBJECT_DATA:
        this.processObjectData(segment)
        break
      case END_OF_DISPLAY_SET:
        this.finalizeDisplaySet()
        break
    }
  }

  private processPageComposition(segment: DVBSegment): void {
    if (segment.data.length < 2) return

    const view = new DataView(segment.data.buffer, segment.data.byteOffset, segment.data.byteLength)
    const timeout = view.getUint8(0)
    const versionState = view.getUint8(1)

    const pageTimeout = timeout === 0 ? 0 : timeout * 1000 // Convert to ms

    // Start new display set
    this.displaySetStart = this.displaySetEnd
    this.displaySetEnd = this.displaySetStart + pageTimeout

    if (this.currentDisplaySet) {
      this.doc.events.push(this.currentDisplaySet)
    }

    this.currentDisplaySet = {
      id: generateId(),
      start: this.displaySetStart,
      end: this.displaySetEnd,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: '',
      segments: [],
      dirty: false
    }
  }

  private processCLUT(segment: DVBSegment): void {
    if (segment.data.length < 2) return

    const view = new DataView(segment.data.buffer, segment.data.byteOffset, segment.data.byteLength)
    const clutId = view.getUint8(0)
    const clutVersion = view.getUint8(1)

    const colors: number[] = []
    let offset = 2

    while (offset + 6 <= segment.data.length) {
      const entryId = view.getUint8(offset)
      const entryFlags = view.getUint8(offset + 1)

      const fullRange = (entryFlags & 0x01) !== 0

      if (fullRange) {
        // Full range entry: Y Cr Cb T (4 bytes)
        if (offset + 6 > segment.data.length) break

        const y = view.getUint8(offset + 2)
        const cr = view.getUint8(offset + 3)
        const cb = view.getUint8(offset + 4)
        const t = view.getUint8(offset + 5)

        const rgba = this.ycrcbToRgba(y, cr, cb, t)
        colors[entryId] = rgba

        offset += 6
      } else {
        // Reduced range: just Y T (2 bytes)
        if (offset + 4 > segment.data.length) break

        const y = view.getUint8(offset + 2)
        const t = view.getUint8(offset + 3)

        // Use grayscale for reduced range
        const rgba = this.ycrcbToRgba(y, 128, 128, t)
        colors[entryId] = rgba

        offset += 4
      }
    }

    this.clutMap.set(clutId, { id: clutId, version: clutVersion, colors })
  }

  private processObjectData(segment: DVBSegment): void {
    if (segment.data.length < 7 || !this.currentDisplaySet) return

    const view = new DataView(segment.data.buffer, segment.data.byteOffset, segment.data.byteLength)
    const objectId = view.getUint16(0, false)
    const objectVersionFlag = view.getUint8(2)
    const objectCodingMethod = (objectVersionFlag >> 2) & 0x03

    if (objectCodingMethod !== 0) {
      // Only pixel-data sub-blocks are supported (coding method 0)
      return
    }

    const nonModifyingFlag = (objectVersionFlag & 0x02) !== 0
    const topFieldLength = view.getUint16(3, false)
    const bottomFieldLength = view.getUint16(5, false)

    let offset = 7
    const pixelData: number[] = []
    const endOffset = offset + topFieldLength + bottomFieldLength

    // Parse pixel data with RLE
    while (offset < endOffset && offset < segment.data.length) {
      const result = this.decodeRLEPixel(segment.data, offset)
      if (!result) break

      pixelData.push(...result.pixels)
      offset = result.nextOffset
    }

    // Create ImageEffect for this object
    if (pixelData.length > 0) {
      const imageData = new Uint8Array(pixelData)

      const imageEffect: ImageEffect = {
        type: 'image',
        params: {
          format: 'indexed',
          width: 0, // Width/height determined from region
          height: 0,
          data: imageData,
          palette: this.clutMap.get(0)?.colors || []
        }
      }

      this.currentDisplaySet.segments.push({
        text: '',
        style: null,
        effects: [imageEffect]
      })
    }
  }

  private decodeRLEPixel(data: Uint8Array, offset: number): { pixels: number[], nextOffset: number } | null {
    if (offset >= data.length) return null

    const pixels: number[] = []
    const byte1 = data[offset]

    if (byte1 !== 0) {
      // Single pixel
      pixels.push(byte1)
      return { pixels, nextOffset: offset + 1 }
    }

    // RLE encoded
    if (offset + 1 >= data.length) return null
    const byte2 = data[offset + 1]

    if (byte2 === 0) {
      // End of line
      return { pixels, nextOffset: offset + 2 }
    }

    const switch1 = (byte2 & 0xC0) >> 6

    if (switch1 === 0) {
      // Run of color 0
      const runLength = byte2 & 0x3F
      if (runLength === 0) return { pixels, nextOffset: offset + 2 }

      for (let i = 0; i < runLength; i++) {
        pixels.push(0)
      }
      return { pixels, nextOffset: offset + 2 }
    } else if (switch1 === 1) {
      // Short run
      const runLength = byte2 & 0x3F
      if (offset + 2 >= data.length) return null
      const color = data[offset + 2]

      for (let i = 0; i < runLength; i++) {
        pixels.push(color)
      }
      return { pixels, nextOffset: offset + 3 }
    } else if (switch1 === 2) {
      // Long run of color 0
      if (offset + 2 >= data.length) return null
      const runLength = ((byte2 & 0x3F) << 8) | data[offset + 2]

      for (let i = 0; i < runLength; i++) {
        pixels.push(0)
      }
      return { pixels, nextOffset: offset + 3 }
    } else {
      // Long run
      if (offset + 3 >= data.length) return null
      const runLength = ((byte2 & 0x3F) << 8) | data[offset + 2]
      const color = data[offset + 3]

      for (let i = 0; i < runLength; i++) {
        pixels.push(color)
      }
      return { pixels, nextOffset: offset + 4 }
    }
  }

  private finalizeDisplaySet(): void {
    if (this.currentDisplaySet) {
      this.doc.events.push(this.currentDisplaySet)
      this.currentDisplaySet = null
    }
  }

  private ycrcbToRgba(y: number, cr: number, cb: number, t: number): number {
    // ITU-R BT.601 conversion
    const r = Math.max(0, Math.min(255, Math.round(y + 1.402 * (cr - 128))))
    const g = Math.max(0, Math.min(255, Math.round(y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128))))
    const b = Math.max(0, Math.min(255, Math.round(y + 1.772 * (cb - 128))))
    const a = 255 - t // T is transparency, convert to alpha

    return (r << 24) | (g << 16) | (b << 8) | a
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: 0, column: this.pos })
    }
    this.errors.push({ line: 0, column: this.pos, code, message, raw })
  }
}

/**
 * Parse DVB (Digital Video Broadcasting) subtitle data
 * @param input - Binary DVB subtitle data
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails
 * @example
 * const dvbData = Bun.file('subtitles.dvb').arrayBuffer()
 * const doc = parseDVB(new Uint8Array(dvbData))
 */
export function parseDVB(input: Uint8Array): SubtitleDocument {
  const parser = new DVBParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parse DVB subtitle data with error handling options
 * @param input - Binary DVB subtitle data
 * @param opts - Parse options controlling error handling behavior
 * @returns Parse result containing document and any errors/warnings
 * @example
 * const result = parseDVBResult(data, { onError: 'collect', strict: false })
 * if (result.errors.length > 0) {
 *   console.log('Parsing errors:', result.errors)
 * }
 */
export function parseDVBResult(input: Uint8Array, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new DVBParser(input, opts)
  return parser.parse()
}
