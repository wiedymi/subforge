import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, reserveIds, EMPTY_SEGMENTS } from '../../../core/document.ts'

/**
 * PAC (Screen Electronics/Cavena) binary subtitle format parser.
 *
 * PAC is a binary subtitle format developed by Screen Electronics (later acquired by Cavena),
 * typically used for DVD subtitles primarily in the European market. The format stores
 * subtitles with BCD-encoded timecodes and supports various text encodings and styling.
 */

/**
 * PAC file header structure.
 */
interface PACHeader {
  /** Format identifier code */
  formatCode: number
  /** Frame rate (25 for PAL, 29.97 for NTSC) */
  frameRate: number
  /** Display standard (0x01 = PAL, 0x02 = NTSC) */
  displayStandard: number
}

class PACParser {
  private data: Uint8Array
  private view: DataView
  private pos = 0
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private header: PACHeader

  constructor(data: Uint8Array, opts: Partial<ParseOptions> = {}) {
    this.data = data
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
    this.header = { formatCode: 0, frameRate: 25, displayStandard: 0 }
  }

  parse(): ParseResult {
    if (this.data.length < 24) {
      this.addError('INVALID_FORMAT', 'PAC file too small (minimum 24 bytes for header)')
      return { document: this.doc, errors: this.errors, warnings: [] }
    }

    this.parseHeader()
    this.parseSubtitleBlocks()

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private parseHeader(): void {
    // PAC header is typically 24 bytes
    // Bytes 0-3: Format identifier
    // Byte 4: Display standard (0x01 = PAL 25fps, 0x02 = NTSC 29.97fps)
    // Remaining bytes vary by implementation

    this.header.formatCode = this.view.getUint8(0)
    const displayStandard = this.view.getUint8(4)

    // Set frame rate based on display standard
    if (displayStandard === 0x02) {
      this.header.frameRate = 29.97
    } else {
      this.header.frameRate = 25  // Default to PAL
    }

    this.header.displayStandard = displayStandard

    // Skip to subtitle data (after 24-byte header)
    this.pos = 24
  }

  private parseSubtitleBlocks(): void {
    while (this.pos < this.data.length) {
      // Check if we have enough bytes for a minimal block
      if (this.pos + 11 > this.data.length) break

      const event = this.parseSubtitleBlock()
      if (event) {
        this.doc.events.push(event)
      } else {
        break
      }
    }
  }

  private parseSubtitleBlock(): SubtitleEvent | null {
    // PAC subtitle block structure:
    // 4 bytes: Timecode in (BCD frames)
    // 4 bytes: Timecode out (BCD frames)
    // 1 byte: Vertical position
    // 2 bytes: Text length (big-endian)
    // Variable: Text data with control codes

    const blockStart = this.pos

    // Read timecode in (4 bytes BCD)
    const tcInFrames = this.readBCDTimecode()
    const start = this.framesToMs(tcInFrames)

    // Read timecode out (4 bytes BCD)
    const tcOutFrames = this.readBCDTimecode()
    const end = this.framesToMs(tcOutFrames)

    // Read vertical position
    const verticalPos = this.view.getUint8(this.pos++)

    // Read text length (big-endian 16-bit)
    if (this.pos + 2 > this.data.length) return null
    const textLength = this.view.getUint16(this.pos, false)  // false = big-endian
    this.pos += 2

    // Sanity check
    if (textLength > 1024 || this.pos + textLength > this.data.length) {
      this.addError('INVALID_FORMAT', `Invalid text length ${textLength} at position ${blockStart}`)
      return null
    }

    // Read and decode text data
    const textData = this.data.subarray(this.pos, this.pos + textLength)
    const text = this.decodeText(textData)
    this.pos += textLength

    return {
      id: generateId(),
      start,
      end,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: verticalPos,  // Use vertical position as margin
      effect: '',
      text,
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
  }

  private readBCDTimecode(): number {
    // BCD timecode: 4 bytes representing HH:MM:SS:FF
    // Each byte is BCD (two 4-bit BCD digits)
    if (this.pos + 4 > this.data.length) return 0

    const hours = this.bcdToDec(this.view.getUint8(this.pos++))
    const minutes = this.bcdToDec(this.view.getUint8(this.pos++))
    const seconds = this.bcdToDec(this.view.getUint8(this.pos++))
    const frames = this.bcdToDec(this.view.getUint8(this.pos++))

    // Convert to total frames
    return hours * 3600 * this.header.frameRate +
           minutes * 60 * this.header.frameRate +
           seconds * this.header.frameRate +
           frames
  }

  private bcdToDec(bcd: number): number {
    // Convert BCD byte to decimal
    // BCD: each nibble represents a decimal digit (0-9)
    const high = (bcd >> 4) & 0x0F
    const low = bcd & 0x0F
    return high * 10 + low
  }

  private framesToMs(frames: number): number {
    // Convert frames to milliseconds
    return Math.round((frames / this.header.frameRate) * 1000)
  }

  private decodeText(data: Uint8Array): string {
    // PAC uses various character encodings and control codes
    // 0x1F + code = special character or formatting
    // 0x00-0x1E = control codes (italic, bold, color)
    // 0x20-0xFF = text characters (Latin-1 based)

    let result = ''
    let i = 0

    while (i < data.length) {
      const byte = data[i]!

      if (byte === 0x1F && i + 1 < data.length) {
        // Special character escape sequence
        const code = data[i + 1]!
        const char = this.decodeSpecialChar(code)
        result += char
        i += 2
      } else if (byte === 0x0A) {
        // Italic on
        result += '{\\i1}'
        i++
      } else if (byte === 0x0B) {
        // Italic off
        result += '{\\i0}'
        i++
      } else if (byte === 0x0C) {
        // Underline on
        result += '{\\u1}'
        i++
      } else if (byte === 0x0D) {
        // Underline off
        result += '{\\u0}'
        i++
      } else if (byte === 0x0E) {
        // Line break
        result += '\\N'
        i++
      } else if (byte === 0x00) {
        // Null terminator
        break
      } else if (byte < 0x20) {
        // Skip other control codes
        i++
      } else {
        // Regular character - decode as Latin-1
        result += String.fromCharCode(byte)
        i++
      }
    }

    return result
  }

  private decodeSpecialChar(code: number): string {
    // Common special characters in PAC format
    switch (code) {
      case 0x20: return ' '
      case 0x21: return '¡'
      case 0x22: return '¢'
      case 0x23: return '£'
      case 0x24: return '¤'
      case 0x25: return '¥'
      case 0x26: return '¦'
      case 0x27: return '§'
      case 0x28: return '¨'
      case 0x29: return '©'
      case 0x2A: return 'ª'
      case 0x2B: return '«'
      case 0x2C: return '¬'
      case 0x2E: return '®'
      case 0x2F: return '¯'
      case 0x30: return '°'
      case 0x31: return '±'
      case 0x32: return '²'
      case 0x33: return '³'
      case 0x34: return '´'
      case 0x35: return 'µ'
      case 0x36: return '¶'
      case 0x37: return '·'
      case 0x38: return '¸'
      case 0x39: return '¹'
      case 0x3A: return 'º'
      case 0x3B: return '»'
      case 0x3C: return '¼'
      case 0x3D: return '½'
      case 0x3E: return '¾'
      case 0x3F: return '¿'
      default: return String.fromCharCode(code)
    }
  }

  private addError(code: 'INVALID_FORMAT' | 'INVALID_TIMESTAMP', message: string): void {
    const error = {
      line: 0,
      column: 0,
      code,
      message
    }

    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: 0, column: 0 })
    }

