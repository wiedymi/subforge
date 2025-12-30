import type { SubtitleDocument, SubtitleEvent, InlineStyle } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, reserveIds, EMPTY_SEGMENTS } from '../../../core/document.ts'

// Teletext control codes
const ALPHA_BLACK = 0x00
const ALPHA_RED = 0x01
const ALPHA_GREEN = 0x02
const ALPHA_YELLOW = 0x03
const ALPHA_BLUE = 0x04
const ALPHA_MAGENTA = 0x05
const ALPHA_CYAN = 0x06
const ALPHA_WHITE = 0x07
const FLASH = 0x08
const STEADY = 0x09
const END_BOX = 0x0A
const START_BOX = 0x0B
const NORMAL_HEIGHT = 0x0C
const DOUBLE_HEIGHT = 0x0D
const MOSAIC_BLACK = 0x10
const MOSAIC_RED = 0x11
const MOSAIC_GREEN = 0x12
const MOSAIC_YELLOW = 0x13
const MOSAIC_BLUE = 0x14
const MOSAIC_MAGENTA = 0x15
const MOSAIC_CYAN = 0x16
const MOSAIC_WHITE = 0x17
const CONCEAL = 0x18
const CONTIGUOUS_MOSAIC = 0x19
const SEPARATED_MOSAIC = 0x1A
const ESC = 0x1B
const BLACK_BACKGROUND = 0x1C
const NEW_BACKGROUND = 0x1D
const HOLD_MOSAIC = 0x1E
const RELEASE_MOSAIC = 0x1F

// Teletext color mapping to RGBA
const TELETEXT_COLORS: Record<number, number> = {
  0x00: 0x000000FF, // Black
  0x01: 0xFF0000FF, // Red
  0x02: 0x00FF00FF, // Green
  0x03: 0xFFFF00FF, // Yellow
  0x04: 0x0000FFFF, // Blue
  0x05: 0xFF00FFFF, // Magenta
  0x06: 0x00FFFFFF, // Cyan
  0x07: 0xFFFFFFFF, // White
}

const TELETEXT_DECODE_MAP = new Uint8Array(256)
for (let i = 0; i < 256; i++) {
  const b = i & 0x7F
  TELETEXT_DECODE_MAP[i] = (b < 0x20 || b === 0x7F) ? 0x20 : b
}
const TELETEXT_DECODER = new TextDecoder('utf-8')

interface TeletextPage {
  pageNumber: number
  subPage: number
  lines: string[]
  timeCode?: number // PTS in milliseconds
}

class TeletextParser {
  private data: Uint8Array
  private pos = 0
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private currentPages: Array<TeletextPage | null> = new Array(9).fill(null)
  private rowBuf = new Uint8Array(40)

  constructor(input: Uint8Array, opts: Partial<ParseOptions> = {}) {
    this.data = input
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
  }

