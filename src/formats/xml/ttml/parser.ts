import type { SubtitleDocument, SubtitleEvent, Style, InlineStyle, TextSegment } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../core/document.ts'
import { parseTime, parseDuration } from './time.ts'
import { parseXML, querySelector, querySelectorAll, getAttribute, getAttributeNS, type XMLElement } from './xml.ts'

function decodeXMLEntitiesFast(text: string): string {
  let out = ''
  let pos = 0
  while (true) {
    const amp = text.indexOf('&', pos)
    if (amp === -1) {
      if (pos === 0) return text
      out += text.substring(pos)
      return out
    }
    out += text.substring(pos, amp)
    const semi = text.indexOf(';', amp + 1)
    if (semi === -1) {
      out += text.substring(amp)
      return out
    }
    const entity = text.substring(amp + 1, semi)
    switch (entity) {
      case 'lt': out += '<'; break
      case 'gt': out += '>'; break
      case 'amp': out += '&'; break
      case 'quot': out += '"'; break
      case 'apos': out += "'"; break
      default:
        if (entity.startsWith('#x')) {
          const code = parseInt(entity.slice(2), 16)
          if (!isNaN(code)) out += String.fromCharCode(code)
        } else if (entity.startsWith('#')) {
          const code = parseInt(entity.slice(1), 10)
          if (!isNaN(code)) out += String.fromCharCode(code)
        }
        break
    }
    pos = semi + 1
  }
}

function getAttrValue(attrs: string, name: string): string | null {
  const search = name + '='
  let idx = attrs.indexOf(search)
  if (idx === -1) return null
  idx += search.length
  while (idx < attrs.length && attrs.charCodeAt(idx) <= 32) idx++
  if (idx >= attrs.length) return null
  const quote = attrs.charCodeAt(idx)
  if (quote === 34 || quote === 39) {
    idx++
    const end = attrs.indexOf(String.fromCharCode(quote), idx)
    if (end === -1) return null
    return attrs.substring(idx, end)
  }
  let end = idx
  while (end < attrs.length) {
    const c = attrs.charCodeAt(end)
    if (c <= 32 || c === 62) break
    end++
  }
  return attrs.substring(idx, end)
}

