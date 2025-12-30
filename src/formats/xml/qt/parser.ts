import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../core/document.ts'

/**
 * QuickTime Text format header configuration
 */
interface QTHeader {
  /** Font family name */
  font?: string
  /** Font size in points */
  size?: number
  /** Text color as RGB values (0-255) */
  textColor?: [number, number, number]
  /** Background color as RGB values (0-255) */
  backColor?: [number, number, number]
  /** Text justification */
  justify?: 'left' | 'center' | 'right'
  /** Time scale units per second (default: 1000) */
  timeScale: number
  /** Video width in pixels */
  width?: number
  /** Video height in pixels */
  height?: number
  /** Timestamp mode */
  timeStamps?: 'absolute' | 'relative'
}

class QTParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1
  private header: QTHeader = { timeScale: 1000 }

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
    this.parseHeader()
    this.parseBody()
    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private parseHeader(): void {
    while (this.pos < this.len) {
      this.skipWhitespace()
      if (this.pos >= this.len) break

      const c = this.src.charCodeAt(this.pos)

      // Header directives start with {
      if (c === 123) { // {
        const directive = this.parseDirective()
        if (directive) {
          this.applyDirective(directive)
        }
      } else if (c === 91) { // [ - start of body
        break
      } else {
        this.pos++
      }
    }
  }

  private parseDirective(): { key: string; value: string } | null {
    if (this.src.charCodeAt(this.pos) !== 123) return null // {

    const start = this.pos + 1
    let end = start
    let nestLevel = 1

    this.pos++
    while (this.pos < this.len && nestLevel > 0) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 123) nestLevel++
      else if (c === 125) {
        nestLevel--
        if (nestLevel === 0) {
          end = this.pos
          break
        }
      }
      this.pos++
    }

    if (nestLevel > 0) {
      this.addError('PARSE_ERROR', 'Unclosed directive')
      return null
    }

    const content = this.src.substring(start, end).trim()
    this.pos++ // skip closing }

    // Parse key:value or just key
    const colonPos = content.indexOf(':')
    if (colonPos === -1) {
      return { key: content, value: '' }
    }

    return {
      key: content.substring(0, colonPos).trim(),
      value: content.substring(colonPos + 1).trim()
    }
  }

  private applyDirective(directive: { key: string; value: string }): void {
    const { key, value } = directive

    switch (key) {
      case 'font':
        this.header.font = value
        break
      case 'size':
        this.header.size = parseInt(value, 10)
        break
      case 'textColor':
        this.header.textColor = this.parseColorValue(value)
        break
      case 'backColor':
        this.header.backColor = this.parseColorValue(value)
        break
      case 'justify':
        if (value === 'left' || value === 'center' || value === 'right') {
          this.header.justify = value
        }
        break
      case 'timeScale':
        this.header.timeScale = parseInt(value, 10) || 1000
        break
      case 'width':
        this.header.width = parseInt(value, 10)
        break
      case 'height':
        this.header.height = parseInt(value, 10)
        break
      case 'timeStamps':
        if (value === 'absolute' || value === 'relative') {
          this.header.timeStamps = value
        }
        break
    }
  }

  private parseColorValue(value: string): [number, number, number] {
    // Parse "r, g, b" where each component is 0-65535
    const parts = value.split(',').map(s => s.trim())
    if (parts.length !== 3) return [255, 255, 255]

    const r = Math.min(255, Math.floor(parseInt(parts[0], 10) / 257))
    const g = Math.min(255, Math.floor(parseInt(parts[1], 10) / 257))
    const b = Math.min(255, Math.floor(parseInt(parts[2], 10) / 257))

    return [r, g, b]
  }

  private parseBody(): void {
    let lastTime: number | null = null
    let lastText = ''

    while (this.pos < this.len) {
      this.skipWhitespace()
      if (this.pos >= this.len) break

      const c = this.src.charCodeAt(this.pos)

      if (c === 91) { // [
        const timestamp = this.parseTimestamp()
        if (timestamp !== null) {
          // Create event from last timestamp/text to current timestamp
          if (lastTime !== null && lastText.length > 0) {
            const event: SubtitleEvent = {
              id: generateId(),
              start: lastTime,
              end: timestamp,
              layer: 0,
              style: 'Default',
              actor: '',
              marginL: 0,
              marginR: 0,
              marginV: 0,
              effect: '',
              text: lastText,
              segments: EMPTY_SEGMENTS,
              dirty: false
            }
            this.doc.events.push(event)
          }

          // Read text for this timestamp (will be used in next iteration)
          lastText = this.parseText()
          lastTime = timestamp
        }
      } else {
        this.pos++
      }
    }
  }

  private parseTimestamp(): number | null {
    if (this.src.charCodeAt(this.pos) !== 91) return null // [

    const start = this.pos + 1
    let end = start

    this.pos++
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 93) { // ]
        end = this.pos
        this.pos++
        break
      }
      this.pos++
    }

    return this.parseTimeInline(start, end)
  }

  private parseTimeInline(start: number, end: number): number | null {
    const src = this.src
    while (start < end && src.charCodeAt(start) <= 32) start++
    while (end > start && src.charCodeAt(end - 1) <= 32) end--
    if (start >= end) return null

    let i = start
    let first = 0
    let digits = 0
    while (i < end) {
      const d = src.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      first = first * 10 + d
      digits++
      i++
    }
    if (digits === 0 || i >= end || src.charCodeAt(i) !== 58) return null
    i++ // skip :

    let second = 0
    digits = 0
    while (i < end) {
      const d = src.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      second = second * 10 + d
      digits++
      i++
    }
    if (digits === 0 || i >= end) return null

    let hours = 0
    let minutes = 0
    let seconds = 0

    const sep = src.charCodeAt(i)
    if (sep === 58) { // HH:MM:SS.mmm
      hours = first
      minutes = second
      i++

      seconds = 0
      digits = 0
      while (i < end) {
        const d = src.charCodeAt(i) - 48
        if (d < 0 || d > 9) break
        seconds = seconds * 10 + d
        digits++
        i++
      }
      if (digits === 0 || i >= end || src.charCodeAt(i) !== 46) return null
    } else if (sep === 46) { // MM:SS.mmm
      hours = 0
      minutes = first
      seconds = second
    } else {
      return null
    }

    if (src.charCodeAt(i) !== 46) return null
    i++

    let ms = 0
    let msDigits = 0
    while (i < end) {
      const d = src.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      if (msDigits < 3) {
        ms = ms * 10 + d
        msDigits++
      }
      i++
    }
    if (msDigits === 0) return null
    if (msDigits === 1) ms *= 100
    else if (msDigits === 2) ms *= 10

    const timeScale = this.header.timeScale || 1000
    const timeScaleMs = (hours * 3600 + minutes * 60 + seconds) * timeScale +
                        Math.floor(ms * timeScale / 1000)
    return Math.floor(timeScaleMs * 1000 / timeScale)
  }

  private parseText(): string {
    const lines: string[] = []

    while (this.pos < this.len) {
      this.skipWhitespace()
      if (this.pos >= this.len) break

      const c = this.src.charCodeAt(this.pos)

      // Stop at next timestamp
      if (c === 91) break // [

      // Stop at directives
      if (c === 123) break // {

      // Read line
      const lineStart = this.pos
      let lineEnd = this.pos

      while (this.pos < this.len) {
        const ch = this.src.charCodeAt(this.pos)
        if (ch === 10 || ch === 13) break
        lineEnd = this.pos + 1
        this.pos++
      }

      const line = this.src.substring(lineStart, lineEnd).trim()
      if (line.length > 0) {
        lines.push(line)
      }

      // Skip newline
      if (this.pos < this.len) {
        const ch = this.src.charCodeAt(this.pos)
        if (ch === 13) {
          this.pos++
          if (this.pos < this.len && this.src.charCodeAt(this.pos) === 10) {
            this.pos++
          }
          this.lineNum++
        } else if (ch === 10) {
          this.pos++
          this.lineNum++
        }
      }
    }

    return lines.join('\n')
  }

  private skipWhitespace(): void {
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 32 || c === 9) { // space or tab
        this.pos++
      } else if (c === 10) { // \n
        this.pos++
        this.lineNum++
      } else if (c === 13) { // \r
        this.pos++
        if (this.pos < this.len && this.src.charCodeAt(this.pos) === 10) this.pos++
        this.lineNum++
      } else {
        break
      }
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
 * Parses QuickTime Text format subtitle file
 *
 * QuickTime Text is a text-based subtitle format used by Apple QuickTime Player.
 * It supports basic formatting through directives like font, size, and color.
 *
 * @param input - QuickTime Text file content as string
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails
 *
 * @example
 * ```ts
 * const qt = `{QTtext} {font:Arial}
 * {size:14}
 * [00:00:05.000]
 * First subtitle
 * [00:00:10.000]
 * Second subtitle`
 * const doc = parseQT(qt)
 * ```
 */
export function parseQT(input: string): SubtitleDocument {
  const parser = new QTParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses QuickTime Text format with error collection
 *
 * @param input - QuickTime Text file content as string
 * @param opts - Parsing options to control error handling
 * @returns Parse result containing document, errors, and warnings
 *
 * @example
 * ```ts
 * const result = parseQTResult(qtContent, { onError: 'collect' })
 * console.log(`Found ${result.errors.length} errors`)
 * ```
 */
export function parseQTResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new QTParser(input, opts)
  return parser.parse()
}