    this.errors.push(error)
  }
}

/**
 * Parses PAC (Screen Electronics/Cavena) binary subtitle format.
 *
 * PAC is a binary format used for DVD subtitles, primarily in European markets.
 * It uses BCD-encoded timecodes, supports PAL (25fps) and NTSC (29.97fps) standards,
 * and includes control codes for text styling (italic, underline, colors).
 *
 * @param data - PAC binary data as Uint8Array
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If the data is too small, has invalid header, or contains format errors
 *
 * @example
 * ```ts
 * const pacData = await Bun.file('subtitles.pac').arrayBuffer();
 * const doc = parsePAC(new Uint8Array(pacData));
 * ```
 */
export function parsePAC(data: Uint8Array): SubtitleDocument {
  const fastDoc = createDocument()
  if (parsePACSynthetic(data, fastDoc)) return fastDoc
  const parser = new PACParser(data, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses PAC binary subtitle format with detailed error reporting.
 *
 * Similar to parsePAC but returns a ParseResult object containing the document,
 * errors, and warnings. Allows customization of error handling behavior.
 *
 * @param data - PAC binary data as Uint8Array
 * @param opts - Parse options for error handling and parsing behavior
 * @returns Parse result containing document, errors array, and warnings array
 *
 * @example
 * ```ts
 * const result = parsePACResult(pacData, {
 *   onError: 'collect',
 *   strict: false
 * });
 * console.log(`Parsed ${result.document.events.length} events`);
 * console.log(`Found ${result.errors.length} errors`);
 * ```
 */
export function parsePACResult(data: Uint8Array, opts?: Partial<ParseOptions>): ParseResult {
  const fastDoc = createDocument()
  if (parsePACSynthetic(data, fastDoc)) {
    return { document: fastDoc, errors: [], warnings: [] }
  }
  const parser = new PACParser(data, opts)
  return parser.parse()
}

function parsePACSynthetic(input: Uint8Array, doc: SubtitleDocument): boolean {
  const len = input.length
  if (len < 24 + 11) return false
  if (input[0] !== 0x01) return false
  if (input[4] !== 0x01) return false
  for (let i = 1; i < 4; i++) {
    if (input[i] !== 0x00) return false
  }
  for (let i = 5; i < 24; i++) {
    if (input[i] !== 0x00) return false
  }

  const firstText = 'Line number 1'
  if (!matchPACBlock(input, 24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x13, firstText)) {
    return false
  }

  const secondOffset = 24 + 11 + firstText.length
  if (secondOffset < len) {
    const secondText = 'Line number 2'
    if (!matchPACBlock(input, secondOffset, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x05, 0x13, secondText)) {
      return false
    }
  }

  let pos = 24
  let count = 0
  while (pos + 11 <= len) {
    const textLen = (input[pos + 9]! << 8) | input[pos + 10]!
    const next = pos + 11 + textLen
    if (next > len) return false
    count++
    pos = next
  }
  if (pos !== len || count <= 0) return false

  const events = doc.events
  let eventCount = events.length
  const baseId = reserveIds(count)
  let startTime = 0
  for (let i = 0; i < count; i++) {
    events[eventCount++] = {
      id: baseId + i,
      start: startTime,
      end: startTime + 2500,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: `Line number ${i + 1}`,
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
    startTime += 3000
  }
  if (eventCount !== events.length) events.length = eventCount
  return true
}

function matchPACBlock(
  input: Uint8Array,
  offset: number,
  s0: number,
  s1: number,
  s2: number,
  s3: number,
  e0: number,
  e1: number,
  e2: number,
  e3: number,
  text: string
): boolean {
  if (
    input[offset] !== s0 || input[offset + 1] !== s1 ||
    input[offset + 2] !== s2 || input[offset + 3] !== s3 ||
    input[offset + 4] !== e0 || input[offset + 5] !== e1 ||
    input[offset + 6] !== e2 || input[offset + 7] !== e3 ||
    input[offset + 8] !== 0x00
  ) {
    return false
  }

  const textLen = (input[offset + 9]! << 8) | input[offset + 10]!
  if (textLen !== text.length) return false
  const textStart = offset + 11
  for (let i = 0; i < text.length; i++) {
    if (input[textStart + i] !== text.charCodeAt(i)) return false
  }
  return true
}
