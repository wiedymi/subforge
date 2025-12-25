import type { SubtitleDocument, SubtitleEvent } from '../../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError } from '../../../../core/errors.ts'
import { SubforgeError } from '../../../../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../../core/document.ts'

class SpruceSTLParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
    // Handle BOM and normalize line endings
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
    // Spruce STL format:
    // Timecode , Timecode , text
    // HH:MM:SS:FF , HH:MM:SS:FF , subtitle text

    while (this.pos < this.len) {
      this.skipEmptyLines()
      if (this.pos >= this.len) break

      const event = this.parseSubtitle()
      if (event) {
        this.doc.events.push(event)
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
    const lineStart = this.pos
    let nlPos = this.src.indexOf('\n', this.pos)
    if (nlPos === -1) nlPos = this.len

    let lineEnd = nlPos
    if (lineEnd > lineStart && this.src.charCodeAt(lineEnd - 1) === 13) lineEnd--

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    const line = this.src.substring(lineStart, lineEnd).trim()
    if (!line) return null

    // Parse format: HH:MM:SS:FF , HH:MM:SS:FF , text
    const parts = line.split(',')
    if (parts.length < 3) {
      this.addError('INVALID_FORMAT', 'Invalid Spruce STL line format')
      return null
    }

    const startStr = parts[0].trim()
    const endStr = parts[1].trim()
    const text = parts.slice(2).join(',').trim()

    const start = this.parseTimecode(startStr)
    const end = this.parseTimecode(endStr)

    if (start === null || end === null) {
      this.addError('INVALID_TIMESTAMP', 'Invalid timecode')
      return null
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

  private parseTimecode(tc: string): number | null {
    // Format: HH:MM:SS:FF
    const parts = tc.split(':')
    if (parts.length !== 4) return null

    const hh = parseInt(parts[0], 10)
    const mm = parseInt(parts[1], 10)
    const ss = parseInt(parts[2], 10)
    const ff = parseInt(parts[3], 10)

    if (isNaN(hh) || isNaN(mm) || isNaN(ss) || isNaN(ff)) return null

    // Assume 25 fps for frame conversion
    const frameRate = 25
    const frameMs = 1000 / frameRate

    return (hh * 3600000) + (mm * 60000) + (ss * 1000) + Math.floor(ff * frameMs)
  }

  private addError(code: 'INVALID_FORMAT' | 'INVALID_TIMESTAMP', message: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: this.lineNum, column: 1 })
    }
    this.errors.push({ line: this.lineNum, column: 1, code, message })
  }
}

/**
 * Parses Spruce STL subtitle file
 *
 * Spruce STL is a text-based subtitle format used by Spruce Technologies DVD authoring software.
 * Format: HH:MM:SS:FF , HH:MM:SS:FF , subtitle text
 *
 * @param input - Spruce STL file content as string
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails
 *
 * @example
 * ```ts
 * const stl = `00:00:05:00 , 00:00:10:00 , First subtitle
 * 00:00:15:00 , 00:00:20:00 , Second subtitle`
 * const doc = parseSpruceSTL(stl)
 * ```
 */
export function parseSpruceSTL(input: string): SubtitleDocument {
  const parser = new SpruceSTLParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses Spruce STL format with error collection
 *
 * @param input - Spruce STL file content as string
 * @param opts - Parsing options to control error handling
 * @returns Parse result containing document, errors, and warnings
 *
 * @example
 * ```ts
 * const result = parseSpruceSTLResult(content, { onError: 'collect' })
 * console.log(`Found ${result.errors.length} errors`)
 * ```
 */
export function parseSpruceSTLResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new SpruceSTLParser(input, opts)
  return parser.parse()
}
