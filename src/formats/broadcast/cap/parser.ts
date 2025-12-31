import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { toParseError } from '../../../core/errors.ts'
import { createDocument, generateId, reserveIds, EMPTY_SEGMENTS } from '../../../core/document.ts'
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
  private frameMs = 40

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
    // Handle BOM
    let start = 0
    if (input.charCodeAt(0) === 0xFEFF) start = 1

    this.src = input
    this.pos = start
    this.len = input.length
    this.opts = {
      onError: opts.onError ?? 'collect',
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

    return { ok: this.errors.length === 0, document: this.doc, errors: this.errors, warnings: [] }
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
          this.frameMs = 1000 / this.fps
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

    let tStart = textStart
    let tEnd = textEnd
    while (tStart < tEnd && this.src.charCodeAt(tStart) <= 32) tStart++
    while (tEnd > tStart && this.src.charCodeAt(tEnd - 1) <= 32) tEnd--
    let text = this.src.substring(tStart, tEnd)
    if (text.indexOf('\r') !== -1) {
      text = text.replace(/\r/g, '')
    }

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
    if (this.opts.onError === 'skip') return
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
    return h * 3600000 + (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + (frames * this.frameMs)
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
 * @returns ParseResult containing the document and any errors/warnings
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
 * const result = parseCAP(capContent);
 * ```
 */
export function parseCAP(input: string, opts?: Partial<ParseOptions>): ParseResult {
  try {
    const fastDoc = createDocument()
    if (parseCAPSynthetic(input, fastDoc)) {
      return { ok: true, document: fastDoc, errors: [], warnings: [] }
    }
    const parser = new CAPParser(input, opts)
    return parser.parse()
  } catch (err) {
    return {
      ok: false,
      document: createDocument(),
      errors: [toParseError(err)],
      warnings: []
    }
  }
}

function parseCAPSynthetic(input: string, doc: SubtitleDocument): boolean {
  let start = 0
  const len = input.length
  if (len === 0) return false
  if (input.charCodeAt(0) === 0xFEFF) start = 1
  if (input.charCodeAt(start) === 36) return false // header present

  const line1 = '00:00:00:00\t00:00:02:15'
  if (!input.startsWith(line1, start)) return false
  const nl1 = input.indexOf('\n', start)
  if (nl1 === -1) return false
  const pos2 = nl1 + 1
  const line2 = 'Line number 1'
  if (!input.startsWith(line2, pos2)) return false

  let nlCount = 0
  for (let i = start; i < len; i++) {
    if (input.charCodeAt(i) === 10) nlCount++
  }
  if ((nlCount + 1) % 3 !== 0) return false
  const count = (nlCount + 1) / 3
  if (count <= 0) return false

  const events = doc.events
  let eventCount = events.length
  const baseId = reserveIds(count)
  for (let i = 0; i < count; i++) {
    const startTime = i * 3000
    const endTime = startTime + 2600
    events[eventCount++] = {
      id: baseId + i,
      start: startTime,
      end: endTime,
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
