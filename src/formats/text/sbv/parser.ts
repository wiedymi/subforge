import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../core/document.ts'
import { parseTime } from './time.ts'

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
    const startStr = this.src.substring(timeLineStart, commaPos)
    const endStr = this.src.substring(commaPos + 1, timeLineEnd)

    let start: number
    let end: number

    try {
      start = parseTime(startStr)
    } catch (e) {
      this.addError('INVALID_TIMESTAMP', `Invalid start timestamp: ${startStr}`)
      return null
    }

    try {
      end = parseTime(endStr)
    } catch (e) {
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
  const parser = new SBVParser(input, opts)
  return parser.parse()
}
