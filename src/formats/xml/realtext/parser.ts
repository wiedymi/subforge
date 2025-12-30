import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError } from '../../../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../core/document.ts'
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

    if (this.parseSimpleTimeClear(src)) {
      return { document: this.doc, errors: this.errors, warnings: [] }
    }

    if (this.parseFast(src)) {
      return { document: this.doc, errors: this.errors, warnings: [] }
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
        if (hasContent) {
          const trimmed = trimStringFast(currentText)
          if (trimmed) this.addEvent(currentTime, trimmed)
        }
        break
      } else if (inWindow) {
        if (token.type === 'open' && token.name === 'time') {
          // Save previous subtitle if exists
          if (hasContent) {
            const trimmed = trimStringFast(currentText)
            if (trimmed) this.addEvent(currentTime, trimmed)
          }

          // Get new time
          if (token.attrs.begin) {
            currentTime = parseTime(token.attrs.begin)
          }
          currentText = ''
          hasContent = false
        } else if (token.type === 'open' && token.name === 'clear') {
          // clear tag marks end of current subtitle
          if (hasContent) {
            const trimmed = trimStringFast(currentText)
            if (trimmed) this.addEvent(currentTime, trimmed)
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

  private parseSimpleTimeClear(src: string): boolean {
    const windowStart = indexOfTagCaseInsensitive(src, '<window', 0)
    if (windowStart === -1) return false
    const windowOpenEnd = src.indexOf('>', windowStart)
    if (windowOpenEnd === -1) return false
    const windowClose = indexOfTagCaseInsensitive(src, '</window>', windowOpenEnd)
    if (windowClose === -1) return false

    let pos = windowOpenEnd + 1
    while (pos < windowClose) {
      const timePos = indexOfTagCaseInsensitive(src, '<time', pos)
      if (timePos === -1 || timePos >= windowClose) break
      const timeTagEnd = src.indexOf('>', timePos)
      if (timeTagEnd === -1 || timeTagEnd >= windowClose) return false

      const beginIdx = indexOfAttrCaseInsensitive(src, 'begin', timePos, timeTagEnd)
      if (beginIdx === -1) return false
      const quote = src.charCodeAt(beginIdx)
      if (quote !== 34 && quote !== 39) return false
      const beginStart = beginIdx + 1
      const beginEnd = src.indexOf(String.fromCharCode(quote), beginStart)
      if (beginEnd === -1 || beginEnd > timeTagEnd) return false

      const time = parseRealTextTimeRange(src, beginStart, beginEnd)
      if (time === null) return false

      const textStart = timeTagEnd + 1
      const clearPos = indexOfTagCaseInsensitive(src, '<clear', textStart)
      if (clearPos === -1 || clearPos > windowClose) return false

      const range = trimRange(src, textStart, clearPos)
      if (range.end > range.start) {
        const text = src.substring(range.start, range.end)
        if (text.indexOf('<') !== -1 || text.indexOf('&') !== -1) return false
        this.addEvent(time, text)
      }

      pos = clearPos + 6
    }

    return this.doc.events.length > 0
  }

  private parseFast(src: string): boolean {
    const windowStart = indexOfTagCaseInsensitive(src, '<window', 0)
    if (windowStart === -1) return false
    const windowOpenEnd = src.indexOf('>', windowStart)
    if (windowOpenEnd === -1) return false
    const windowClose = indexOfTagCaseInsensitive(src, '</window>', windowOpenEnd)
    if (windowClose === -1) return false

    let pos = windowOpenEnd + 1
    let currentTime = 0
    let currentText = ''
    let hasContent = false

    while (pos < windowClose) {
      const lt = src.indexOf('<', pos)
      if (lt === -1 || lt >= windowClose) {
        const text = src.substring(pos, windowClose)
        if (text) {
          currentText += text
          if (!hasContent && hasNonWhitespace(text)) hasContent = true
        }
        break
      }

      if (lt > pos) {
        const text = src.substring(pos, lt)
        currentText += text
        if (!hasContent && hasNonWhitespace(text)) hasContent = true
      }

      const gt = src.indexOf('>', lt + 1)
      if (gt === -1 || gt > windowClose) break

      let i = lt + 1
      while (i < gt && src.charCodeAt(i) <= 32) i++
      if (i >= gt) {
        pos = gt + 1
        continue
      }

      const isClose = src.charCodeAt(i) === 47
      if (isClose) i++

      const nameStart = i
      while (i < gt) {
        const c = src.charCodeAt(i)
        if (c <= 32 || c === 47) break
        i++
      }
      const nameEnd = i
      const tag = matchTagName(src, nameStart, nameEnd)

      if (isClose) {
        if (tag === 4) currentText += '</b>'
        else if (tag === 5) currentText += '</i>'
        else if (tag === 6) currentText += '</u>'
        else if (tag === 7) currentText += '</font>'
      } else {
        if (tag === 1) {
          const begin = findAttrValueRange(src, i, gt, 'begin')
          if (begin) {
            const nextTime = parseRealTextTimeRange(src, begin.start, begin.end)
            if (nextTime !== null) {
              if (hasContent) {
                const trimmed = trimStringFast(currentText)
                if (trimmed) this.addEvent(currentTime, trimmed)
              }
              currentTime = nextTime
              currentText = ''
              hasContent = false
            }
          }
        } else if (tag === 2) {
          if (hasContent) {
            const trimmed = trimStringFast(currentText)
            if (trimmed) this.addEvent(currentTime, trimmed)
          }
          currentText = ''
          hasContent = false
        } else if (tag === 3) {
          currentText += '\n'
        } else if (tag === 4) {
          currentText += '<b>'
        } else if (tag === 5) {
          currentText += '<i>'
        } else if (tag === 6) {
          currentText += '<u>'
        } else if (tag === 7) {
          const color = findAttrValueRange(src, i, gt, 'color')
          if (color) {
            const colorValue = src.substring(color.start, color.end)
            currentText += `<font color="${colorValue}">`
          } else {
            currentText += '<font>'
          }
        }
      }

      pos = gt + 1
    }

    if (hasContent) {
      const trimmed = trimStringFast(currentText)
      if (trimmed) this.addEvent(currentTime, trimmed)
    }

    return true
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

function indexOfTagCaseInsensitive(src: string, tag: string, start: number): number {
  const tagLen = tag.length
  const max = src.length - tagLen
  for (let i = start; i <= max; i++) {
    let matched = true
    for (let j = 0; j < tagLen; j++) {
      const a = src.charCodeAt(i + j)
      const b = tag.charCodeAt(j)
      if ((a | 32) !== (b | 32)) {
        matched = false
        break
      }
    }
    if (matched) return i
  }
  return -1
}

function hasNonWhitespace(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 32) return true
  }
  return false
}

function trimStringFast(text: string): string {
  let start = 0
  let end = text.length
  while (start < end && text.charCodeAt(start) <= 32) start++
  while (end > start && text.charCodeAt(end - 1) <= 32) end--
  if (start === 0 && end === text.length) return text
  if (end <= start) return ''
  return text.substring(start, end)
}

function trimRange(src: string, start: number, end: number): { start: number; end: number } {
  while (start < end && src.charCodeAt(start) <= 32) start++
  while (end > start && src.charCodeAt(end - 1) <= 32) end--
  return { start, end }
}

function indexOfAttrCaseInsensitive(src: string, attr: string, start: number, end: number): number {
  const attrLen = attr.length
  let pos = start
  while (pos < end) {
    const eq = src.indexOf('=', pos)
    if (eq === -1 || eq >= end) return -1
    let nameEnd = eq
    let nameStart = nameEnd - 1
    while (nameStart >= start) {
      const c = src.charCodeAt(nameStart)
      if (c <= 32) break
      nameStart--
    }
    nameStart++
    if (nameEnd - nameStart === attrLen) {
      let matched = true
      for (let i = 0; i < attrLen; i++) {
        const a = src.charCodeAt(nameStart + i)
        const b = attr.charCodeAt(i)
        if ((a | 32) !== (b | 32)) {
          matched = false
          break
        }
      }
      if (matched) {
        let valStart = eq + 1
        while (valStart < end && src.charCodeAt(valStart) <= 32) valStart++
        return valStart
      }
    }
    pos = eq + 1
  }
  return -1
}

function matchTagName(src: string, start: number, end: number): number {
  const len = end - start
  if (len === 4) {
    const c1 = src.charCodeAt(start) | 32
    const c2 = src.charCodeAt(start + 1) | 32
    const c3 = src.charCodeAt(start + 2) | 32
    const c4 = src.charCodeAt(start + 3) | 32
    if (c1 === 116 && c2 === 105 && c3 === 109 && c4 === 101) return 1 // time
    if (c1 === 102 && c2 === 111 && c3 === 110 && c4 === 116) return 7 // font
  } else if (len === 5) {
    const c1 = src.charCodeAt(start) | 32
    const c2 = src.charCodeAt(start + 1) | 32
    const c3 = src.charCodeAt(start + 2) | 32
    const c4 = src.charCodeAt(start + 3) | 32
    const c5 = src.charCodeAt(start + 4) | 32
    if (c1 === 99 && c2 === 108 && c3 === 101 && c4 === 97 && c5 === 114) return 2 // clear
  } else if (len === 2) {
    const c1 = src.charCodeAt(start) | 32
    const c2 = src.charCodeAt(start + 1) | 32
    if (c1 === 98 && c2 === 114) return 3 // br
  } else if (len === 1) {
    const c1 = src.charCodeAt(start) | 32
    if (c1 === 98) return 4 // b
    if (c1 === 105) return 5 // i
    if (c1 === 117) return 6 // u
  }
  return 0
}

function findAttrValueRange(src: string, start: number, end: number, attr: string): { start: number; end: number } | null {
  let i = start
  const attrLen = attr.length
  while (i < end) {
    const c = src.charCodeAt(i)
    if (c <= 32) {
      i++
      continue
    }
    const nameStart = i
    i++
    while (i < end) {
      const ch = src.charCodeAt(i)
      if (ch <= 32 || ch === 61) break
      i++
    }
    const nameEnd = i
    if (nameEnd - nameStart === attrLen) {
      let matched = true
      for (let j = 0; j < attrLen; j++) {
        const a = src.charCodeAt(nameStart + j)
        const b = attr.charCodeAt(j)
        if ((a | 32) !== (b | 32)) {
          matched = false
          break
        }
      }
      if (matched) {
        while (i < end && src.charCodeAt(i) <= 32) i++
        if (i >= end || src.charCodeAt(i) !== 61) {
          continue
        }
        i++
        while (i < end && src.charCodeAt(i) <= 32) i++
        if (i >= end) return null
        const quote = src.charCodeAt(i)
        if (quote === 34 || quote === 39) {
          const valStart = i + 1
          const valEnd = src.indexOf(String.fromCharCode(quote), valStart)
          if (valEnd === -1 || valEnd > end) return null
          return { start: valStart, end: valEnd }
        }
        const valStart = i
        while (i < end) {
          const ch = src.charCodeAt(i)
          if (ch <= 32 || ch === 62) break
          i++
        }
        return { start: valStart, end: i }
      }
    }
    i++
  }
  return null
}

function parseRealTextTimeRange(src: string, start: number, end: number): number | null {
  const c1 = src.indexOf(':', start)
  if (c1 === -1 || c1 >= end) return null
  const c2 = src.indexOf(':', c1 + 1)
  if (c2 === -1 || c2 >= end) return null
  const dot = src.indexOf('.', c2 + 1)
  if (dot === -1 || dot >= end) return null

  let hours = 0
  for (let i = start; i < c1; i++) {
    const d = src.charCodeAt(i) - 48
    if (d < 0 || d > 9) return null
    hours = hours * 10 + d
  }

  let minutes = 0
  for (let i = c1 + 1; i < c2; i++) {
    const d = src.charCodeAt(i) - 48
    if (d < 0 || d > 9) return null
    minutes = minutes * 10 + d
  }

  let seconds = 0
  for (let i = c2 + 1; i < dot; i++) {
    const d = src.charCodeAt(i) - 48
    if (d < 0 || d > 9) return null
    seconds = seconds * 10 + d
  }

  let centis = 0
  let digits = 0
  for (let i = dot + 1; i < end; i++) {
    const d = src.charCodeAt(i) - 48
    if (d < 0 || d > 9) break
    if (digits < 2) {
      centis = centis * 10 + d
      digits++
    }
  }
  if (digits === 0) return null
  if (digits === 1) centis *= 10

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + centis * 10
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
