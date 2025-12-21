import type { SubtitleDocument, SubtitleEvent, Style, ScriptInfo, Alignment, Comment, EmbeddedData } from '../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../core/errors.ts'
import { SubforgeError } from '../core/errors.ts'
import { createDocument, createDefaultStyle, generateId, EMPTY_SEGMENTS } from '../core/document.ts'
// Time parsing is inlined below for performance
import { parseColor } from './color.ts'
import { parseTags } from './tags.ts'

class ASSLexer {
  private src: string
  private pos = 0
  private len: number
  private line = 1
  private lastLineStart = 0
  private lastLine = 0

  constructor(src: string) {
    this.src = src
    this.len = src.length
  }

  getPosition(): { line: number; column: number } {
    return { line: this.line, column: 1 }
  }

  isEOF(): boolean { return this.pos >= this.len }

  skipLine(): void {
    const nlPos = this.src.indexOf('\n', this.pos)
    if (nlPos === -1) {
      this.pos = this.len
    } else {
      this.pos = nlPos + 1
      this.line++
    }
  }

  readLine(): string {
    this.lastLineStart = this.pos
    this.lastLine = this.line
    const start = this.pos
    let nlPos = this.src.indexOf('\n', this.pos)
    if (nlPos === -1) nlPos = this.len

    // Check for \r before \n
    let end = nlPos
    if (end > start && this.src.charCodeAt(end - 1) === 13) end--

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.line++
    return this.src.substring(start, end)
  }

  unreadLine(): void {
    this.pos = this.lastLineStart
    this.line = this.lastLine
  }

  peekLine(): string {
    const savedPos = this.pos
    const savedLine = this.line
    const line = this.readLine()
    this.pos = savedPos
    this.line = savedLine
    return line
  }
}

