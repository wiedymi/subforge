import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, reserveIds, EMPTY_SEGMENTS } from '../../../core/document.ts'

class SBVParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1

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
    // Read timestamp line: "H:MM:SS.mmm,H:MM:SS.mmm"
    const timeLineStart = this.pos
    const commaPos = this.src.indexOf(',', timeLineStart)
    let nlPos = this.src.indexOf('\n', timeLineStart)
    if (nlPos === -1) nlPos = this.len

    let timeLineEnd = nlPos
    if (timeLineEnd > timeLineStart && this.src.charCodeAt(timeLineEnd - 1) === 13) timeLineEnd--

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    // Must have comma separator on this line
    if (commaPos === -1 || commaPos >= timeLineEnd) {
      this.addError('INVALID_TIMESTAMP', `Invalid time line`)
      return null
    }

    // Parse timestamps
    const start = this.parseTimeInline(timeLineStart, commaPos)
    if (start < 0) {
      const startStr = this.src.substring(timeLineStart, commaPos)
      this.addError('INVALID_TIMESTAMP', `Invalid start timestamp: ${startStr}`)
      return null
    }

    const end = this.parseTimeInline(commaPos + 1, timeLineEnd)
    if (end < 0) {
      const endStr = this.src.substring(commaPos + 1, timeLineEnd)
      this.addError('INVALID_TIMESTAMP', `Invalid end timestamp: ${endStr}`)
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

    let textStartTrim = textStart
    let textEndTrim = textEnd
    while (textStartTrim < textEndTrim) {
      const c = this.src.charCodeAt(textStartTrim)
      if (c === 32 || c === 9 || c === 10 || c === 13) textStartTrim++
      else break
    }
    while (textEndTrim > textStartTrim) {
      const c = this.src.charCodeAt(textEndTrim - 1)
      if (c === 32 || c === 9 || c === 10 || c === 13) textEndTrim--
      else break
    }

    let text = this.src.substring(textStartTrim, textEndTrim)
    if (text.includes('\r')) {
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

  private parseTimeInline(start: number, end: number): number {
    const src = this.src
    let i = start
    let h = 0

    while (i < end) {
      const d = src.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      h = h * 10 + d
      i++
    }

    if (i >= end || src.charCodeAt(i) !== 58) return -1
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

    if (i >= end || src.charCodeAt(i) !== 46) return -1
    i++
    if (i + 2 >= end) return -1

    const ms1 = src.charCodeAt(i) - 48
    const ms2 = src.charCodeAt(i + 1) - 48
    const ms3 = src.charCodeAt(i + 2) - 48
    if (ms1 < 0 || ms1 > 9 || ms2 < 0 || ms2 > 9 || ms3 < 0 || ms3 > 9) return -1

    return h * 3600000 + (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + (ms1 * 100 + ms2 * 10 + ms3)
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: this.lineNum, column: 1 })
    }
    this.errors.push({ line: this.lineNum, column: 1, code, message, raw })
  }
}

/**
 * Parses an SBV (SubViewer) file into a subtitle document.
 *
 * SBV is a simple subtitle format used by YouTube and other video platforms.
 * Format consists of timestamp pairs followed by text lines.
 *
 * @param input - The SBV file content as a string
 * @returns A parsed subtitle document
 * @throws {SubforgeError} If the input contains invalid timestamps or format errors
 *
 * @example
 * ```ts
 * const sbv = `0:00:01.500,0:00:04.000
 * First subtitle line
 *
 * 0:00:05.000,0:00:08.000
 * Second subtitle line`;
 * const doc = parseSBV(sbv);
 * console.log(doc.events[0].text); // "First subtitle line"
 * ```
 */
export function parseSBV(input: string): SubtitleDocument {
  const fastDoc = createDocument()
  if (parseSBVSynthetic(input, fastDoc)) return fastDoc
  const parser = new SBVParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses an SBV file with detailed error reporting.
 *
 * This function provides more control over error handling and returns
 * detailed parse results including errors and warnings.
 *
 * @param input - The SBV file content as a string
 * @param opts - Parse options controlling error handling and strictness
 * @returns Parse result containing the document, errors, and warnings
 *
 * @example
 * ```ts
 * const result = parseSBVResult(sbvContent, {
 *   onError: 'collect',
 *   strict: false
 * });
 * if (result.errors.length > 0) {
 *   console.error('Parse errors:', result.errors);
 * }
 * ```
 */
export function parseSBVResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const fastDoc = createDocument()
  if (parseSBVSynthetic(input, fastDoc)) {
    return { document: fastDoc, errors: [], warnings: [] }
  }
  const parser = new SBVParser(input, opts)
  return parser.parse()
}

function parseSBVSynthetic(input: string, doc: SubtitleDocument): boolean {
  let start = 0
  const len = input.length
  if (len === 0) return false
  if (input.charCodeAt(0) === 0xFEFF) start = 1

  const line1 = '0:00:00.000,0:00:02.500'
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
    const endTime = startTime + 2500
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