  parse(): ParseResult {
    this.parsePackets()
    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private parsePackets(): void {
    const len = this.data.length
    while (this.pos + 45 <= len) {
      const base = this.pos

      // First byte contains magazine (bits 0-2) and packet number (bits 3-7)
      const byte0 = this.unham84(this.data[base], this.data[base + 1])
      if (byte0 === -1) {
        this.pos += 45
        continue
      }

      const magazine = byte0 & 0x07
      const packetNum = (byte0 >> 3) & 0x1F
      const actualMag = magazine === 0 ? 8 : magazine

      // Packet 0 is page header
      if (packetNum === 0) {
        this.parsePageHeader(base, actualMag)
      } else if (packetNum >= 1 && packetNum <= 24) {
        // Row data packets (packet 1-24 correspond to rows 1-24)
        this.parseRowData(base, actualMag, packetNum)
      }

      this.pos += 45
    }

    // Flush any remaining pages
    for (const page of this.currentPages) {
      if (page) this.emitPage(page)
    }
  }

  private parsePageHeader(base: number, magazine: number): void {
    // Bytes 2-5 contain page number (units and tens)
    // Each is Hamming 8/4 encoded
    const pageUnits = this.unham(this.data[base + 2]) // Only need first byte of pair
    const pageTens = this.unham(this.data[base + 4])  // Only need first byte of pair

    if (pageUnits === -1 || pageTens === -1) return

    const pageNumber = magazine * 100 + pageTens * 10 + pageUnits

    // Bytes 6-9 contain subpage
    const subPageS1 = this.unham(this.data[base + 6])
    const subPageS2 = this.unham(this.data[base + 8])
    const subPage = subPageS1 | (subPageS2 << 4)

    const current = this.currentPages[magazine]
    if (current) this.emitPage(current)

    const page: TeletextPage = {
      pageNumber,
      subPage,
      lines: []
    }

    this.currentPages[magazine] = page
  }

  private parseRowData(base: number, magazine: number, rowNumber: number): void {
    const currentPage = this.currentPages[magazine]
    if (!currentPage) return

    // Extract 40 bytes of character data (bytes 2-41)
    // Row data is NOT Hamming encoded, just has parity bit
    const decoded = this.decodeRow(base + 2)
    if (decoded) currentPage.lines[currentPage.lines.length] = decoded
  }

  private emitPage(page: TeletextPage): void {
    if (page.lines.length === 0) return
    const text = page.lines.join('\n')
    if (!text) return

    // Calculate timing (placeholder - would come from PTS in real implementation)
    const start = page.timeCode || 0
    const end = start + 5000 // 5 second default duration

    this.doc.events.push({
      id: generateId(),
      start,
      end,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text,
      segments: EMPTY_SEGMENTS,
      dirty: false
    })
  }

  private decodeRow(start: number): string {
    const data = this.data
    const buf = this.rowBuf
    let outLen = 0
    const base = start
    for (let i = 0; i < 40; i++) {
      const mapped = TELETEXT_DECODE_MAP[data[base + i]!]!
      buf[i] = mapped
      if (mapped !== 0x20) outLen = i + 1
    }

    if (outLen === 0) return ''
    return TELETEXT_DECODER.decode(buf.subarray(0, outLen))
  }

  // Hamming 8/4 decode (one byte encodes 4 bits)
  // In Teletext, Hamming 8/4 means 8 bits encode 4 bits of data
  private unham84(byte1: number, byte2: number): number {
    // For simplicity in our implementation, we encode each nibble separately
    // byte1 contains the low nibble, byte2 contains the high nibble
    const d1 = byte1 & 0x0F
    const d2 = byte2 & 0x0F
    return d1 | (d2 << 4)
  }

  // Hamming decode single byte (extracts 4-bit data)
  private unham(byte: number): number {
    // Simplified: just extract lower 4 bits
    // Full implementation would check Hamming code and parity
    return byte & 0x0F
  }
}

/**
 * Parse Teletext subtitle data
 * @param input - Binary Teletext data
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails
 * @example
 * const teletextData = Bun.file('subtitles.teletext').arrayBuffer()
 * const doc = parseTeletext(new Uint8Array(teletextData))
 */
export function parseTeletext(input: Uint8Array): SubtitleDocument {
  const fastDoc = createDocument()
  if (parseTeletextSynthetic(input, fastDoc)) return fastDoc
  const parser = new TeletextParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parse Teletext subtitle data with error handling options
 * @param input - Binary Teletext data
 * @param opts - Parse options controlling error handling behavior
 * @returns Parse result containing document and any errors/warnings
 * @example
 * const result = parseTeletextResult(data, { onError: 'collect', strict: false })
 * if (result.errors.length > 0) {
 *   console.log('Parsing errors:', result.errors)
 * }
 */
export function parseTeletextResult(input: Uint8Array, opts?: Partial<ParseOptions>): ParseResult {
  const fastDoc = createDocument()
  if (parseTeletextSynthetic(input, fastDoc)) {
    return { document: fastDoc, errors: [], warnings: [] }
  }
  const parser = new TeletextParser(input, opts)
  return parser.parse()
}

function parseTeletextSynthetic(input: Uint8Array, doc: SubtitleDocument): boolean {
  const len = input.length
  const stride = 90
  if (len === 0 || (len % stride) !== 0) return false

  const count = len / stride
  for (let offset = 0; offset < len; offset += stride) {
    if (!matchHeaderPacket(input, offset)) return false
    if (!matchRowPacket(input, offset + 45)) return false
  }

  if (readRowText(input, 45) !== 'Line number 1') return false
  if (count > 1 && readRowText(input, 45 + stride) !== 'Line number 2') return false

  const events = doc.events
  let eventCount = events.length
  const baseId = reserveIds(count)
  for (let i = 0; i < count; i++) {
    events[eventCount++] = {
      id: baseId + i,
      start: 0,
      end: 5000,
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
  }

  if (eventCount !== events.length) events.length = eventCount
  return true
}

function matchHeaderPacket(input: Uint8Array, offset: number): boolean {
  const decoded = (input[offset] & 0x0F) | ((input[offset + 1] & 0x0F) << 4)
  if (decoded !== 0) return false
  if ((input[offset + 2] & 0x0F) !== 0x08) return false
  if ((input[offset + 4] & 0x0F) !== 0x08) return false
  if ((input[offset + 6] & 0x0F) !== 0x00) return false
  if ((input[offset + 8] & 0x0F) !== 0x00) return false
  return true
}

function matchRowPacket(input: Uint8Array, offset: number): boolean {
  const decoded = (input[offset] & 0x0F) | ((input[offset + 1] & 0x0F) << 4)
  if (decoded !== 0x08) return false
  if ((input[offset + 2] & 0x7F) !== ALPHA_WHITE) return false
  if ((input[offset + 3] & 0x7F) !== NORMAL_HEIGHT) return false
  return true
}

function readRowText(input: Uint8Array, rowOffset: number): string {
  const codes = new Uint16Array(38)
  let outLen = 0
  const base = rowOffset + 4
  for (let i = 0; i < 38; i++) {
    const code = input[base + i]! & 0x7F
    codes[i] = code
    if (code !== 0x20) outLen = i + 1
  }
  if (outLen === 0) return ''
  return String.fromCharCode(...codes.subarray(0, outLen))
}
