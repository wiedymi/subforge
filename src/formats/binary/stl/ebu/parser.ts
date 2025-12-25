import type { SubtitleDocument, SubtitleEvent } from '../../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError } from '../../../../core/errors.ts'
import { SubforgeError } from '../../../../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../../core/document.ts'

const GSI_BLOCK_SIZE = 1024
const TTI_BLOCK_SIZE = 128

/**
 * EBU-STL General Subtitle Information block
 * Contains metadata about the subtitle file
 */
interface GSIBlock {
  /** Code Page Number (3 bytes) */
  cpn: string
  /** Disk Format Code (8 bytes) */
  dfc: string
  /** Original Programme Title (32 bytes) */
  opt: string
  /** Total Number of TTI blocks */
  tnb: number
  /** Character Code Table (encoding) */
  cct: number
  /** Frame rate (25 or 30 fps) */
  frameRate: number
}

class EBUSTLParser {
  private data: Uint8Array
  private view: DataView
  private pos = 0
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private gsi: GSIBlock | null = null
  private decoder: TextDecoder

  constructor(input: Uint8Array, opts: Partial<ParseOptions> = {}) {
    this.data = input
    this.view = new DataView(input.buffer, input.byteOffset, input.byteLength)
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
    this.decoder = new TextDecoder('iso-8859-1')
  }