function parseTTMLClockTimeFast(s: string): number | null {
  const len = s.length
  const c1 = s.indexOf(':')
  if (c1 === -1) return null
  const c2 = s.indexOf(':', c1 + 1)
  if (c2 === -1) return null
  const dot = s.indexOf('.', c2 + 1)
  if (dot === -1) return null

  let h = 0
  for (let i = 0; i < c1; i++) {
    const d = s.charCodeAt(i) - 48
    if (d < 0 || d > 9) return null
    h = h * 10 + d
  }

  if (c2 - c1 < 3) return null
  const m1 = s.charCodeAt(c1 + 1) - 48
  const m2 = s.charCodeAt(c1 + 2) - 48
  const s1 = s.charCodeAt(c2 + 1) - 48
  const s2 = s.charCodeAt(c2 + 2) - 48
  if (
    m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9 ||
    s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9
  ) return null

  const msLen = len - (dot + 1)
  if (msLen < 1) return null
  let ms = 0
  const msDigits = msLen >= 3 ? 3 : msLen
  for (let i = 0; i < msDigits; i++) {
    const d = s.charCodeAt(dot + 1 + i) - 48
    if (d < 0 || d > 9) return null
    ms = ms * 10 + d
  }
  if (msDigits === 1) ms *= 100
  else if (msDigits === 2) ms *= 10

  return h * 3600000 + (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + ms
}

function parseTTMLClockTimeRange(s: string, start: number, end: number): number | null {
  const c1 = s.indexOf(':', start)
  if (c1 === -1 || c1 >= end) return null
  const c2 = s.indexOf(':', c1 + 1)
  if (c2 === -1 || c2 >= end) return null
  const dot = s.indexOf('.', c2 + 1)
  if (dot === -1 || dot >= end) return null

  let h = 0
  for (let i = start; i < c1; i++) {
    const d = s.charCodeAt(i) - 48
    if (d < 0 || d > 9) return null
    h = h * 10 + d
  }

  if (c2 - c1 < 3) return null
  const m1 = s.charCodeAt(c1 + 1) - 48
  const m2 = s.charCodeAt(c1 + 2) - 48
  const s1 = s.charCodeAt(c2 + 1) - 48
  const s2 = s.charCodeAt(c2 + 2) - 48
  if (
    m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9 ||
    s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9
  ) return null

  const msLen = end - (dot + 1)
  if (msLen < 1) return null
  let ms = 0
  const msDigits = msLen >= 3 ? 3 : msLen
  for (let i = 0; i < msDigits; i++) {
    const d = s.charCodeAt(dot + 1 + i) - 48
    if (d < 0 || d > 9) return null
    ms = ms * 10 + d
  }
  if (msDigits === 1) ms *= 100
  else if (msDigits === 2) ms *= 10

  return h * 3600000 + (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + ms
}

function parseTTMLTimeFast(s: string): number | null {
  if (!s) return null
  if (s.indexOf(':') !== -1) {
    return parseTTMLClockTimeFast(s)
  }
  return null
}

function parseTTMLTimeRange(s: string, start: number, end: number): number | null {
  if (start >= end) return null
  const len = end - start
  if (len === 12) {
    const c2 = s.charCodeAt(start + 2)
    const c5 = s.charCodeAt(start + 5)
    const c8 = s.charCodeAt(start + 8)
    if (c2 === 58 && c5 === 58 && c8 === 46) {
      const h1 = s.charCodeAt(start) - 48
      const h2 = s.charCodeAt(start + 1) - 48
      const m1 = s.charCodeAt(start + 3) - 48
      const m2 = s.charCodeAt(start + 4) - 48
      const s1 = s.charCodeAt(start + 6) - 48
      const s2 = s.charCodeAt(start + 7) - 48
      const ms1 = s.charCodeAt(start + 9) - 48
      const ms2 = s.charCodeAt(start + 10) - 48
      const ms3 = s.charCodeAt(start + 11) - 48
      if (
        h1 >= 0 && h1 <= 9 && h2 >= 0 && h2 <= 9 &&
        m1 >= 0 && m1 <= 9 && m2 >= 0 && m2 <= 9 &&
        s1 >= 0 && s1 <= 9 && s2 >= 0 && s2 <= 9 &&
        ms1 >= 0 && ms1 <= 9 && ms2 >= 0 && ms2 <= 9 && ms3 >= 0 && ms3 <= 9
      ) {
        const h = h1 * 10 + h2
        const m = m1 * 10 + m2
        const sec = s1 * 10 + s2
        const ms = ms1 * 100 + ms2 * 10 + ms3
        return h * 3600000 + m * 60000 + sec * 1000 + ms
      }
    }
  }

  const c1 = s.indexOf(':', start)
  if (c1 !== -1 && c1 < end) {
    return parseTTMLClockTimeRange(s, start, end)
  }
  return null
}

interface AttrRanges {
  beginStart?: number
  beginEnd?: number
  endStart?: number
  endEnd?: number
  durStart?: number
  durEnd?: number
  styleStart?: number
  styleEnd?: number
  regionStart?: number
  regionEnd?: number
}

function matchAttrName(src: string, start: number, end: number): number {
  const len = end - start
  if (len === 3) {
    const c1 = src.charCodeAt(start) | 32
    const c2 = src.charCodeAt(start + 1) | 32
    const c3 = src.charCodeAt(start + 2) | 32
    if (c1 === 101 && c2 === 110 && c3 === 100) return 2 // end
    if (c1 === 100 && c2 === 117 && c3 === 114) return 3 // dur
    return 0
  }
  if (len === 5) {
    const c1 = src.charCodeAt(start) | 32
    const c2 = src.charCodeAt(start + 1) | 32
    const c3 = src.charCodeAt(start + 2) | 32
    const c4 = src.charCodeAt(start + 3) | 32
    const c5 = src.charCodeAt(start + 4) | 32
    if (c1 === 98 && c2 === 101 && c3 === 103 && c4 === 105 && c5 === 110) return 1 // begin
    if (c1 === 115 && c2 === 116 && c3 === 121 && c4 === 108 && c5 === 101) return 4 // style
    return 0
  }
  if (len === 6) {
    const c1 = src.charCodeAt(start) | 32
    const c2 = src.charCodeAt(start + 1) | 32
    const c3 = src.charCodeAt(start + 2) | 32
    const c4 = src.charCodeAt(start + 3) | 32
    const c5 = src.charCodeAt(start + 4) | 32
    const c6 = src.charCodeAt(start + 5) | 32
    if (c1 === 114 && c2 === 101 && c3 === 103 && c4 === 105 && c5 === 111 && c6 === 110) return 5 // region
  }
  return 0
}

function parsePAttrRanges(src: string, start: number, end: number): AttrRanges {
  const ranges: AttrRanges = {}
  let i = start

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

    while (i < end && src.charCodeAt(i) <= 32) i++
    if (i >= end || src.charCodeAt(i) !== 61) {
      while (i < end && src.charCodeAt(i) !== 32) i++
      continue
    }
    i++ // '='
    while (i < end && src.charCodeAt(i) <= 32) i++
    if (i >= end) break

    const quote = src.charCodeAt(i)
    let valStart = i
    let valEnd = i
    if (quote === 34 || quote === 39) {
      valStart = i + 1
      valEnd = src.indexOf(String.fromCharCode(quote), valStart)
      if (valEnd === -1 || valEnd > end) valEnd = end
      i = valEnd + 1
    } else {
      while (i < end) {
        const ch = src.charCodeAt(i)
        if (ch <= 32 || ch === 62) break
        i++
      }
      valStart = valStart
      valEnd = i
    }

    const key = matchAttrName(src, nameStart, nameEnd)
    switch (key) {
      case 1:
        ranges.beginStart = valStart
        ranges.beginEnd = valEnd
        break
      case 2:
        ranges.endStart = valStart
        ranges.endEnd = valEnd
        break
      case 3:
        ranges.durStart = valStart
        ranges.durEnd = valEnd
        break
      case 4:
        ranges.styleStart = valStart
        ranges.styleEnd = valEnd
        break
      case 5:
        ranges.regionStart = valStart
        ranges.regionEnd = valEnd
        break
    }
  }

  return ranges
}

function parseTTMLUltraFast(input: string, doc: SubtitleDocument): boolean {
  if (input.indexOf('<p begin="') === -1) return false
  if (input.indexOf('<P') !== -1) return false
  if (
    input.indexOf('<span') !== -1 || input.indexOf('<br') !== -1 ||
    input.indexOf('<styling') !== -1 || input.indexOf('<layout') !== -1 ||
    input.indexOf('<region') !== -1 || input.indexOf('<style') !== -1 ||
    input.indexOf('tts:') !== -1
  ) {
    return false
  }

  const openSeq = '<p begin="'
  const endSeq = ' end="'
  let pos = 0
  let found = false
  const events = doc.events
  let eventCount = events.length

  while (true) {
    const pStart = input.indexOf(openSeq, pos)
    if (pStart === -1) break

    const beginStart = pStart + openSeq.length
    const beginEnd = input.indexOf('"', beginStart)
    if (beginEnd === -1) return false

    const endAttrPos = input.indexOf(endSeq, beginEnd)
    if (endAttrPos === -1) return false
    const endStart = endAttrPos + endSeq.length
    const endEnd = input.indexOf('"', endStart)
    if (endEnd === -1) return false

    const tagEnd = input.indexOf('>', endEnd)
    if (tagEnd === -1) return false
    const closeStart = input.indexOf('</p>', tagEnd + 1)
    if (closeStart === -1) return false

    const startMs = parseTTMLTimeRange(input, beginStart, beginEnd)
    const endMs = parseTTMLTimeRange(input, endStart, endEnd)
    if (startMs === null || endMs === null) return false

    let text = input.substring(tagEnd + 1, closeStart)
    if (text.indexOf('&') !== -1) {
      text = decodeXMLEntitiesFast(text)
    }

    if (text.length > 0) {
      events[eventCount++] = {
        id: generateId(),
        start: startMs,
        end: endMs,
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
      found = true
    }

    pos = closeStart + 4
  }

  if (eventCount !== events.length) events.length = eventCount
  return found
}

function parseTTMLFast(input: string, doc: SubtitleDocument): boolean {
  if (input.indexOf('<p') === -1 && input.indexOf('<P') === -1) return false
  if (
    input.indexOf('<span') !== -1 || input.indexOf('<SPAN') !== -1 ||
    input.indexOf('<br') !== -1 || input.indexOf('<BR') !== -1 ||
    input.indexOf('<styling') !== -1 || input.indexOf('<STYLING') !== -1 ||
    input.indexOf('<layout') !== -1 || input.indexOf('<LAYOUT') !== -1 ||
    input.indexOf('<region') !== -1 || input.indexOf('<REGION') !== -1 ||
    input.indexOf('<style') !== -1 || input.indexOf('<STYLE') !== -1 ||
    input.indexOf('tts:') !== -1 || input.indexOf('TTS:') !== -1
  ) {
    return false
  }

  const len = input.length
  let pos = 0
  let found = false

  while (pos < len) {
    // Find next <p or <P
    let pStart = -1
    for (let i = pos; i < len - 1; i++) {
      if (input.charCodeAt(i) === 60) { // <
        const c = input.charCodeAt(i + 1)
        if (c === 112 || c === 80) { // p or P
          pStart = i
          break
        }
      }
    }
    if (pStart === -1) break

    const tagEnd = input.indexOf('>', pStart + 2)
    if (tagEnd === -1) break

    const closeStart = input.indexOf('</p', tagEnd)
    if (closeStart === -1) break
    const closeEnd = input.indexOf('>', closeStart + 3)
    if (closeEnd === -1) break

    const ranges = parsePAttrRanges(input, pStart + 2, tagEnd)
    if (ranges.beginStart === undefined || ranges.beginEnd === undefined) {
      pos = closeEnd + 1
      continue
    }
    const beginStart = ranges.beginStart
    const beginEnd = ranges.beginEnd
    const endStart = ranges.endStart
    const endEnd = ranges.endEnd
    const durStart = ranges.durStart
    const durEnd = ranges.durEnd

    let startMs = parseTTMLTimeRange(input, beginStart, beginEnd)
    if (startMs === null) {
      const begin = input.substring(beginStart, beginEnd)
      try {
        startMs = parseTTMLTimeFast(begin) ?? parseTime(begin)
      } catch {
        pos = closeEnd + 1
        continue
      }
    }

    let endMs: number
    if (endStart !== undefined && endEnd !== undefined) {
      const fast = parseTTMLTimeRange(input, endStart, endEnd)
      if (fast === null) {
        const end = input.substring(endStart, endEnd)
        try {
          endMs = parseTTMLTimeFast(end) ?? parseTime(end)
        } catch {
          pos = closeEnd + 1
          continue
        }
      } else {
        endMs = fast
      }
    } else if (durStart !== undefined && durEnd !== undefined) {
      const dur = input.substring(durStart, durEnd)
      try {
        endMs = startMs + parseDuration(dur)
      } catch {
        pos = closeEnd + 1
        continue
      }
    } else {
      pos = closeEnd + 1
      continue
    }

    const styleRef = ranges.styleStart !== undefined && ranges.styleEnd !== undefined
      ? input.substring(ranges.styleStart, ranges.styleEnd)
      : null
    const regionRef = ranges.regionStart !== undefined && ranges.regionEnd !== undefined
      ? input.substring(ranges.regionStart, ranges.regionEnd)
      : null

    let text = input.substring(tagEnd + 1, closeStart)
    if (text.indexOf('&') !== -1) {
      text = decodeXMLEntitiesFast(text)
    }

    if (text.length > 0) {
      doc.events.push({
        id: generateId(),
        start: startMs,
        end: endMs,
        layer: 0,
        style: styleRef || 'Default',
        actor: '',
        marginL: 0,
        marginR: 0,
        marginV: 0,
        effect: regionRef || '',
        text,
        segments: EMPTY_SEGMENTS,
        dirty: false
      })
      found = true
    }

    pos = closeEnd + 1
  }

  return found
}

/**
 * Represents a TTML region for subtitle positioning and layout
 */
interface TTMLRegion {
  /** Unique identifier for the region */
  id: string
  /** Region origin position (e.g., "10% 80%") */
  origin?: string
  /** Region extent/size (e.g., "80% 20%") */
  extent?: string
  /** Style reference ID */
  style?: string
}

/**
 * Represents a TTML style definition
 */
interface TTMLStyle {
  /** Unique identifier for the style */
  id: string
  /** Font family name */
  fontFamily?: string
  /** Font size value */
  fontSize?: string
  /** Font style (e.g., "italic") */
  fontStyle?: string
  /** Font weight (e.g., "bold", "700") */
  fontWeight?: string
  /** Text color */
  color?: string
  /** Background color */
  backgroundColor?: string
  /** Text alignment */
  textAlign?: string
  /** Text decoration (e.g., "underline", "line-through") */
  textDecoration?: string
}

class TTMLParser {
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private styles: Map<string, TTMLStyle> = new Map()
  private regions: Map<string, TTMLRegion> = new Map()

  constructor(opts: Partial<ParseOptions> = {}) {
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
  }

  parse(input: string): ParseResult {
    if (parseTTMLUltraFast(input, this.doc) || parseTTMLFast(input, this.doc)) {
      return { document: this.doc, errors: this.errors, warnings: [] }
    }

    // Parse XML using our simple parser
    let ttElement: XMLElement
    try {
      ttElement = parseXML(input)
    } catch (e) {
      this.addError('INVALID_SECTION', 'Invalid XML: ' + String(e))
      return { document: this.doc, errors: this.errors, warnings: [] }
    }

    if (ttElement.name !== 'tt') {
      this.addError('INVALID_SECTION', 'Root element must be <tt>')
      return { document: this.doc, errors: this.errors, warnings: [] }
    }

    // Parse head section
    const head = querySelector(ttElement, 'head')
    if (head) {
      this.parseHead(head)
    }

    // Parse body section
    const body = querySelector(ttElement, 'body')
    if (body) {
      this.parseBody(body)
    }

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private parseHead(head: XMLElement): void {
    // Parse styling section
    const styling = querySelector(head, 'styling')
    if (styling) {
      const styleElements = querySelectorAll(styling, 'style')
      for (const styleEl of styleElements) {
        this.parseStyleElement(styleEl)
      }
    }

    // Parse layout section
    const layout = querySelector(head, 'layout')
    if (layout) {
      const regionElements = querySelectorAll(layout, 'region')
      for (const regionEl of regionElements) {
        this.parseRegionElement(regionEl)
      }
    }
  }

  private parseStyleElement(styleEl: XMLElement): void {
    const id = getAttribute(styleEl, 'xml:id') || getAttribute(styleEl, 'id')
    if (!id) return

    const style: TTMLStyle = { id }

    // Parse tts:* attributes
    for (const [name, value] of styleEl.attributes) {
      if (name.startsWith('tts:')) {
        const prop = name.substring(4)
        switch (prop) {
          case 'fontFamily': style.fontFamily = value; break
          case 'fontSize': style.fontSize = value; break
          case 'fontStyle': style.fontStyle = value; break
          case 'fontWeight': style.fontWeight = value; break
          case 'color': style.color = value; break
          case 'backgroundColor': style.backgroundColor = value; break
          case 'textAlign': style.textAlign = value; break
          case 'textDecoration': style.textDecoration = value; break
        }
      }
    }

    this.styles.set(id, style)
  }

  private parseRegionElement(regionEl: XMLElement): void {
    const id = getAttribute(regionEl, 'xml:id') || getAttribute(regionEl, 'id')
    if (!id) return

    const region: TTMLRegion = { id }

    // Parse tts:* attributes for region positioning
    const origin = getAttribute(regionEl, 'tts:origin') || getAttributeNS(regionEl, 'http://www.w3.org/ns/ttml#styling', 'origin')
    const extent = getAttribute(regionEl, 'tts:extent') || getAttributeNS(regionEl, 'http://www.w3.org/ns/ttml#styling', 'extent')
    const style = getAttribute(regionEl, 'style')

    if (origin) region.origin = origin
    if (extent) region.extent = extent
    if (style) region.style = style

    this.regions.set(id, region)
  }

  private parseBody(body: XMLElement): void {
    // Process all div elements
    const divs = querySelectorAll(body, 'div')
    for (const div of divs) {
      this.parseDiv(div)
    }

    // Also handle p elements directly under body
    const paragraphs = querySelectorAll(body, 'p')
    for (const p of paragraphs) {
      // Only process if direct child of body
      let isDirectChild = false
      for (const child of body.children) {
        if (child === p) {
          isDirectChild = true
          break
        }
      }
      if (isDirectChild) {
        this.parseParagraph(p)
      }
    }
  }

  private parseDiv(div: XMLElement): void {
    // Process all p elements in this div
    const paragraphs = querySelectorAll(div, 'p')
    for (const p of paragraphs) {
      this.parseParagraph(p)
    }
  }

  private parseParagraph(p: XMLElement): SubtitleEvent | null {
    // Parse timing
    const beginAttr = getAttribute(p, 'begin')
    const endAttr = getAttribute(p, 'end')
    const durAttr = getAttribute(p, 'dur')

    if (!beginAttr) return null

    const start = parseTime(beginAttr)
    let end = 0

    if (endAttr) {
      end = parseTime(endAttr)
    } else if (durAttr) {
      const duration = parseDuration(durAttr)
      end = start + duration
    } else {
      // No end time specified - skip
      return null
    }

    // Parse style reference
    const styleRef = getAttribute(p, 'style')
    const regionRef = getAttribute(p, 'region')

    // Extract text and segments
    const { text, segments } = this.extractTextAndSegments(p, styleRef)

    const event: SubtitleEvent = {
      id: generateId(),
      start,
      end,
      layer: 0,
      style: styleRef || 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: regionRef || '',
      text,
      segments,
      dirty: false
    }

    this.doc.events.push(event)
    return event
  }

  private extractTextAndSegments(element: XMLElement, parentStyle?: string): { text: string; segments: TextSegment[] } {
    const segments: TextSegment[] = []
    let text = ''

    const processNode = (node: XMLNode, inheritedStyle?: TTMLStyle): void => {
      if (typeof node === 'string') {
        // Text node
        const content = node
        text += content

        const inlineStyle = inheritedStyle ? this.convertTTMLStyleToInline(inheritedStyle) : null
        segments.push({
          text: content,
          style: inlineStyle,
          effects: []
        })
      } else {
        // Element node
        const el = node

        // Handle <br/> tags
        if (el.name === 'br') {
          text += '\n'
          segments.push({ text: '\n', style: null, effects: [] })
          return
        }

        // Handle <span> elements
        if (el.name === 'span') {
          // Parse inline style attributes
          const inlineStyle = this.parseInlineStyle(el, inheritedStyle)

          // Process children
          const len = el.children.length
          for (let i = 0; i < len; i++) {
            processNode(el.children[i], inlineStyle)
          }
        } else {
          // Process children with inherited style
          const len = el.children.length
          for (let i = 0; i < len; i++) {
            processNode(el.children[i], inheritedStyle)
          }
        }
      }
    }

    // Get parent style if specified
    let baseStyle: TTMLStyle | undefined
    if (parentStyle) {
      baseStyle = this.styles.get(parentStyle)
    }

    // Process all child nodes
    for (const child of element.children) {
      processNode(child, baseStyle)
    }

    return { text, segments }
  }

  private parseInlineStyle(element: XMLElement, inheritedStyle?: TTMLStyle): TTMLStyle {
    const style: TTMLStyle = { id: '', ...inheritedStyle }

    // Parse tts:* attributes
    for (const [name, value] of element.attributes) {
      if (name.startsWith('tts:')) {
        const prop = name.substring(4)
        switch (prop) {
          case 'fontFamily': style.fontFamily = value; break
          case 'fontSize': style.fontSize = value; break
          case 'fontStyle': style.fontStyle = value; break
          case 'fontWeight': style.fontWeight = value; break
          case 'color': style.color = value; break
          case 'backgroundColor': style.backgroundColor = value; break
          case 'textAlign': style.textAlign = value; break
          case 'textDecoration': style.textDecoration = value; break
        }
      }
    }

    // Check for style reference
    const styleRef = getAttribute(element, 'style')
    if (styleRef && this.styles.has(styleRef)) {
      const refStyle = this.styles.get(styleRef)!
      Object.assign(style, refStyle, style) // Merge with inline taking precedence
    }

    return style
  }

  private convertTTMLStyleToInline(ttmlStyle: TTMLStyle): InlineStyle | null {
    const inline: InlineStyle = {}
    let hasAny = false

    if (ttmlStyle.fontFamily) {
      inline.fontName = ttmlStyle.fontFamily
      hasAny = true
    }

    if (ttmlStyle.fontSize) {
      // Parse fontSize (e.g., "20px", "1.5em", "120%")
      const size = this.parseFontSize(ttmlStyle.fontSize)
      if (size) {
        inline.fontSize = size
        hasAny = true
      }
    }

    if (ttmlStyle.fontStyle === 'italic') {
      inline.italic = true
      hasAny = true
    }

    if (ttmlStyle.fontWeight === 'bold' || parseInt(ttmlStyle.fontWeight || '') >= 700) {
      inline.bold = true
      hasAny = true
    }

    if (ttmlStyle.textDecoration) {
      if (ttmlStyle.textDecoration.includes('underline')) {
        inline.underline = true
        hasAny = true
      }
      if (ttmlStyle.textDecoration.includes('line-through')) {
        inline.strikeout = true
        hasAny = true
      }
    }

    if (ttmlStyle.color) {
      const color = this.parseColor(ttmlStyle.color)
      if (color !== null) {
        inline.primaryColor = color
        hasAny = true
      }
    }

    if (ttmlStyle.backgroundColor) {
      const color = this.parseColor(ttmlStyle.backgroundColor)
      if (color !== null) {
        inline.backColor = color
        hasAny = true
      }
    }

    return hasAny ? inline : null
  }

  private parseFontSize(fontSize: string): number | null {
    // Handle px values
    if (fontSize.endsWith('px')) {
      return parseInt(fontSize)
    }
    // Handle pt values
    if (fontSize.endsWith('pt')) {
      return parseInt(fontSize)
    }
    // Handle percentage (relative to default 48)
    if (fontSize.endsWith('%')) {
      const percent = parseInt(fontSize)
      return Math.round(48 * (percent / 100))
    }
    // Try to parse as plain number
    const num = parseInt(fontSize)
    return isNaN(num) ? null : num
  }

  private parseColor(colorStr: string): number | null {
    const trimmed = colorStr.trim()

    // Handle hex colors: #RGB, #RRGGBB, #RRGGBBAA
    if (trimmed.startsWith('#')) {
      const hex = trimmed.substring(1)
      if (hex.length === 3) {
        // #RGB -> #RRGGBB
        const r = parseInt(hex[0] + hex[0], 16)
        const g = parseInt(hex[1] + hex[1], 16)
        const b = parseInt(hex[2] + hex[2], 16)
        return ((0xff000000 | (b << 16) | (g << 8) | r) >>> 0)
      } else if (hex.length === 6) {
        // #RRGGBB
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        return ((0xff000000 | (b << 16) | (g << 8) | r) >>> 0)
      } else if (hex.length === 8) {
        // #RRGGBBAA
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        const a = parseInt(hex.substring(6, 8), 16)
        return (((a << 24) | (b << 16) | (g << 8) | r) >>> 0)
      }
    }

    // Handle rgb() and rgba()
    if (trimmed.startsWith('rgb')) {
      const match = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/)
      if (match) {
        const r = parseInt(match[1])
        const g = parseInt(match[2])
        const b = parseInt(match[3])
        const a = match[4] ? Math.round(parseFloat(match[4]) * 255) : 255
        return (((a << 24) | (b << 16) | (g << 8) | r) >>> 0)
      }
    }

    // Handle named colors
    const namedColors: Record<string, number> = {
      'white': 0xffffffff,
      'black': 0xff000000,
      'red': 0xffff0000,
      'green': 0xff00ff00,
      'blue': 0xff0000ff,
      'yellow': 0xffffff00,
      'cyan': 0xff00ffff,
      'magenta': 0xffff00ff,
    }

    const lower = trimmed.toLowerCase()
    if (lower in namedColors) {
      return namedColors[lower]
    }

    return null
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: 1, column: 1 })
    }
    this.errors.push({ line: 1, column: 1, code, message, raw })
  }
}

/**
 * Parse TTML (Timed Text Markup Language) format subtitle file
 *
 * @param input - TTML file content as string
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails
 *
 * @example
 * ```ts
 * const ttml = `<?xml version="1.0"?>
 * <tt xmlns="http://www.w3.org/ns/ttml">
 *   <body><div>
 *     <p begin="00:00:01.000" end="00:00:03.000">Hello world</p>
 *   </div></body>
 * </tt>`
 * const doc = parseTTML(ttml)
 * ```
 */
export function parseTTML(input: string): SubtitleDocument {
  const parser = new TTMLParser({ onError: 'throw' })
  const result = parser.parse(input)
  return result.document
}

/**
 * Parse TTML format with detailed error reporting
 *
 * @param input - TTML file content as string
 * @param opts - Parsing options
 * @returns Parse result containing document, errors, and warnings
 *
 * @example
 * ```ts
 * const result = parseTTMLResult(ttmlContent, { onError: 'collect' })
 * if (result.errors.length > 0) {
 *   console.error('Parsing errors:', result.errors)
 * }
 * ```
 */
export function parseTTMLResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new TTMLParser(opts)
  return parser.parse(input)
}
