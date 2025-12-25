import type { SubtitleDocument, SubtitleEvent, Style, InlineStyle, TextSegment } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId } from '../../../core/document.ts'
import { parseTime, parseDuration } from './time.ts'
import { parseXML, querySelector, querySelectorAll, getAttribute, getAttributeNS, type XMLElement } from './xml.ts'

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
