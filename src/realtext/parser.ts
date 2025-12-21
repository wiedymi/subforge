import type { SubtitleDocument, SubtitleEvent } from '../core/types.ts'
import type { ParseOptions, ParseResult, ParseError } from '../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../core/document.ts'
import { parseTime } from './time.ts'

/**
 * Simple XML token types for RealText parsing
 */
type Token =
  | { type: 'open', name: string, attrs: Record<string, string>, selfClosing: boolean }
  | { type: 'close', name: string }
  | { type: 'text', content: string }

class RealTextParser {
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions

  constructor(opts: Partial<ParseOptions> = {}) {
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
  }

  parse(input: string): ParseResult {
    // Handle BOM
    let src = input
    if (src.charCodeAt(0) === 0xFEFF) {
      src = src.slice(1)
    }

    // Tokenize XML
    const tokens = this.tokenize(src)

    // Check for window element
    const hasWindow = tokens.some(t => t.type === 'open' && t.name === 'window')
    if (!hasWindow) {
      this.errors.push({
        line: 1,
        column: 1,
        code: 'INVALID_FORMAT',
        message: 'Missing <window> element'
      })
      return { document: this.doc, errors: this.errors, warnings: [] }
    }

    // Find window element and parse content
    let inWindow = false
    let currentTime = 0
    let currentText = ''
    let hasContent = false

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!

      if (token.type === 'open' && token.name === 'window') {
        inWindow = true
      } else if (token.type === 'close' && token.name === 'window') {
        // Add final subtitle if exists
        if (hasContent && currentText.trim()) {
          this.addEvent(currentTime, currentText.trim())
        }
        break
      } else if (inWindow) {
        if (token.type === 'open' && token.name === 'time') {
          // Save previous subtitle if exists
          if (hasContent && currentText.trim()) {
            this.addEvent(currentTime, currentText.trim())
          }

          // Get new time
          if (token.attrs.begin) {
            currentTime = parseTime(token.attrs.begin)
          }
          currentText = ''
          hasContent = false
        } else if (token.type === 'open' && token.name === 'clear') {
          // clear tag marks end of current subtitle
          if (hasContent && currentText.trim()) {
            this.addEvent(currentTime, currentText.trim())
          }
          currentText = ''
          hasContent = false
        } else if (token.type === 'open' && token.name === 'br') {
          currentText += '\n'
        } else if (token.type === 'open' && token.name === 'b') {
          currentText += '<b>'
        } else if (token.type === 'close' && token.name === 'b') {
          currentText += '</b>'
        } else if (token.type === 'open' && token.name === 'i') {
          currentText += '<i>'
        } else if (token.type === 'close' && token.name === 'i') {
          currentText += '</i>'
        } else if (token.type === 'open' && token.name === 'u') {
          currentText += '<u>'
        } else if (token.type === 'close' && token.name === 'u') {
          currentText += '</u>'
        } else if (token.type === 'open' && token.name === 'font') {
          if (token.attrs.color) {
            currentText += `<font color="${token.attrs.color}">`
          } else {
            currentText += '<font>'
          }
        } else if (token.type === 'close' && token.name === 'font') {
          currentText += '</font>'
        } else if (token.type === 'text') {
          currentText += token.content
          if (token.content.trim()) {
            hasContent = true
          }
        }
        // center and pos tags are ignored but their content is preserved
      }
    }

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private tokenize(src: string): Token[] {
    const tokens: Token[] = []
    let pos = 0
    const len = src.length

    while (pos < len) {
      // Look for tag start
      const tagStart = src.indexOf('<', pos)

      if (tagStart === -1) {
        // No more tags, rest is text
        const text = src.slice(pos)
        if (text.trim()) {
          tokens.push({ type: 'text', content: text })
        }
        break
      }

      // Add text before tag
      if (tagStart > pos) {
        const text = src.slice(pos, tagStart)
        tokens.push({ type: 'text', content: text })
      }

      // Find tag end
      const tagEnd = src.indexOf('>', tagStart)
      if (tagEnd === -1) {
        // Malformed XML
        break
      }

      const tagContent = src.slice(tagStart + 1, tagEnd)

      // Check if closing tag
      if (tagContent.startsWith('/')) {
        const name = tagContent.slice(1).trim().toLowerCase()
        tokens.push({ type: 'close', name })
      } else {
        // Opening tag or self-closing
        const selfClosing = tagContent.endsWith('/')
        const attrStart = tagContent.indexOf(' ')

        let name: string
        let attrStr = ''

        if (attrStart === -1) {
          name = (selfClosing ? tagContent.slice(0, -1) : tagContent).trim().toLowerCase()
        } else {
          name = tagContent.slice(0, attrStart).trim().toLowerCase()
          attrStr = selfClosing ? tagContent.slice(attrStart + 1, -1) : tagContent.slice(attrStart + 1)
        }

        // Parse attributes
        const attrs: Record<string, string> = {}
        const attrRegex = /(\w+)="([^"]*)"/g
        let match
        while ((match = attrRegex.exec(attrStr)) !== null) {
          attrs[match[1]!] = match[2]!
        }

        tokens.push({ type: 'open', name, attrs, selfClosing })
      }

      pos = tagEnd + 1
    }

    return tokens
  }

  private addEvent(startTime: number, text: string): void {
    // Find end time from next event or use a default duration
    const nextEventIndex = this.doc.events.length
    let endTime = startTime + 5000 // Default 5 second duration

    // If there's a next event, we'll update the previous event's end time
    if (nextEventIndex > 0) {
      const prevEvent = this.doc.events[nextEventIndex - 1]!
      prevEvent.end = startTime
    }

    const event: SubtitleEvent = {
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
      text,
      segments: EMPTY_SEGMENTS,
      dirty: false
    }

    this.doc.events.push(event)
  }
}

/**
 * Parse RealText format subtitle file
 *
 * RealText is a RealNetworks format for streaming subtitles.
 * It uses XML-like markup with time tags for synchronization.
 *
 * @param input - RealText file content as string
 * @returns Parsed subtitle document
 * @throws {Error} If parsing fails
 *
 * @example
 * ```ts
 * const rt = `<window duration="00:05:00.00">
 * <time begin="00:00:01.00"/>
 * <clear/>Hello world
 * </window>`
 * const doc = parseRealText(rt)
 * ```
 */
export function parseRealText(input: string): SubtitleDocument {
  const parser = new RealTextParser({ onError: 'throw' })
  const result = parser.parse(input)
  if (result.errors.length > 0) {
    throw new Error(result.errors[0]!.message)
  }
  return result.document
}

/**
 * Parse RealText format with detailed error reporting
 *
 * @param input - RealText file content as string
 * @param opts - Parsing options
 * @returns Parse result containing document, errors, and warnings
 *
 * @example
 * ```ts
 * const result = parseRealTextResult(rtContent, { onError: 'collect' })
 * if (result.errors.length > 0) {
 *   console.error('Parsing errors:', result.errors)
 * }
 * ```
 */
export function parseRealTextResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new RealTextParser(opts)
  return parser.parse(input)
}
