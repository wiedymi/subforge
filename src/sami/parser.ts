import type { SubtitleDocument, SubtitleEvent, TextSegment, InlineStyle, Style } from '../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../core/errors.ts'
import { SubforgeError } from '../core/errors.ts'
import { createDocument, generateId, createDefaultStyle } from '../core/document.ts'
import { parseCSS, styleFromClass, type SAMIClass } from './css.ts'

/**
 * Represents a SAMI synchronization point
 */
interface SyncPoint {
  /** Start time in milliseconds */
  start: number
  /** Subtitle text content */
  text: string
  /** CSS class name reference */
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
    // Extract CSS styles from <STYLE> block
    this.extractStyles()

    // Parse SYNC points
    const syncPoints = this.extractSyncPoints()

    // Convert sync points to events
    this.convertToEvents(syncPoints)

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private extractStyles(): void {
    const styleMatch = this.src.match(/<STYLE[^>]*>(.*?)<\/STYLE>/is)
    if (!styleMatch) return

    const cssBlock = styleMatch[1]!
    this.classes = parseCSS(cssBlock)

    // Create styles from classes
    for (const [className, classObj] of this.classes) {
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

  private extractSyncPoints(): SyncPoint[] {
    const syncPoints: SyncPoint[] = []

    // Find all <SYNC Start=ms> tags
    const syncRegex = /<SYNC\s+Start\s*=\s*(\d+)\s*>/gi
    let match: RegExpExecArray | null

    while ((match = syncRegex.exec(this.src)) !== null) {
      const start = parseInt(match[1]!)
      const syncPos = match.index + match[0].length

      // Extract text until next <SYNC> or </BODY>
      const nextSync = this.src.indexOf('<SYNC', syncPos)
      const bodyEnd = this.src.indexOf('</BODY>', syncPos)

      let endPos = this.len
      if (nextSync !== -1 && (bodyEnd === -1 || nextSync < bodyEnd)) {
        endPos = nextSync
      } else if (bodyEnd !== -1) {
        endPos = bodyEnd
      }

      const content = this.src.slice(syncPos, endPos)

      // Parse <P Class=xxx>text</P>
      const pMatch = content.match(/<P\s+Class\s*=\s*([A-Za-z0-9_-]+)\s*>(.*?)(?:<\/P>|<P|$)/is)

      if (pMatch) {
        const className = pMatch[1]!.toUpperCase()
        const text = pMatch[2]!.trim()

        syncPoints.push({
          start,
          text,
          className
        })
      } else {
        // Try without class
        const simplePMatch = content.match(/<P[^>]*>(.*?)(?:<\/P>|<P|$)/is)
        if (simplePMatch) {
          const text = simplePMatch[1]!.trim()
          syncPoints.push({
            start,
            text
          })
        }
      }
    }

    return syncPoints
  }

  private convertToEvents(syncPoints: SyncPoint[]): void {
    for (let i = 0; i < syncPoints.length; i++) {
      const sync = syncPoints[i]!
      const nextSync = syncPoints[i + 1]

      // Skip if text is &nbsp; (clear marker)
      if (sync.text === '&nbsp;' || sync.text === '') continue

      const start = sync.start
      const end = nextSync ? nextSync.start : start + 5000 // Default 5s if no next

      // Parse inline HTML tags
      const segments = this.parseTags(sync.text)
      const text = this.stripTags(sync.text)

      const event: SubtitleEvent = {
        id: generateId(),
        start,
        end,
        layer: 0,
        style: sync.className || 'Default',
        actor: '',
        marginL: 0,
        marginR: 0,
        marginV: 0,
        effect: '',
        text,
        segments,
        dirty: segments.length > 0
      }

      this.doc.events.push(event)
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

    while (i < raw.length) {
      if (raw[i] === '<') {
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

    if (textStart < raw.length) {
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
      const colorMatch = tag.match(/color\s*=\s*["']?#?([0-9a-f]{6})["']?/i)
      if (colorMatch) {
        const hex = colorMatch[1]!
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        const color = ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)
        stateStack.push({ ...currentState, primaryColor: color })
      } else {
        stateStack.push({ ...currentState })
      }
    } else if (tagLower === '/font') {
      if (stateStack.length > 1) stateStack.pop()
    }
  }

  private decodeHTML(text: string): string {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
  }

  private stripTags(raw: string): string {
    return this.decodeHTML(raw.replace(/<[^>]*>/g, ''))
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: this.lineNum, column: 1 })
    }
    this.errors.push({ line: this.lineNum, column: 1, code, message, raw })
  }
}

/**
 * Parse SAMI (Synchronized Accessible Media Interchange) format subtitle file
 *
 * @param input - SAMI file content as string
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails
 *
 * @example
 * ```ts
 * const sami = `<SAMI>
 * <HEAD><STYLE TYPE="text/css"><!--
 * P { font-size: 20pt; color: white; }
 * --></STYLE></HEAD>
 * <BODY>
 * <SYNC Start=1000><P Class=ENCC>Hello world</P>
 * <SYNC Start=3000><P Class=ENCC>&nbsp;</P>
 * </BODY></SAMI>`
 * const doc = parseSAMI(sami)
 * ```
 */
export function parseSAMI(input: string): SubtitleDocument {
  const parser = new SAMIParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parse SAMI format with detailed error reporting
 *
 * @param input - SAMI file content as string
 * @param opts - Parsing options
 * @returns Parse result containing document, errors, and warnings
 *
 * @example
 * ```ts
 * const result = parseSAMIResult(samiContent, { onError: 'collect' })
 * if (result.errors.length > 0) {
 *   console.error('Parsing errors:', result.errors)
 * }
 * ```
 */
export function parseSAMIResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new SAMIParser(input, opts)
  return parser.parse()
}