class ASSParser {
  private lexer: ASSLexer
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private eventIndex = 0

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
    this.lexer = new ASSLexer(input)
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
  }

  parse(): ParseResult {
    while (!this.lexer.isEOF()) {
      const line = this.lexer.peekLine().trim()
      if (line.startsWith('[')) {
        this.parseSection()
      } else {
        this.lexer.skipLine()
      }
    }
    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private parseSection(): void {
    const line = this.lexer.readLine().trim()
    const sectionMatch = line.match(/^\[(.+)\]$/)
    if (!sectionMatch) return

    const section = sectionMatch[1]!.toLowerCase()

    switch (section) {
      case 'script info':
        this.parseScriptInfo()
        break
      case 'v4+ styles':
      case 'v4 styles':
        this.parseStyles()
        break
      case 'events':
        this.parseEvents()
        break
      case 'fonts':
        this.parseFonts()
        break
      case 'graphics':
        this.parseGraphics()
        break
      default:
        this.skipSection()
    }
  }

  private skipSection(): void {
    while (!this.lexer.isEOF()) {
      const line = this.lexer.peekLine().trim()
      if (line.startsWith('[')) break
      this.lexer.skipLine()
    }
  }

  private parseScriptInfo(): void {
    while (!this.lexer.isEOF()) {
      const line = this.lexer.peekLine().trim()
      if (line.startsWith('[')) break
      this.lexer.readLine()

      if (line.startsWith(';') || line === '') continue

      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue

      const key = line.substring(0, colonIdx).trim().toLowerCase()
      const value = line.substring(colonIdx + 1).trim()

      switch (key) {
        case 'title':
          this.doc.info.title = value
          break
        case 'original author':
        case 'original script':
          this.doc.info.author = value
          break
        case 'playresx':
          this.doc.info.playResX = parseInt(value) || 1920
          break
        case 'playresy':
          this.doc.info.playResY = parseInt(value) || 1080
          break
        case 'scaleborderandshadow':
          this.doc.info.scaleBorderAndShadow = value.toLowerCase() === 'yes'
          break
        case 'wrapstyle':
          this.doc.info.wrapStyle = (parseInt(value) || 0) as 0 | 1 | 2 | 3
          break
      }
    }
  }

  private parseStyles(): void {
    let format: string[] = []

    while (!this.lexer.isEOF()) {
      const line = this.lexer.peekLine().trim()
      if (line.startsWith('[')) break
      this.lexer.readLine()

      if (line.startsWith(';') || line === '') continue

      if (line.toLowerCase().startsWith('format:')) {
        format = line.substring(7).split(',').map(s => s.trim().toLowerCase())
        continue
      }

      if (line.toLowerCase().startsWith('style:')) {
        const style = this.parseStyleLine(line.substring(6), format)
        if (style) {
          this.doc.styles.set(style.name, style)
        }
      }
    }
  }

  private parseStyleLine(data: string, format: string[]): Style | null {
    const values = this.splitFields(data, format.length)
    const style = createDefaultStyle()

    for (let i = 0; i < format.length && i < values.length; i++) {
      const key = format[i]!
      const val = values[i]!.trim()

      switch (key) {
        case 'name': style.name = val; break
        case 'fontname': style.fontName = val; break
        case 'fontsize': style.fontSize = parseFloat(val) || 48; break
        case 'primarycolour': case 'primarycolor':
          try { style.primaryColor = parseColor(val) } catch { /* ignore */ }
          break
        case 'secondarycolour': case 'secondarycolor':
          try { style.secondaryColor = parseColor(val) } catch { /* ignore */ }
          break
        case 'outlinecolour': case 'outlinecolor': case 'tertiarycolour':
          try { style.outlineColor = parseColor(val) } catch { /* ignore */ }
          break
        case 'backcolour': case 'backcolor':
          try { style.backColor = parseColor(val) } catch { /* ignore */ }
          break
        case 'bold': style.bold = val === '-1' || val === '1'; break
        case 'italic': style.italic = val === '-1' || val === '1'; break
        case 'underline': style.underline = val === '-1' || val === '1'; break
        case 'strikeout': case 'strikethrough': style.strikeout = val === '-1' || val === '1'; break
        case 'scalex': style.scaleX = parseFloat(val) || 100; break
        case 'scaley': style.scaleY = parseFloat(val) || 100; break
        case 'spacing': style.spacing = parseFloat(val) || 0; break
        case 'angle': style.angle = parseFloat(val) || 0; break
        case 'borderstyle': style.borderStyle = (parseInt(val) === 3 ? 3 : 1); break
        case 'outline': style.outline = parseFloat(val) || 2; break
        case 'shadow': style.shadow = parseFloat(val) || 2; break
        case 'alignment': style.alignment = (parseInt(val) || 2) as Alignment; break
        case 'marginl': style.marginL = parseInt(val) || 10; break
        case 'marginr': style.marginR = parseInt(val) || 10; break
        case 'marginv': style.marginV = parseInt(val) || 10; break
        case 'encoding': style.encoding = parseInt(val) || 1; break
      }
    }

    return style
  }

  private parseEvents(): void {
    let format: string[] = []
    // Check if standard format for fast path
    let isStandardFormat = false

    while (!this.lexer.isEOF()) {
      const line = this.lexer.readLine()

      // Skip empty lines
      let start = 0
      const lineLen = line.length
      while (start < lineLen) {
        const c = line.charCodeAt(start)
        if (c !== 32 && c !== 9) break
        start++
      }
      if (start >= lineLen) continue

      const firstChar = line.charCodeAt(start)

      // Check for section start
      if (firstChar === 91) { // '['
        this.lexer.unreadLine()
        break
      }

      // Skip comments
      if (firstChar === 59) continue // ';'

      // Check for Format: (70=F, 102=f)
      if ((firstChar === 70 || firstChar === 102) && this.startsWithCI(line, start, 'format:')) {
        format = line.substring(start + 7).split(',').map(s => s.trim().toLowerCase())
        isStandardFormat = format.length === 10 && format[0] === 'layer' && format[1] === 'start' && format[9] === 'text'
        continue
      }

      // Check for Dialogue: (68=D, 100=d)
      if ((firstChar === 68 || firstChar === 100) && this.startsWithCI(line, start, 'dialogue:')) {
        const event = isStandardFormat
          ? this.parseDialogueFast(line, start + 9)
          : this.parseDialogueLine(line.substring(start + 9), format)
        if (event) {
          this.doc.events[this.doc.events.length] = event
          this.eventIndex++
        }
      }
      // Check for Comment: (67=C, 99=c)
      else if ((firstChar === 67 || firstChar === 99) && this.startsWithCI(line, start, 'comment:')) {
        const comment = this.parseCommentLine(line.substring(start + 8), format)
        if (comment) {
          comment.beforeEventIndex = this.eventIndex
          this.doc.comments[this.doc.comments.length] = comment
        }
      }
    }
  }

  private startsWithCI(line: string, offset: number, prefix: string): boolean {
    const prefixLen = prefix.length
    if (line.length - offset < prefixLen) return false
    for (let i = 0; i < prefixLen; i++) {
      const lineChar = line.charCodeAt(offset + i) | 32 // lowercase
      const prefixChar = prefix.charCodeAt(i) | 32
      if (lineChar !== prefixChar) return false
    }
    return true
  }

  private parseDialogueLine(data: string, format: string[]): SubtitleEvent | null {
    // Fast path: standard format with fixed positions
    // Standard: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    if (format.length === 10 && format[0] === 'layer' && format[1] === 'start' && format[9] === 'text') {
      return this.parseDialogueFast(data)
    }

    // Slow path: dynamic format (rare)
    const values = this.splitFields(data, format.length)

    const event: SubtitleEvent = {
      id: generateId(),
      start: 0,
      end: 0,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: '',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }

    for (let i = 0; i < format.length && i < values.length; i++) {
      const key = format[i]!
      const val = values[i]!.trim()

      switch (key) {
        case 'layer': event.layer = parseInt(val) || 0; break
        case 'start':
          {
            const t = this.parseTimeInline(val)
            if (t < 0) this.addError('INVALID_TIMESTAMP', `Invalid start time: ${val}`)
            else event.start = t
          }
          break
        case 'end':
          {
            const t = this.parseTimeInline(val)
            if (t < 0) this.addError('INVALID_TIMESTAMP', `Invalid end time: ${val}`)
            else event.end = t
          }
          break
        case 'style': event.style = val; break
        case 'name': case 'actor': event.actor = val; break
        case 'marginl': event.marginL = parseInt(val) || 0; break
        case 'marginr': event.marginR = parseInt(val) || 0; break
        case 'marginv': event.marginV = parseInt(val) || 0; break
        case 'effect': event.effect = val; break
        case 'text': event.text = val; break
      }
    }

    return event
  }

  // Fast path for standard ASS format - works directly on line to avoid substring
  private parseDialogueFast(line: string, dataStart: number): SubtitleEvent | null {
    // indexOf is SIMD optimized - faster than char-by-char scanning
    const c1 = line.indexOf(',', dataStart)
    const c2 = line.indexOf(',', c1 + 1)
    const c3 = line.indexOf(',', c2 + 1)
    const c4 = line.indexOf(',', c3 + 1)
    const c5 = line.indexOf(',', c4 + 1)
    const c6 = line.indexOf(',', c5 + 1)
    const c7 = line.indexOf(',', c6 + 1)
    const c8 = line.indexOf(',', c7 + 1)
    const c9 = line.indexOf(',', c8 + 1)

    // Inline parseInt for layer
    let layer = 0
    for (let i = dataStart; i < c1; i++) {
      const c = line.charCodeAt(i)
      if (c >= 48 && c <= 57) layer = layer * 10 + (c - 48)
    }

    // Time parsing for start
    let o = c1 + 1
    const colon1 = line.indexOf(':', o)
    if (colon1 === -1 || colon1 >= c2) {
      this.addError('INVALID_TIMESTAMP', `Invalid start time`)
      return null
    }
    let h = 0
    for (let i = o; i < colon1; i++) h = h * 10 + (line.charCodeAt(i) - 48)
    const m = (line.charCodeAt(colon1 + 1) - 48) * 10 + (line.charCodeAt(colon1 + 2) - 48)
    const ss = (line.charCodeAt(colon1 + 4) - 48) * 10 + (line.charCodeAt(colon1 + 5) - 48)
    const fracStart = colon1 + 7
    const fracLen = c2 - fracStart
    const startMs = fracLen === 2
      ? ((line.charCodeAt(fracStart) - 48) * 10 + (line.charCodeAt(fracStart + 1) - 48)) * 10
      : (line.charCodeAt(fracStart) - 48) * 100 + (line.charCodeAt(fracStart + 1) - 48) * 10 + (line.charCodeAt(fracStart + 2) - 48)
    const start = h * 3600000 + m * 60000 + ss * 1000 + startMs

    // Time parsing for end
    o = c2 + 1
    const colon2 = line.indexOf(':', o)
    if (colon2 === -1 || colon2 >= c3) {
      this.addError('INVALID_TIMESTAMP', `Invalid end time`)
      return null
    }
    let h2 = 0
    for (let i = o; i < colon2; i++) h2 = h2 * 10 + (line.charCodeAt(i) - 48)
    const m2 = (line.charCodeAt(colon2 + 1) - 48) * 10 + (line.charCodeAt(colon2 + 2) - 48)
    const ss2 = (line.charCodeAt(colon2 + 4) - 48) * 10 + (line.charCodeAt(colon2 + 5) - 48)
    const fracStart2 = colon2 + 7
    const fracLen2 = c3 - fracStart2
    const endMs = fracLen2 === 2
      ? ((line.charCodeAt(fracStart2) - 48) * 10 + (line.charCodeAt(fracStart2 + 1) - 48)) * 10
      : (line.charCodeAt(fracStart2) - 48) * 100 + (line.charCodeAt(fracStart2 + 1) - 48) * 10 + (line.charCodeAt(fracStart2 + 2) - 48)
    const end = h2 * 3600000 + m2 * 60000 + ss2 * 1000 + endMs

    // Inline parseInt for margins
    let marginL = 0, marginR = 0, marginV = 0
    for (let i = c5 + 1; i < c6; i++) {
      const c = line.charCodeAt(i)
      if (c >= 48 && c <= 57) marginL = marginL * 10 + (c - 48)
    }
    for (let i = c6 + 1; i < c7; i++) {
      const c = line.charCodeAt(i)
      if (c >= 48 && c <= 57) marginR = marginR * 10 + (c - 48)
    }
    for (let i = c7 + 1; i < c8; i++) {
      const c = line.charCodeAt(i)
      if (c >= 48 && c <= 57) marginV = marginV * 10 + (c - 48)
    }

    return {
      id: generateId(),
      start,
      end,
      layer,
      style: line.substring(c3 + 1, c4),
      actor: line.substring(c4 + 1, c5),
      marginL,
      marginR,
      marginV,
      effect: line.substring(c8 + 1, c9),
      text: line.substring(c9 + 1),
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
  }

  private parseCommentLine(data: string, format: string[]): Comment | null {
    const values = this.splitFields(data, format.length)
    const textIdx = format.indexOf('text')
    if (textIdx === -1 || textIdx >= values.length) return null

    return {
      text: values[textIdx]!.trim()
    }
  }

  private parseFonts(): void {
    if (!this.doc.fonts) this.doc.fonts = []

    let currentFont: EmbeddedData | null = null

    while (!this.lexer.isEOF()) {
      const line = this.lexer.peekLine()
      if (line.trim().startsWith('[')) break
      this.lexer.readLine()

      const trimmed = line.trim()
      if (trimmed.startsWith('fontname:')) {
        if (currentFont) this.doc.fonts.push(currentFont)
        currentFont = { name: trimmed.slice(9).trim(), data: '' }
      } else if (currentFont && trimmed.length > 0) {
        currentFont.data += trimmed
      }
    }

    if (currentFont) this.doc.fonts.push(currentFont)
  }

  private parseGraphics(): void {
    if (!this.doc.graphics) this.doc.graphics = []

    let currentGraphic: EmbeddedData | null = null

    while (!this.lexer.isEOF()) {
      const line = this.lexer.peekLine()
      if (line.trim().startsWith('[')) break
      this.lexer.readLine()

      const trimmed = line.trim()
      if (trimmed.startsWith('filename:')) {
        if (currentGraphic) this.doc.graphics.push(currentGraphic)
        currentGraphic = { name: trimmed.slice(9).trim(), data: '' }
      } else if (currentGraphic && trimmed.length > 0) {
        currentGraphic.data += trimmed
      }
    }

    if (currentGraphic) this.doc.graphics.push(currentGraphic)
  }

  private splitFields(data: string, expectedCount: number): string[] {
    const result: string[] = new Array(expectedCount)
    let start = 0
    let idx = 0

    for (; idx < expectedCount - 1; idx++) {
      const commaIdx = data.indexOf(',', start)
      if (commaIdx === -1) {
        result[idx] = data.substring(start)
        result.length = idx + 1
        return result
      }
      result[idx] = data.substring(start, commaIdx)
      start = commaIdx + 1
    }

    result[idx] = data.substring(start)
    return result
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    const pos = this.lexer.getPosition()
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, pos)
    }
    this.errors.push({ ...pos, code, message, raw })
  }

  // Inline time parsing for performance
  // ASS format: H:MM:SS.cc or H:MM:SS.ccc (variable hours, 2-3 digit fraction)
  // Returns -1 on error
  private parseTimeInline(s: string): number {
    const len = s.length
    if (len < 10) return -1

    // Find first colon (hours are variable length)
    const colon1 = s.indexOf(':')
    if (colon1 === -1) return -1

    // Parse hours
    let h = 0
    for (let i = 0; i < colon1; i++) {
      h = h * 10 + (s.charCodeAt(i) - 48)
    }

    // Fixed format after colon1: MM:SS.ff
    const m = (s.charCodeAt(colon1 + 1) - 48) * 10 + (s.charCodeAt(colon1 + 2) - 48)
    const ss = (s.charCodeAt(colon1 + 4) - 48) * 10 + (s.charCodeAt(colon1 + 5) - 48)

    // Fractional: 2 digits = centiseconds (x10), 3 digits = milliseconds
    const fracStart = colon1 + 7
    const fracLen = len - fracStart
    let ms: number
    if (fracLen === 2) {
      ms = ((s.charCodeAt(fracStart) - 48) * 10 + (s.charCodeAt(fracStart + 1) - 48)) * 10
    } else {
      ms = (s.charCodeAt(fracStart) - 48) * 100 + (s.charCodeAt(fracStart + 1) - 48) * 10 + (s.charCodeAt(fracStart + 2) - 48)
    }

    return h * 3600000 + m * 60000 + ss * 1000 + ms
  }
}

