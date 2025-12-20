import type { SubtitleDocument, SubtitleEvent } from '../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../core/errors.ts'
import { SubforgeError } from '../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../core/document.ts'
// Time parsing is inlined in parseSubtitle for performance

class SRTParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
    // Handle BOM and normalize line endings in one pass
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

  private readLine(): string {
    const start = this.pos
    let nlPos = this.src.indexOf('\n', this.pos)
    if (nlPos === -1) nlPos = this.len

    let end = nlPos
    if (end > start && this.src.charCodeAt(end - 1) === 13) end--

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    return this.src.substring(start, end)
  }

  private isDigit(c: number): boolean {
    return c >= 48 && c <= 57
  }

  private parseSubtitle(): SubtitleEvent | null {
    // Read index line using indexOf
    const indexLineStart = this.pos
    let nlPos = this.src.indexOf('\n', this.pos)
    if (nlPos === -1) nlPos = this.len

    let indexLineEnd = nlPos
    if (indexLineEnd > indexLineStart && this.src.charCodeAt(indexLineEnd - 1) === 13) indexLineEnd--

    // Skip whitespace at start to find first non-whitespace
    let firstNonWs = indexLineStart
    while (firstNonWs < indexLineEnd && (this.src.charCodeAt(firstNonWs) === 32 || this.src.charCodeAt(firstNonWs) === 9)) {
      firstNonWs++
    }

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    // Check if line is empty or doesn't start with digit
    if (firstNonWs >= indexLineEnd || !this.isDigit(this.src.charCodeAt(firstNonWs))) {
      return null
    }

    if (this.pos >= this.len) return null

    // Read time line using direct indexOf for arrow (avoids substring)
    const timeLineStart = this.pos
    const arrowPos = this.src.indexOf(' --> ', timeLineStart)
    nlPos = this.src.indexOf('\n', timeLineStart)
    if (nlPos === -1) nlPos = this.len

    let timeLineEnd = nlPos
    if (timeLineEnd > timeLineStart && this.src.charCodeAt(timeLineEnd - 1) === 13) timeLineEnd--

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    // Arrow must be on this line
    if (arrowPos === -1 || arrowPos >= timeLineEnd) {
      this.addError('INVALID_TIMESTAMP', `Invalid time line`)
      return null
    }

    // Inline time parsing for speed (SRT format: HH:MM:SS,mmm - exactly 12 chars)
    // Start time
    const startLen = arrowPos - timeLineStart
    if (startLen !== 12) {
      this.addError('INVALID_TIMESTAMP', `Invalid timestamp`)
      return null
    }
    const s = this.src
    let o = timeLineStart
    const start = ((s.charCodeAt(o) - 48) * 10 + (s.charCodeAt(o + 1) - 48)) * 3600000 +
                  ((s.charCodeAt(o + 3) - 48) * 10 + (s.charCodeAt(o + 4) - 48)) * 60000 +
                  ((s.charCodeAt(o + 6) - 48) * 10 + (s.charCodeAt(o + 7) - 48)) * 1000 +
                  (s.charCodeAt(o + 9) - 48) * 100 + (s.charCodeAt(o + 10) - 48) * 10 + (s.charCodeAt(o + 11) - 48)

    // End time
    const endLen = timeLineEnd - (arrowPos + 5)
    if (endLen !== 12) {
      this.addError('INVALID_TIMESTAMP', `Invalid timestamp`)
      return null
    }
    o = arrowPos + 5
    const end = ((s.charCodeAt(o) - 48) * 10 + (s.charCodeAt(o + 1) - 48)) * 3600000 +
                ((s.charCodeAt(o + 3) - 48) * 10 + (s.charCodeAt(o + 4) - 48)) * 60000 +
                ((s.charCodeAt(o + 6) - 48) * 10 + (s.charCodeAt(o + 7) - 48)) * 1000 +
                (s.charCodeAt(o + 9) - 48) * 100 + (s.charCodeAt(o + 10) - 48) * 10 + (s.charCodeAt(o + 11) - 48)

    // Read text lines until empty line using indexOf
    const textStart = this.pos
    let textEnd = this.pos

    while (this.pos < this.len) {
      const lineStart = this.pos
      nlPos = this.src.indexOf('\n', this.pos)
      if (nlPos === -1) nlPos = this.len

      let lineEnd = nlPos
      if (lineEnd > lineStart && this.src.charCodeAt(lineEnd - 1) === 13) lineEnd--

      // Check if line is empty (only whitespace) - inline check avoids substring
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
}

export function parseSRT(input: string): SubtitleDocument {
  const parser = new SRTParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

export function parseSRTResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new SRTParser(input, opts)
  return parser.parse()
}
