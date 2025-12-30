import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../core/document.ts'
import { videoStandardToFps } from './time.ts'

interface CAPHeader {
  captionMax?: string
  videoStandard?: string
  characterSet?: string
  font?: string
  color?: string
  [key: string]: string | undefined
}

class CAPParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1
  private header: CAPHeader = {}
  private fps = 25 // Default to PAL

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
    // Handle BOM
    let start = 0
    if (input.charCodeAt(0) === 0xFEFF) start = 1

    this.src = input
    this.pos = start
    this.len = input.length
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
  }

  parse(): ParseResult {
    // Parse header lines
    this.parseHeader()

    // Parse subtitles
    while (this.pos < this.len) {
      this.skipEmptyLines()
      if (this.pos >= this.len) break

      const event = this.parseSubtitle()
      if (event) {
        this.doc.events[this.doc.events.length] = event
      }
    }

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private parseHeader(): void {
    while (this.pos < this.len) {
      // Check if line starts with $
      if (this.src.charCodeAt(this.pos) !== 36) break // $ = 36

      // Read header line
      const lineStart = this.pos
      let nlPos = this.src.indexOf('\n', lineStart)
      if (nlPos === -1) nlPos = this.len

      let lineEnd = nlPos
      if (lineEnd > lineStart && this.src.charCodeAt(lineEnd - 1) === 13) lineEnd--

      const line = this.src.substring(lineStart, lineEnd)
      this.pos = nlPos < this.len ? nlPos + 1 : this.len
      this.lineNum++

      // Parse header key-value
      const spacePos = line.indexOf(' ')
      if (spacePos !== -1) {
        const key = line.substring(1, spacePos)
        const value = line.substring(spacePos + 1).trim()

        const normalizedKey = key.toLowerCase().replace(/_/g, '')
        this.header[normalizedKey] = value

        // Handle video standard to determine fps
        if (normalizedKey === 'videostandard') {
          this.fps = videoStandardToFps(value)
        }
      }
    }
  }

  private skipEmptyLines(): void {
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 10) { // \n
        this.pos++
        this.lineNum++
      } else if (c === 13) { // \r
        this.pos++
        if (this.pos < this.len && this.src.charCodeAt(this.pos) === 10) this.pos++
        this.lineNum++
      } else if (c === 32 || c === 9) { // space or tab
        this.pos++
      } else {
        break
      }
    }
  }

  private parseSubtitle(): SubtitleEvent | null {
    // Read timecode line: "HH:MM:SS:FF\tHH:MM:SS:FF"
    const timeLineStart = this.pos
    let nlPos = this.src.indexOf('\n', timeLineStart)
    if (nlPos === -1) nlPos = this.len

    let timeLineEnd = nlPos
    if (timeLineEnd > timeLineStart && this.src.charCodeAt(timeLineEnd - 1) === 13) timeLineEnd--

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    // Split by tab
    const tabPos = this.src.indexOf('\t', timeLineStart)
    if (tabPos === -1 || tabPos >= timeLineEnd) {
      this.addError('INVALID_TIMESTAMP', `Missing tab separator in timecode line`)
      return null
    }

    const start = this.parseTimeInline(timeLineStart, tabPos)
    if (start < 0) {
      const startStr = this.src.substring(timeLineStart, tabPos).trim()
      this.addError('INVALID_TIMESTAMP', `Invalid start timecode: ${startStr}`)
      return null
    }

    const end = this.parseTimeInline(tabPos + 1, timeLineEnd)
    if (end < 0) {
      const endStr = this.src.substring(tabPos + 1, timeLineEnd).trim()
      this.addError('INVALID_TIMESTAMP', `Invalid end timecode: ${endStr}`)
      return null
    }

    // Read text lines until empty line
    const textStart = this.pos
    let textEnd = this.pos

    while (this.pos < this.len) {
      const lineStart = this.pos
      nlPos = this.src.indexOf('\n', this.pos)
      if (nlPos === -1) nlPos = this.len

      let lineEnd = nlPos
      if (lineEnd > lineStart && this.src.charCodeAt(lineEnd - 1) === 13) lineEnd--

      // Check if line is empty (only whitespace)
      let isEmpty = true
      for (let i = lineStart; i < lineEnd; i++) {
        const c = this.src.charCodeAt(i)
        if (c !== 32 && c !== 9) {
          isEmpty = false
          break
        }
      }
      if (isEmpty) break

      textEnd = lineEnd
      this.pos = nlPos < this.len ? nlPos + 1 : this.len
      this.lineNum++
    }

    let text = this.src.substring(textStart, textEnd)
    if (text.includes('\r')) {
      text = text.replace(/\r/g, '')
    }
    text = text.trim()

    return {
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
    }
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: this.lineNum, column: 1 })
    }
    this.errors.push({ line: this.lineNum, column: 1, code, message, raw })
  }

  private parseTimeInline(start: number, end: number): number {
    const src = this.src
    while (start < end && src.charCodeAt(start) <= 32) start++
    while (end > start && src.charCodeAt(end - 1) <= 32) end--
    if (start >= end) return -1

    let i = start
    let h = 0
    let digits = 0

    while (i < end) {
      const d = src.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      h = h * 10 + d
      digits++
      i++
    }
    if (digits === 0 || i >= end || src.charCodeAt(i) !== 58) return -1
    i++

    if (i + 1 >= end) return -1
    const m1 = src.charCodeAt(i) - 48
    const m2 = src.charCodeAt(i + 1) - 48
    if (m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9) return -1
    i += 2
    if (i >= end || src.charCodeAt(i) !== 58) return -1
    i++

    if (i + 1 >= end) return -1
    const s1 = src.charCodeAt(i) - 48
    const s2 = src.charCodeAt(i + 1) - 48
    if (s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9) return -1
    i += 2
    if (i >= end || src.charCodeAt(i) !== 58) return -1
    i++

    if (i + 1 >= end) return -1
    const f1 = src.charCodeAt(i) - 48
    const f2 = src.charCodeAt(i + 1) - 48
    if (f1 < 0 || f1 > 9 || f2 < 0 || f2 > 9) return -1

    const frames = f1 * 10 + f2
    const frameMs = (frames / this.fps) * 1000
    return h * 3600000 + (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + frameMs
  }

  getHeader(): CAPHeader {
    return this.header
  }

  getFps(): number {
    return this.fps
  }
}