/**
 * Parses an ASS (Advanced SubStation Alpha) subtitle file into a SubtitleDocument.
 *
 * This function handles the complete ASS format including script info, styles, events,
 * and embedded fonts/graphics. It uses optimized parsing with SIMD-accelerated string
 * operations for maximum performance.
 *
 * @param input - The raw ASS file content as a string
 * @returns A parsed SubtitleDocument containing all subtitle data
 * @throws {SubforgeError} If parsing fails due to invalid format or syntax errors
 *
 * @example
 * ```ts
 * const assContent = await Bun.file('subtitle.ass').text()
 * const doc = parseASS(assContent)
 * console.log(doc.events.length) // Number of dialogue lines
 * ```
 */
export function parseASS(input: string): SubtitleDocument {
  const parser = new ASSParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses an ASS subtitle file with detailed error handling options.
 *
 * This variant returns a ParseResult that includes the document, errors, and warnings,
 * allowing for fine-grained control over error handling and validation.
 *
 * @param input - The raw ASS file content as a string
 * @param opts - Optional parsing configuration
 * @param opts.onError - Error handling strategy: 'throw' (default) or 'collect'
 * @param opts.strict - Enable strict validation mode
 * @param opts.preserveOrder - Preserve original event ordering
 * @returns A ParseResult containing the document and any errors/warnings
 *
 * @example
 * ```ts
 * const result = parseASSResult(assContent, { onError: 'collect' })
 * if (result.errors.length > 0) {
 *   console.error('Parsing errors:', result.errors)
 * }
 * console.log('Parsed document:', result.document)
 * ```
 */
export function parseASSResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new ASSParser(input, opts)
  return parser.parse()
}
