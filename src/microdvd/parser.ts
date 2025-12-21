import type { SubtitleDocument, SubtitleEvent } from '../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../core/errors.ts'
import { SubforgeError } from '../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../core/document.ts'

class MicroDVDParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1
  private fps: number

  constructor(input: string, fps: number, opts: Partial<ParseOptions> = {}) {
    // Handle BOM
    let start = 0
    if (input.charCodeAt(0) === 0xFEFF) start = 1

    this.src = input
    this.pos = start
    this.len = input.length
    this.fps = fps
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

  private isDigit(c: number): boolean {
    return c >= 48 && c <= 57
  }

  private parseSubtitle(): SubtitleEvent | null {
    // MicroDVD format: {start}{end}text
    // Find first {
    if (this.src.charCodeAt(this.pos) !== 123) { // {
      // Skip to next line
      const nlPos = this.src.indexOf('\n', this.pos)
      if (nlPos === -1) {
        this.pos = this.len
      } else {
        this.pos = nlPos + 1
        this.lineNum++
      }
      return null
    }

    // Parse start frame
    this.pos++ // skip {
    let numStart = this.pos
    while (this.pos < this.len && this.isDigit(this.src.charCodeAt(this.pos))) {
      this.pos++
    }

    if (this.pos >= this.len || this.src.charCodeAt(this.pos) !== 125) { // }
      this.addError('INVALID_FORMAT', 'Invalid start frame')
      return null
    }

    const startFrame = parseInt(this.src.slice(numStart, this.pos), 10)
    this.pos++ // skip }

    // Parse end frame
    if (this.pos >= this.len || this.src.charCodeAt(this.pos) !== 123) { // {
      this.addError('INVALID_FORMAT', 'Missing end frame')
      return null
    }

    this.pos++ // skip {
    numStart = this.pos
    while (this.pos < this.len && this.isDigit(this.src.charCodeAt(this.pos))) {
      this.pos++
    }

    if (this.pos >= this.len || this.src.charCodeAt(this.pos) !== 125) { // }
      this.addError('INVALID_FORMAT', 'Invalid end frame')
      return null
    }

    const endFrame = parseInt(this.src.slice(numStart, this.pos), 10)
    this.pos++ // skip }

    // Parse text until end of line
    const textStart = this.pos
    let nlPos = this.src.indexOf('\n', this.pos)
    if (nlPos === -1) nlPos = this.len

    let textEnd = nlPos
    if (textEnd > textStart && this.src.charCodeAt(textEnd - 1) === 13) textEnd--

    let text = this.src.slice(textStart, textEnd).trim()

    // Convert pipe | to line breaks
    if (text.includes('|')) {
      text = text.replace(/\|/g, '\n')
    }

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    // Convert frames to milliseconds
    const start = Math.round((startFrame / this.fps) * 1000)
    const end = Math.round((endFrame / this.fps) * 1000)

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
 * Parses a MicroDVD subtitle file into a subtitle document.
 *
 * MicroDVD is a frame-based subtitle format that uses curly braces for timing.
 * Format: {startFrame}{endFrame}Text
 *
 * @param input - The MicroDVD file content as a string
 * @param fps - Frame rate (frames per second) for converting frame numbers to time
 * @returns A parsed subtitle document
 * @throws {SubforgeError} If the input contains invalid frames or format errors
 *
 * @example
 * ```ts
 * const mdvd = `{0}{100}First subtitle
 * {100}{200}Second subtitle`;
 * const doc = parseMicroDVD(mdvd, 23.976);
 * console.log(doc.events[0].text); // "First subtitle"
 * ```
 */
export function parseMicroDVD(input: string, fps: number): SubtitleDocument {
  const parser = new MicroDVDParser(input, fps, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses a MicroDVD file with detailed error reporting.
 *
 * This function provides more control over error handling and returns
 * detailed parse results including errors and warnings.
 *
 * @param input - The MicroDVD file content as a string
 * @param fps - Frame rate (frames per second) for converting frame numbers to time
 * @param opts - Parse options controlling error handling and strictness
 * @returns Parse result containing the document, errors, and warnings
 *
 * @example
 * ```ts
 * const result = parseMicroDVDResult(mdvdContent, 25.0, {
 *   onError: 'collect',
 *   strict: false
 * });
 * if (result.errors.length > 0) {
 *   console.error('Parse errors:', result.errors);
 * }
 * ```
 */
export function parseMicroDVDResult(input: string, fps: number, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new MicroDVDParser(input, fps, opts)
  return parser.parse()
}