/**
 * Parses CAP (CaptionMAX) format subtitle file.
 *
 * CAP is a text-based subtitle format used by CaptionMAX software, supporting both PAL (25fps)
 * and NTSC (29.97fps) video standards. The format includes a header section with metadata
 * followed by subtitle entries with frame-accurate timecodes (HH:MM:SS:FF format).
 *
 * @param input - CAP file content as a string
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If the input contains invalid timecodes or format errors
 *
 * @example
 * ```ts
 * const capContent = `$CaptionMAX 2.0
 * $VideoStandard PAL
 * $CharacterSet ISO_8859_1
 *
 * 00:00:01:00	00:00:04:00
 * Hello, World!
 * `;
 * const doc = parseCAP(capContent);
 * ```
 */
export function parseCAP(input: string): SubtitleDocument {
  const parser = new CAPParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses CAP format subtitle file with detailed error reporting.
 *
 * Similar to parseCAP but returns a ParseResult object containing the document,
 * errors, and warnings. Allows customization of error handling behavior.
 *
 * @param input - CAP file content as a string
 * @param opts - Parse options for error handling and parsing behavior
 * @returns Parse result containing document, errors array, and warnings array
 *
 * @example
 * ```ts
 * const result = parseCAPResult(capContent, {
 *   onError: 'collect',
 *   strict: false
 * });
 * console.log(`Parsed ${result.document.events.length} events`);
 * console.log(`FPS: ${parser.getFps()}`);
 * ```
 */
export function parseCAPResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new CAPParser(input, opts)
  return parser.parse()
}