  parse(): ParseResult {
    if (this.data.length < GSI_BLOCK_SIZE) {
      this.addError('INVALID_FORMAT', 'File too small to be valid EBU-STL')
      return { document: this.doc, errors: this.errors, warnings: [] }
    }

    this.gsi = this.parseGSI()
    if (!this.gsi) {
      return { document: this.doc, errors: this.errors, warnings: [] }
    }

    // Set decoder based on CCT
    this.decoder = this.getDecoder(this.gsi.cct)

    // Set document metadata
    if (this.gsi.opt) {
      this.doc.info.title = this.gsi.opt
    }

    this.pos = GSI_BLOCK_SIZE

    // Parse TTI blocks
    const subtitleMap = new Map<number, SubtitleEvent>()

    for (let i = 0; i < this.gsi.tnb && this.pos + TTI_BLOCK_SIZE <= this.data.length; i++) {
      const event = this.parseTTI(subtitleMap)
      if (event) {
        this.doc.events.push(event)
      }
    }

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private parseGSI(): GSIBlock | null {
    try {
      // CPN (0-2)
      const cpn = this.readString(0, 3)

      // DFC (3-10)
      const dfc = this.readString(3, 8)

      // OPT (16-47) - Original Programme Title
      const opt = this.readString(16, 32).trim()

      // TNB (238-242) - Total Number of TTI blocks (5 bytes, ASCII decimal)
      const tnbStr = this.readString(238, 5)
      const tnb = parseInt(tnbStr, 10)

      if (isNaN(tnb) || tnb < 0) {
        this.addError('INVALID_FORMAT', 'Invalid TNB value in GSI block')
        return null
      }

      // CCT (309) - Character Code Table
      const cct = this.data[309]

      // DFC contains frame rate info: bytes 5-6 are frame rate
      const frameRateCode = this.readString(8, 2)
      let frameRate = 25.0
      if (frameRateCode === '25') frameRate = 25.0
      else if (frameRateCode === '30') frameRate = 30.0

      return { cpn, dfc, opt, tnb, cct, frameRate }
    } catch (e) {
      this.addError('INVALID_FORMAT', 'Failed to parse GSI block')
      return null
    }
  }

  private parseTTI(subtitleMap: Map<number, SubtitleEvent>): SubtitleEvent | null {
    const blockStart = this.pos

    // SGN (0) - Subtitle Group Number
    const sgn = this.data[blockStart]

    // SN (1-2) - Subtitle Number (big-endian)
    const sn = (this.data[blockStart + 1] << 8) | this.data[blockStart + 2]

    // EBN (3) - Extension Block Number
    const ebn = this.data[blockStart + 3]

    // CS (4) - Cumulative Status
    const cs = this.data[blockStart + 4]

    // TCI (5-8) - Time Code In (BCD format: HH MM SS FF)
    const tci = this.parseBCDTimecode(blockStart + 5)

    // TCO (9-12) - Time Code Out (BCD format: HH MM SS FF)
    const tco = this.parseBCDTimecode(blockStart + 9)

    // VP (13) - Vertical Position
    const vp = this.data[blockStart + 13]

    // JC (14) - Justification Code
    const jc = this.data[blockStart + 14]

    // CF (15) - Comment Flag
    const cf = this.data[blockStart + 15]

    // TF (16-127) - Text Field (112 bytes)
    const tf = this.data.slice(blockStart + 16, blockStart + 128)

    this.pos += TTI_BLOCK_SIZE

    // Skip comment blocks
    if (cf !== 0) {
      return null
    }

    // Handle extension blocks (EBN > 0 means continuation)
    if (ebn === 0xff) {
      // This is a user data block, skip
      return null
    }

    const text = this.decodeTextField(tf)

    if (ebn > 0) {
      // This is an extension block - append to existing subtitle
      const existing = subtitleMap.get(sn)
      if (existing) {
        existing.text += text
        return null
      }
    }

    // Create new subtitle event
    const event: SubtitleEvent = {
      id: generateId(),
      start: tci,
      end: tco,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: text,
      segments: EMPTY_SEGMENTS,
      dirty: false
    }

    subtitleMap.set(sn, event)
    return event
  }

  private parseBCDTimecode(offset: number): number {
    if (!this.gsi) return 0

    // Read BCD values: HH MM SS FF
    const hh = this.parseBCD(this.data[offset])
    const mm = this.parseBCD(this.data[offset + 1])
    const ss = this.parseBCD(this.data[offset + 2])
    const ff = this.parseBCD(this.data[offset + 3])

    // Convert to milliseconds
    const frameMs = (1000 / this.gsi.frameRate)
    return (hh * 3600000) + (mm * 60000) + (ss * 1000) + Math.floor(ff * frameMs)
  }

  private parseBCD(byte: number): number {
    const high = (byte >> 4) & 0x0f
    const low = byte & 0x0f
    return high * 10 + low
  }

  private decodeTextField(tf: Uint8Array): string {
    // Find end marker (0x8f) or actual end of data
    let end = tf.length
    for (let i = 0; i < tf.length; i++) {
      if (tf[i] === 0x8f) {
        end = i
        break
      }
    }

    // Decode the text field
    const textData = tf.slice(0, end)
    let text = ''
    let i = 0

    while (i < textData.length) {
      const byte = textData[i]

      // Control codes
      if (byte === 0x8a) {
        // Line break
        text += '\n'
        i++
      } else if (byte === 0x80 || byte === 0x81 || byte === 0x82 || byte === 0x83 ||
                 byte === 0x84 || byte === 0x85 || byte === 0x86 || byte === 0x87) {
        // Italic control codes - skip for now
        i++
      } else if (byte === 0x00 || byte === 0x8f) {
        // Padding or end marker
        break
      } else {
        // Regular character
        text += this.decoder.decode(new Uint8Array([byte]))
        i++
      }
    }

    return text.trim()
  }

  private getDecoder(cct: number): TextDecoder {
    switch (cct) {
      case 0x00: return new TextDecoder('iso-8859-1') // Latin
      case 0x01: return new TextDecoder('iso-8859-5') // Latin/Cyrillic
      case 0x02: return new TextDecoder('iso-8859-6') // Latin/Arabic
      case 0x03: return new TextDecoder('iso-8859-7') // Latin/Greek
      case 0x04: return new TextDecoder('iso-8859-8') // Latin/Hebrew
      default: return new TextDecoder('iso-8859-1')
    }
  }

  private readString(offset: number, length: number): string {
    const bytes = this.data.slice(offset, offset + length)
    return this.decoder.decode(bytes)
  }

  private addError(code: 'INVALID_FORMAT' | 'INVALID_TIMESTAMP', message: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: 0, column: 0 })
    }
    this.errors.push({ line: 0, column: 0, code, message })
  }
}

/**
 * Parses EBU-STL (European Broadcasting Union Subtitling Data Exchange Format) binary file
 *
 * EBU-STL is a binary subtitle format widely used in European broadcasting.
 * It consists of a General Subtitle Information (GSI) block followed by
 * Text Timing Information (TTI) blocks containing the actual subtitles.
 *
 * @param input - Binary file data as Uint8Array
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails or file is invalid
 *
 * @example
 * ```ts
 * const fileData = await Bun.file('subtitles.stl').arrayBuffer()
 * const doc = parseEBUSTL(new Uint8Array(fileData))
 * ```
 */
export function parseEBUSTL(input: Uint8Array): SubtitleDocument {
  const parser = new EBUSTLParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses EBU-STL format with error collection
 *
 * @param input - Binary file data as Uint8Array
 * @param opts - Parsing options to control error handling
 * @returns Parse result containing document, errors, and warnings
 *
 * @example
 * ```ts
 * const result = parseEBUSTLResult(data, { onError: 'collect' })
 * console.log(`Found ${result.errors.length} errors`)
 * ```
 */
export function parseEBUSTLResult(input: Uint8Array, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new EBUSTLParser(input, opts)
  return parser.parse()
}
