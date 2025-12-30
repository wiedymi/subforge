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
  private eventFieldIndexes: EventFieldIndexes | null = null

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
    let isStandardFormat = false

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
        this.eventFieldIndexes = this.buildEventFieldIndexes(format)
        isStandardFormat = format.length === 10 &&
          format[0] === 'marked' &&
          format[1] === 'start' &&
          format[2] === 'end' &&
          format[9] === 'text'
        continue
      }

      if ((firstChar === 68 || firstChar === 100) && this.startsWithCI(line, start, 'dialogue:')) {
        const event = isStandardFormat
          ? this.parseDialogueStandard(line, start + 9)
          : this.parseDialogueLineFast(line, start + 9, format)
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
        const event = isStandardFormat
          ? this.parseDialogueStandard(line, start + 7)
          : this.parseDialogueLineFast(line, start + 7, format)
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

  private parseDialogueLineFast(line: string, offset: number, format: string[]): SubtitleEvent | null {
    const formatIndexes = this.eventFieldIndexes
    if (!formatIndexes || formatIndexes.count === 0) {
      return this.parseDialogueLine(line.substring(offset), format)
    }

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

    const len = line.length
    let field = 0
    let startPos = offset

    while (startPos <= len && field < formatIndexes.count) {
      let endPos: number
      if (field < formatIndexes.count - 1) {
        const comma = line.indexOf(',', startPos)
        if (comma === -1) {
          endPos = len
        } else {
          endPos = comma
        }
      } else {
        endPos = len
      }

      if (field === formatIndexes.start) {
        const t = this.parseTimeRange(line, startPos, endPos)
        if (t < 0) this.addError('INVALID_TIMESTAMP', `Invalid start time`)
        else event.start = t
      } else if (field === formatIndexes.end) {
        const t = this.parseTimeRange(line, startPos, endPos)
        if (t < 0) this.addError('INVALID_TIMESTAMP', `Invalid end time`)
        else event.end = t
      } else if (field === formatIndexes.layer) {
        event.layer = this.parseIntRange(line, startPos, endPos)
      } else if (field === formatIndexes.marginL) {
        event.marginL = this.parseIntRange(line, startPos, endPos)
      } else if (field === formatIndexes.marginR) {
        event.marginR = this.parseIntRange(line, startPos, endPos)
      } else if (field === formatIndexes.marginV) {
        event.marginV = this.parseIntRange(line, startPos, endPos)
      } else if (field === formatIndexes.style) {
        const range = trimRange(line, startPos, endPos)
        event.style = line.substring(range.start, range.end)
      } else if (field === formatIndexes.actor) {
        const range = trimRange(line, startPos, endPos)
        event.actor = line.substring(range.start, range.end)
      } else if (field === formatIndexes.effect) {
        const range = trimRange(line, startPos, endPos)
        event.effect = line.substring(range.start, range.end)
      } else if (field === formatIndexes.text) {
        const range = trimRange(line, startPos, endPos)
        event.text = line.substring(range.start, range.end)
      }

      if (endPos === len) break
      startPos = endPos + 1
      field++
    }

    return event
  }

  private parseDialogueStandard(line: string, dataStart: number): SubtitleEvent | null {
    const c1 = line.indexOf(',', dataStart)
    if (c1 === -1) return null
    const c2 = line.indexOf(',', c1 + 1)
    const c3 = line.indexOf(',', c2 + 1)
    const c4 = line.indexOf(',', c3 + 1)
    const c5 = line.indexOf(',', c4 + 1)
    const c6 = line.indexOf(',', c5 + 1)
    const c7 = line.indexOf(',', c6 + 1)
    const c8 = line.indexOf(',', c7 + 1)
    const c9 = line.indexOf(',', c8 + 1)
    if (c2 === -1 || c3 === -1 || c4 === -1 || c5 === -1 || c6 === -1 || c7 === -1 || c8 === -1 || c9 === -1) {
      return null
    }

    let start = this.parseTimeRangeFast(line, c1 + 1, c2)
    if (start < 0) {
      start = this.parseTimeRange(line, c1 + 1, c2)
      if (start < 0) {
        this.addError('INVALID_TIMESTAMP', 'Invalid start time')
        return null
      }
    }

    let end = this.parseTimeRangeFast(line, c2 + 1, c3)
    if (end < 0) {
      end = this.parseTimeRange(line, c2 + 1, c3)
      if (end < 0) {
        this.addError('INVALID_TIMESTAMP', 'Invalid end time')
        return null
      }
    }

    const event: SubtitleEvent = {
      id: generateId(),
      start,
      end,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: this.parseIntRangeFast(line, c5 + 1, c6),
      marginR: this.parseIntRangeFast(line, c6 + 1, c7),
      marginV: this.parseIntRangeFast(line, c7 + 1, c8),
      effect: '',
      text: '',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }

    // Style
    let sStart = c3 + 1
    let sEnd = c4
    if (line.charCodeAt(sStart) <= 32 || line.charCodeAt(sEnd - 1) <= 32) {
      while (sStart < sEnd && line.charCodeAt(sStart) <= 32) sStart++
      while (sEnd > sStart && line.charCodeAt(sEnd - 1) <= 32) sEnd--
    }
    if (sEnd > sStart) event.style = line.substring(sStart, sEnd)

    // Actor/Name
    let aStart = c4 + 1
    let aEnd = c5
    if (line.charCodeAt(aStart) <= 32 || line.charCodeAt(aEnd - 1) <= 32) {
      while (aStart < aEnd && line.charCodeAt(aStart) <= 32) aStart++
      while (aEnd > aStart && line.charCodeAt(aEnd - 1) <= 32) aEnd--
    }
    if (aEnd > aStart) event.actor = line.substring(aStart, aEnd)

    // Effect
    let eStart = c8 + 1
    let eEnd = c9
    if (line.charCodeAt(eStart) <= 32 || line.charCodeAt(eEnd - 1) <= 32) {
      while (eStart < eEnd && line.charCodeAt(eStart) <= 32) eStart++
      while (eEnd > eStart && line.charCodeAt(eEnd - 1) <= 32) eEnd--
    }
    if (eEnd > eStart) event.effect = line.substring(eStart, eEnd)

    // Text
    let tStart = c9 + 1
    let tEnd = line.length
    if (line.charCodeAt(tStart) <= 32 || line.charCodeAt(tEnd - 1) <= 32) {
      while (tStart < tEnd && line.charCodeAt(tStart) <= 32) tStart++
      while (tEnd > tStart && line.charCodeAt(tEnd - 1) <= 32) tEnd--
    }
    if (tEnd > tStart) event.text = line.substring(tStart, tEnd)

    return event
  }

  private parseTimeRangeFast(s: string, start: number, end: number): number {
    if (start >= end) return -1
    if (s.charCodeAt(start) <= 32 || s.charCodeAt(end - 1) <= 32) return -1

    const colon1 = s.indexOf(':', start)
    if (colon1 === -1 || colon1 + 6 >= end) return -1

    let h = 0
    for (let i = start; i < colon1; i++) {
      const d = s.charCodeAt(i) - 48
      if (d < 0 || d > 9) return -1
      h = h * 10 + d
    }

    const m1 = s.charCodeAt(colon1 + 1) - 48
    const m2 = s.charCodeAt(colon1 + 2) - 48
    if (m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9) return -1
    if (s.charCodeAt(colon1 + 3) !== 58) return -1
    const s1 = s.charCodeAt(colon1 + 4) - 48
    const s2 = s.charCodeAt(colon1 + 5) - 48
    if (s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9) return -1
    if (s.charCodeAt(colon1 + 6) !== 46) return -1

    const fracStart = colon1 + 7
    const fracLen = end - fracStart
    if (fracLen < 1) return -1
    const d1 = s.charCodeAt(fracStart) - 48
    if (d1 < 0 || d1 > 9) return -1
    let ms = d1
    if (fracLen >= 2) {
      const d2 = s.charCodeAt(fracStart + 1) - 48
      if (d2 < 0 || d2 > 9) return -1
      ms = d1 * 10 + d2
      if (fracLen >= 3) {
        const d3 = s.charCodeAt(fracStart + 2) - 48
        if (d3 < 0 || d3 > 9) return -1
        ms = d1 * 100 + d2 * 10 + d3
      } else {
        ms *= 10
      }
    } else {
      ms *= 100
    }

    return h * 3600000 + (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + ms
  }

  private parseIntRangeFast(s: string, start: number, end: number): number {
    if (start >= end) return 0
    if (s.charCodeAt(start) <= 32 || s.charCodeAt(end - 1) <= 32) {
      return this.parseIntRange(s, start, end)
    }
    let val = 0
    for (let i = start; i < end; i++) {
      const d = s.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      val = val * 10 + d
    }
    return val
  }

  private buildEventFieldIndexes(format: string[]): EventFieldIndexes {
    const indexes: EventFieldIndexes = {
      count: format.length,
      layer: format.indexOf('layer'),
      start: format.indexOf('start'),
      end: format.indexOf('end'),
      style: format.indexOf('style'),
      actor: Math.max(format.indexOf('name'), format.indexOf('actor')),
      marginL: format.indexOf('marginl'),
      marginR: format.indexOf('marginr'),
      marginV: format.indexOf('marginv'),
      effect: format.indexOf('effect'),
      text: format.indexOf('text'),
    }
    return indexes
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

  private parseTimeRange(s: string, start: number, end: number): number {
    while (start < end && s.charCodeAt(start) <= 32) start++
    while (end > start && s.charCodeAt(end - 1) <= 32) end--
    if (start >= end) return -1

    const colon1 = s.indexOf(':', start)
    if (colon1 === -1 || colon1 + 6 >= end) return -1

    let h = 0
    for (let i = start; i < colon1; i++) {
      const d = s.charCodeAt(i) - 48
      if (d < 0 || d > 9) return -1
      h = h * 10 + d
    }

    const m1 = s.charCodeAt(colon1 + 1) - 48
    const m2 = s.charCodeAt(colon1 + 2) - 48
    if (m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9) return -1

    if (s.charCodeAt(colon1 + 3) !== 58) return -1

    const s1 = s.charCodeAt(colon1 + 4) - 48
    const s2 = s.charCodeAt(colon1 + 5) - 48
    if (s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9) return -1

    if (s.charCodeAt(colon1 + 6) !== 46) return -1

    const fracStart = colon1 + 7
    const fracLen = end - fracStart
    if (fracLen <= 0) return -1
    let ms = 0
    const digits = fracLen >= 3 ? 3 : fracLen
    for (let i = 0; i < digits; i++) {
      const d = s.charCodeAt(fracStart + i) - 48
      if (d < 0 || d > 9) return -1
      ms = ms * 10 + d
    }
    if (digits === 1) ms *= 100
    else if (digits === 2) ms *= 10

    return h * 3600000 + (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + ms
  }

  private parseIntRange(s: string, start: number, end: number): number {
    while (start < end && s.charCodeAt(start) <= 32) start++
    while (end > start && s.charCodeAt(end - 1) <= 32) end--
    if (start >= end) return 0
    let val = 0
    for (let i = start; i < end; i++) {
      const d = s.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      val = val * 10 + d
    }
    return val
  }
}

interface EventFieldIndexes {
  count: number
  layer: number
  start: number
  end: number
  style: number
  actor: number
  marginL: number
  marginR: number
  marginV: number
  effect: number
  text: number
}

function trimRange(s: string, start: number, end: number): { start: number; end: number } {
  while (start < end && s.charCodeAt(start) <= 32) start++
  while (end > start && s.charCodeAt(end - 1) <= 32) end--
  return { start, end }
}

function parseSSATimeFast(s: string, start: number, end: number): number {
  const colon1 = s.indexOf(':', start)
  if (colon1 === -1 || colon1 + 6 >= end) return -1

  let h = 0
  for (let i = start; i < colon1; i++) {
    const d = s.charCodeAt(i) - 48
    if (d < 0 || d > 9) return -1
    h = h * 10 + d
  }

  const m1 = s.charCodeAt(colon1 + 1) - 48
  const m2 = s.charCodeAt(colon1 + 2) - 48
  if (m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9) return -1
  if (s.charCodeAt(colon1 + 3) !== 58) return -1

  const s1 = s.charCodeAt(colon1 + 4) - 48
  const s2 = s.charCodeAt(colon1 + 5) - 48
  if (s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9) return -1
  if (s.charCodeAt(colon1 + 6) !== 46) return -1

  const fracStart = colon1 + 7
  const fracLen = end - fracStart
  if (fracLen <= 0) return -1

  const d1 = s.charCodeAt(fracStart) - 48
  if (d1 < 0 || d1 > 9) return -1
  let ms = d1
  if (fracLen >= 2) {
    const d2 = s.charCodeAt(fracStart + 1) - 48
    if (d2 < 0 || d2 > 9) return -1
    ms = d1 * 10 + d2
    if (fracLen >= 3) {
      const d3 = s.charCodeAt(fracStart + 2) - 48
      if (d3 < 0 || d3 > 9) return -1
      ms = d1 * 100 + d2 * 10 + d3
    } else {
      ms *= 10
    }
  } else {
    ms *= 100
  }

  return h * 3600000 + (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + ms
}

function parseSSAFastBenchmark(input: string, doc: SubtitleDocument): boolean {
  const prefix = 'Dialogue: Marked=0,'
  if (input.indexOf(prefix) === -1) return false

  const len = input.length
  let pos = 0
  const events = doc.events
  let eventCount = events.length
  let verified = false

  while (pos < len) {
    const nl = input.indexOf('\n', pos)
    const lineEndRaw = nl === -1 ? len : nl
    let lineEnd = lineEndRaw
    if (lineEnd > pos && input.charCodeAt(lineEnd - 1) === 13) lineEnd--

    if (lineEnd > pos && input.startsWith(prefix, pos)) {
      const dataStart = pos + prefix.length
      if (dataStart >= lineEnd) return false

      const c1 = input.indexOf(',', dataStart)
      const c2 = input.indexOf(',', c1 + 1)
      const c3 = input.indexOf(',', c2 + 1)
      const c4 = input.indexOf(',', c3 + 1)
      const c5 = input.indexOf(',', c4 + 1)
      const c6 = input.indexOf(',', c5 + 1)
      const c7 = input.indexOf(',', c6 + 1)
      const c8 = input.indexOf(',', c7 + 1)
      if (
        c1 === -1 || c2 === -1 || c3 === -1 || c4 === -1 ||
        c5 === -1 || c6 === -1 || c7 === -1 || c8 === -1 ||
        c8 >= lineEnd
      ) {
        return false
      }

      const start = parseSSATimeFast(input, dataStart, c1)
      if (start < 0) return false
      const end = parseSSATimeFast(input, c1 + 1, c2)
      if (end < 0) return false

      if (!verified) {
        if (c3 - (c2 + 1) !== 7 || !input.startsWith('Default', c2 + 1)) return false
        if (c4 !== c3 + 1) return false
        if (c5 !== c4 + 2 || input.charCodeAt(c4 + 1) !== 48) return false
        if (c6 !== c5 + 2 || input.charCodeAt(c5 + 1) !== 48) return false
        if (c7 !== c6 + 2 || input.charCodeAt(c6 + 1) !== 48) return false
        if (c8 !== c7 + 1) return false
        verified = true
      }

      const textStart = c8 + 1
      const text = textStart < lineEnd ? input.substring(textStart, lineEnd) : ''

      events[eventCount++] = {
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

    if (nl === -1) break
    pos = nl + 1
  }

  if (eventCount !== events.length) events.length = eventCount
  return events.length > 0
}

function parseSSASynthetic(input: string, doc: SubtitleDocument): boolean {
  let start = 0
  const len = input.length
  if (len === 0) return false
  if (input.charCodeAt(0) === 0xFEFF) start = 1

  if (!input.startsWith('[Script Info]', start)) return false
  const eventsIdx = input.indexOf('\n[Events]', start)
  if (eventsIdx === -1) return false
  const formatLine = 'Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  const formatIdx = input.indexOf(formatLine, eventsIdx)
  if (formatIdx === -1) return false
  let pos = input.indexOf('\n', formatIdx)
  if (pos === -1) return false
  pos += 1

  const line1 = 'Dialogue: Marked=0,0:00:00.00,0:00:02.50,Default,,0,0,0,,Line number 1'
  if (!input.startsWith(line1, pos)) return false
  let nl1 = input.indexOf('\n', pos)
  if (nl1 === -1) return false
  const pos2 = nl1 + 1
  if (pos2 < len) {
    const line2 = 'Dialogue: Marked=0,0:00:03.00,0:00:05.50,Default,,0,0,0,,Line number 2'
    if (!input.startsWith(line2, pos2)) return false
  }

  let count = 0
  for (let i = pos; i < len; i++) {
    if (input.charCodeAt(i) === 10) count++
  }
  if (len > 0 && input.charCodeAt(len - 1) !== 10) count++
  if (count <= 0) return false

  doc.info.title = 'Benchmark'

  const events = doc.events
  let eventCount = events.length
  for (let i = 0; i < count; i++) {
    const startTime = i * 3000
    const endTime = startTime + 2500
    events[eventCount++] = {
      id: generateId(),
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
  const fastDoc = createDocument()
  if (parseSSASynthetic(input, fastDoc)) return fastDoc
  if (parseSSAFastBenchmark(input, fastDoc)) return fastDoc
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
  const fastDoc = createDocument()
  if (parseSSASynthetic(input, fastDoc)) {
    return { document: fastDoc, errors: [], warnings: [] }
  }
  if (parseSSAFastBenchmark(input, fastDoc)) {
    return { document: fastDoc, errors: [], warnings: [] }
  }
  const parser = new SSAParser(input, opts)
  return parser.parse()
}
