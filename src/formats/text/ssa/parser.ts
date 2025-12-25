import type { SubtitleDocument, SubtitleEvent, Style, ScriptInfo, Alignment, Comment, EmbeddedData } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, createDefaultStyle, generateId, EMPTY_SEGMENTS } from '../../../core/document.ts'
import { parseColor } from '../ass/color.ts'
import { parseTags } from '../ass/tags.ts'

class SSALexer {
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

class SSAParser {
  private lexer: SSALexer
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private eventIndex = 0

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
    this.lexer = new SSALexer(input)
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
        case 'tertiarycolour': case 'outlinecolour': case 'outlinecolor':
          try { style.outlineColor = parseColor(val) } catch { /* ignore */ }
          break
        case 'backcolour': case 'backcolor':
          try { style.backColor = parseColor(val) } catch { /* ignore */ }
          break
        case 'bold': style.bold = val === '-1' || val === '1'; break
        case 'italic': style.italic = val === '-1' || val === '1'; break
        case 'borderstyle': style.borderStyle = (parseInt(val) === 3 ? 3 : 1); break
        case 'outline': style.outline = parseFloat(val) || 2; break
        case 'shadow': style.shadow = parseFloat(val) || 2; break
        case 'alignment':
          // SSA v4 uses old alignment (1=left, 2=center, 3=right, 9=top-left, 10=top-center, 11=top-right)
          // Convert to ASS numpad alignment
          style.alignment = this.convertSSAAlignment(parseInt(val) || 2)
          break
        case 'marginl': style.marginL = parseInt(val) || 10; break
        case 'marginr': style.marginR = parseInt(val) || 10; break
        case 'marginv': style.marginV = parseInt(val) || 10; break
        case 'alphalevel':
          // SSA v4 has AlphaLevel field - ignore for now as ASS uses per-color alpha
          break
        case 'encoding': style.encoding = parseInt(val) || 1; break
      }
    }

    return style
  }

  private convertSSAAlignment(ssaAlign: number): Alignment {
    // SSA v4 alignment: 1=left, 2=center, 3=right, 9=top-left, 10=top-center, 11=top-right
    // ASS numpad: 1=bottom-left, 2=bottom-center, 3=bottom-right, 4=mid-left, 5=mid-center, 6=mid-right, 7=top-left, 8=top-center, 9=top-right
    switch (ssaAlign) {
      case 1: return 1  // left -> bottom-left
      case 2: return 2  // center -> bottom-center
      case 3: return 3  // right -> bottom-right
      case 9: return 7  // top-left
      case 10: return 8 // top-center
      case 11: return 9 // top-right
      default: return 2
    }
  }

  private parseEvents(): void {
    let format: string[] = []

    while (!this.lexer.isEOF()) {
      const line = this.lexer.readLine()

      let start = 0
      const lineLen = line.length
      while (start < lineLen) {
        const c = line.charCodeAt(start)
        if (c !== 32 && c !== 9) break
        start++
      }
      if (start >= lineLen) continue

      const firstChar = line.charCodeAt(start)

      if (firstChar === 91) { // '['
        this.lexer.unreadLine()
        break
      }

      if (firstChar === 59) continue // ';'

      if ((firstChar === 70 || firstChar === 102) && this.startsWithCI(line, start, 'format:')) {
        format = line.substring(start + 7).split(',').map(s => s.trim().toLowerCase())
        continue
      }

      if ((firstChar === 68 || firstChar === 100) && this.startsWithCI(line, start, 'dialogue:')) {
        const event = this.parseDialogueLine(line.substring(start + 9), format)
        if (event) {
          this.doc.events[this.doc.events.length] = event
          this.eventIndex++
        }
      }
      else if ((firstChar === 67 || firstChar === 99) && this.startsWithCI(line, start, 'comment:')) {
        const comment = this.parseCommentLine(line.substring(start + 8), format)
        if (comment) {
          comment.beforeEventIndex = this.eventIndex
          this.doc.comments[this.doc.comments.length] = comment
        }
      }
      else if ((firstChar === 77 || firstChar === 109) && this.startsWithCI(line, start, 'marked:')) {
        // SSA v4 has Marked field - treat as dialogue
        const event = this.parseDialogueLine(line.substring(start + 7), format)
        if (event) {
          this.doc.events[this.doc.events.length] = event
          this.eventIndex++
        }
      }
    }
  }

  private startsWithCI(line: string, offset: number, prefix: string): boolean {
    const prefixLen = prefix.length
    if (line.length - offset < prefixLen) return false
    for (let i = 0; i < prefixLen; i++) {
      const lineChar = line.charCodeAt(offset + i) | 32
      const prefixChar = prefix.charCodeAt(i) | 32
      if (lineChar !== prefixChar) return false
    }
    return true
  }

  private parseDialogueLine(data: string, format: string[]): SubtitleEvent | null {
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
        case 'marked':
          // SSA v4 has Marked field (0 or 1) - ignore
          break
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

  private parseTimeInline(s: string): number {
    const len = s.length
    if (len < 10) return -1

    const colon1 = s.indexOf(':')
    if (colon1 === -1) return -1

    let h = 0
    for (let i = 0; i < colon1; i++) {
      h = h * 10 + (s.charCodeAt(i) - 48)
    }

    const m = (s.charCodeAt(colon1 + 1) - 48) * 10 + (s.charCodeAt(colon1 + 2) - 48)
    const ss = (s.charCodeAt(colon1 + 4) - 48) * 10 + (s.charCodeAt(colon1 + 5) - 48)

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
 * Parses an SSA (SubStation Alpha) v4 subtitle file into a SubtitleDocument.
 *
 * This function handles the SSA v4 format, which is the predecessor to ASS.
 * SSA files use different style definitions and alignment values compared to ASS,
 * but are automatically converted to the unified SubtitleDocument format.
 *
 * @param input - The raw SSA file content as a string
 * @returns A parsed SubtitleDocument containing all subtitle data
 * @throws {SubforgeError} If parsing fails due to invalid format or syntax errors
 *
 * @example
 * ```ts
 * const ssaContent = await Bun.file('subtitle.ssa').text()
 * const doc = parseSSA(ssaContent)
 * console.log(doc.events.length) // Number of dialogue lines
 * ```
 */
export function parseSSA(input: string): SubtitleDocument {
  const parser = new SSAParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses an SSA subtitle file with detailed error handling options.
 *
 * This variant returns a ParseResult that includes the document, errors, and warnings,
 * allowing for fine-grained control over error handling and validation. SSA v4 specific
 * features (like AlphaLevel and Marked fields) are handled during parsing.
 *
 * @param input - The raw SSA file content as a string
 * @param opts - Optional parsing configuration
 * @param opts.onError - Error handling strategy: 'throw' (default) or 'collect'
 * @param opts.strict - Enable strict validation mode
 * @param opts.preserveOrder - Preserve original event ordering
 * @returns A ParseResult containing the document and any errors/warnings
 *
 * @example
 * ```ts
 * const result = parseSSAResult(ssaContent, { onError: 'collect' })
 * if (result.errors.length > 0) {
 *   console.error('Parsing errors:', result.errors)
 * }
 * console.log('Parsed document:', result.document)
 * ```
 */
export function parseSSAResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new SSAParser(input, opts)
  return parser.parse()
}
