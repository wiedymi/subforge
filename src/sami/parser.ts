import type { SubtitleDocument, SubtitleEvent, TextSegment, InlineStyle, Style } from '../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../core/errors.ts'
import { SubforgeError } from '../core/errors.ts'
import { createDocument, generateId, createDefaultStyle } from '../core/document.ts'
import { parseCSS, styleFromClass, type SAMIClass } from './css.ts'

interface SyncPoint {
  start: number
  text: string
  className?: string
}

class SAMIParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1
  private classes = new Map<string, SAMIClass>()

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
    // Extract CSS styles from <STYLE> block (single pass)
    this.extractStyles()

    // Parse SYNC points (single pass, no regex)
    this.parseSyncPoints()

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private extractStyles(): void {
    // Find <STYLE> block using indexOf (faster than regex)
    const styleStart = this.src.indexOf('<STYLE')
    if (styleStart === -1) return

    const styleEnd = this.src.indexOf('</STYLE>', styleStart)
    if (styleEnd === -1) return

    const cssBlock = this.src.substring(styleStart, styleEnd + 8)
    this.classes = parseCSS(cssBlock)

    // Create styles from classes
    const classEntries = Array.from(this.classes.entries())
    const classLen = classEntries.length
    for (let i = 0; i < classLen; i++) {
      const [className, classObj] = classEntries[i]
      const baseStyle = createDefaultStyle()
      const styleProps = styleFromClass(classObj, baseStyle)

      const style: Style = {
        ...baseStyle,
        ...styleProps,
        name: className
      }

      this.doc.styles.set(className, style)
    }
  }

  private parseSyncPoints(): void {
    // Single-pass parsing using indexOf (case-insensitive for SYNC)
    let searchPos = 0
    const srcUpper = this.src.toUpperCase()

    while (searchPos < this.len) {
      // Find next <SYNC (case insensitive)
      const syncPos = srcUpper.indexOf('<SYNC', searchPos)
      if (syncPos === -1) break

      // Find Start= attribute (case insensitive)
      const startAttrPos = srcUpper.indexOf('START', syncPos)
      if (startAttrPos === -1 || startAttrPos > syncPos + 50) {
        searchPos = syncPos + 5
        continue
      }

      // Find the = sign
      const eqPos = this.src.indexOf('=', startAttrPos)
      if (eqPos === -1 || eqPos > startAttrPos + 10) {
        searchPos = syncPos + 5
        continue
      }

      // Parse the number
      let numStart = eqPos + 1
      while (numStart < this.len && (this.src.charCodeAt(numStart) === 32 || this.src.charCodeAt(numStart) === 9)) {
        numStart++
      }

      let numEnd = numStart
      while (numEnd < this.len) {
        const c = this.src.charCodeAt(numEnd)
        if (c < 48 || c > 57) break // Not a digit
        numEnd++
      }

      const timeMs = parseInt(this.src.substring(numStart, numEnd), 10)

      // Find end of SYNC tag
      const syncTagEnd = this.src.indexOf('>', syncPos)
      if (syncTagEnd === -1) break

      // Find <P or <p tag (case insensitive)
      let pStart = syncTagEnd + 1
      while (pStart < this.len && this.src.charCodeAt(pStart) <= 32) pStart++

      const char1 = this.src.charCodeAt(pStart)
      const char2 = this.src.charCodeAt(pStart + 1)
      if (char1 !== 60 || (char2 !== 80 && char2 !== 112)) { // <P or <p
        searchPos = syncTagEnd + 1
        continue
      }

      // Find Class attribute (case insensitive)
      const classPos = srcUpper.indexOf('CLASS', pStart)
      let className: string | undefined
      if (classPos !== -1 && classPos < pStart + 100) {
        const classEq = this.src.indexOf('=', classPos)
        if (classEq !== -1) {
          let classStart = classEq + 1
          while (classStart < this.len && (this.src.charCodeAt(classStart) === 32 || this.src.charCodeAt(classStart) === 9)) {
            classStart++
          }

          let classEnd = classStart
          while (classEnd < this.len) {
            const c = this.src.charCodeAt(classEnd)
            if (c === 32 || c === 9 || c === 62 || c === 47) break
            classEnd++
          }

          className = this.src.substring(classStart, classEnd).toUpperCase()
        }
      }

      // Find end of P opening tag
      const pTagEnd = this.src.indexOf('>', pStart)
      if (pTagEnd === -1) break

      // Extract text until next <SYNC or </BODY>
      const nextSync = this.src.indexOf('<SYNC', pTagEnd + 1)
      const bodyEnd = this.src.indexOf('</BODY>', pTagEnd + 1)

      let contentEnd = this.len
      if (nextSync !== -1 && (bodyEnd === -1 || nextSync < bodyEnd)) {
        contentEnd = nextSync
      } else if (bodyEnd !== -1) {
        contentEnd = bodyEnd
      }

      // Find </P> tag
      const pClose = this.src.indexOf('</P>', pTagEnd)
      if (pClose !== -1 && pClose < contentEnd) {
        contentEnd = pClose
      }

      const text = this.src.substring(pTagEnd + 1, contentEnd).trim()

      // Skip empty markers
      if (text !== '&nbsp;' && text !== '') {
        // Find next SYNC for end time
        const nextSyncForEnd = srcUpper.indexOf('<SYNC', pTagEnd + 1)
        let endTime = timeMs + 5000

        if (nextSyncForEnd !== -1) {
          const nextStartPos = srcUpper.indexOf('START', nextSyncForEnd)
          if (nextStartPos !== -1) {
            const nextEq = this.src.indexOf('=', nextStartPos)
            if (nextEq !== -1) {
              let nextNumStart = nextEq + 1
              while (nextNumStart < this.len && (this.src.charCodeAt(nextNumStart) === 32 || this.src.charCodeAt(nextNumStart) === 9)) {
                nextNumStart++
              }
              let nextNumEnd = nextNumStart
              while (nextNumEnd < this.len) {
                const c = this.src.charCodeAt(nextNumEnd)
                if (c < 48 || c > 57) break
                nextNumEnd++
              }
              endTime = parseInt(this.src.substring(nextNumStart, nextNumEnd), 10)
            }
          }
        }

        // Parse inline HTML tags if present
        const segments = text.includes('<') ? this.parseTags(text) : []
        const plainText = this.stripTags(text)

        const event: SubtitleEvent = {
          id: generateId(),
          start: timeMs,
          end: endTime,
          layer: 0,
          style: className || 'Default',
          actor: '',
          marginL: 0,
          marginR: 0,
          marginV: 0,
          effect: '',
          text: plainText,
          segments,
          dirty: segments.length > 0
        }

        this.doc.events.push(event)
      }

      searchPos = syncTagEnd + 1
    }
  }

  private parseTags(raw: string): TextSegment[] {
    // Check if there are any tags in the text
    if (!raw.includes('<')) {
      return []
    }

    const segments: TextSegment[] = []
    const stateStack: InlineStyle[] = [{}]

    let textStart = 0
    let i = 0
    const rawLen = raw.length

    while (i < rawLen) {
      if (raw.charCodeAt(i) === 60) { // <
        const closeIdx = raw.indexOf('>', i)
        if (closeIdx === -1) {
          i++
          continue
        }

        if (i > textStart) {
          const state = stateStack[stateStack.length - 1]!
          const style = Object.keys(state).length > 0 ? { ...state } : null
          const text = this.decodeHTML(raw.slice(textStart, i))
          segments.push({
            text,
            style,
            effects: []
          })
        }

        const tag = raw.slice(i + 1, closeIdx)
        this.processTag(tag, stateStack)

        i = closeIdx + 1
        textStart = i
      } else {
        i++
      }
    }

    if (textStart < rawLen) {
      const state = stateStack[stateStack.length - 1]!
      const style = Object.keys(state).length > 0 ? { ...state } : null
      const text = this.decodeHTML(raw.slice(textStart))
      segments.push({
        text,
        style,
        effects: []
      })
    }

    return segments
  }

  private processTag(tag: string, stateStack: InlineStyle[]): void {
    const tagLower = tag.toLowerCase().trim()
    const currentState = stateStack[stateStack.length - 1]!

    if (tagLower === 'b') {
      stateStack.push({ ...currentState, bold: true })
    } else if (tagLower === '/b') {
      if (stateStack.length > 1) stateStack.pop()
    } else if (tagLower === 'i') {
      stateStack.push({ ...currentState, italic: true })
    } else if (tagLower === '/i') {
      if (stateStack.length > 1) stateStack.pop()
    } else if (tagLower === 'u') {
      stateStack.push({ ...currentState, underline: true })
    } else if (tagLower === '/u') {
      if (stateStack.length > 1) stateStack.pop()
    } else if (tagLower === 's') {
      stateStack.push({ ...currentState, strikeout: true })
    } else if (tagLower === '/s') {
      if (stateStack.length > 1) stateStack.pop()
    } else if (tagLower.startsWith('font')) {
      // Use indexOf instead of regex for color
      const colorIdx = tag.indexOf('color')
      if (colorIdx !== -1) {
        const colorStart = tag.indexOf('"', colorIdx)
        if (colorStart !== -1) {
          const colorEnd = tag.indexOf('"', colorStart + 1)
          if (colorEnd !== -1) {
            const colorValue = tag.substring(colorStart + 1, colorEnd)
            const color = this.parseColorFast(colorValue)
            stateStack.push({ ...currentState, primaryColor: color })
            return
          }
        }
      }
      stateStack.push({ ...currentState })
    } else if (tagLower === '/font') {
      if (stateStack.length > 1) stateStack.pop()
    }
  }

  private parseColorFast(value: string): number {
    // Fast hex color parsing
    if (value.charCodeAt(0) === 35) { // #
      const hex = value.substring(1)
      const hexLen = hex.length
      if (hexLen === 6) {
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        return ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)
      }
    }
    return 0x00FFFFFF
  }

  private decodeHTML(text: string): string {
    // Fast HTML entity decoding (only common entities)
    if (!text.includes('&')) return text

    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
  }

  private stripTags(raw: string): string {
    if (!raw.includes('<')) return this.decodeHTML(raw)

    let result = ''
    let i = 0
    const rawLen = raw.length

    while (i < rawLen) {
      if (raw.charCodeAt(i) === 60) { // <
        const closeIdx = raw.indexOf('>', i)
        if (closeIdx === -1) {
          result += raw.substring(i)
          break
        }
        i = closeIdx + 1
      } else {
        result += raw.charAt(i)
        i++
      }
    }

    return this.decodeHTML(result)
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: this.lineNum, column: 1 })
    }
    this.errors.push({ line: this.lineNum, column: 1, code, message, raw })
  }
}

export function parseSAMI(input: string): SubtitleDocument {
  const parser = new SAMIParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

export function parseSAMIResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new SAMIParser(input, opts)
  return parser.parse()
}
