import type { SubtitleDocument, SubtitleEvent, VTTRegion } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../core/document.ts'
// Time parsing is inlined in parseCue for performance

class VTTParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
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
    this.doc.regions = []
  }

  parse(): ParseResult {
    this.parseHeader()

    while (this.pos < this.len) {
      this.skipEmptyLines()
      if (this.pos >= this.len) break

      // Check first 4 chars to identify block type
      // NOTE, STYL, REGI are the prefixes we care about
      const c0 = this.src.charCodeAt(this.pos)
      const c1 = this.pos + 1 < this.len ? this.src.charCodeAt(this.pos + 1) : 0
      const c2 = this.pos + 2 < this.len ? this.src.charCodeAt(this.pos + 2) : 0
      const c3 = this.pos + 3 < this.len ? this.src.charCodeAt(this.pos + 3) : 0

      // NOTE (78=N, 79=O, 84=T, 69=E)
      if (c0 === 78 && c1 === 79 && c2 === 84 && c3 === 69) {
        this.parseNote()
      // STYLE (83=S, 84=T, 89=Y, 76=L)
      } else if (c0 === 83 && c1 === 84 && c2 === 89 && c3 === 76) {
        this.parseStyle()
      // REGION (82=R, 69=E, 71=G, 73=I)
      } else if (c0 === 82 && c1 === 69 && c2 === 71 && c3 === 73) {
        this.parseRegion()
      } else {
        const event = this.parseCue()
        if (event) {
          this.doc.events[this.doc.events.length] = event
        }
      }
    }

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private readLine(): string {
    const start = this.pos
    let nlPos = this.src.indexOf('\n', this.pos)
    if (nlPos === -1) nlPos = this.len

    let end = nlPos
    if (end > start && this.src.charCodeAt(end - 1) === 13) end--

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    return this.src.substring(start, end)
  }

  private skipEmptyLines(): void {
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 10) {
        this.pos++
        this.lineNum++
      } else if (c === 13) {
        this.pos++
        if (this.pos < this.len && this.src.charCodeAt(this.pos) === 10) this.pos++
        this.lineNum++
      } else if (c === 32 || c === 9) {
        this.pos++
      } else {
        break
      }
    }
  }

  private parseHeader(): void {
    if (this.pos >= this.len) return

    const line = this.readLine().trim()
    if (!line.startsWith('WEBVTT')) {
      this.addError('INVALID_SECTION', 'File must start with WEBVTT')
    }
  }

  private parseNote(): void {
    while (this.pos < this.len) {
      const line = this.readLine()
      if (line.trim() === '') break
    }
  }

  private parseStyle(): void {
    this.readLine() // consume STYLE line
    while (this.pos < this.len) {
      const line = this.readLine()
      if (line.trim() === '') break
    }
  }

  private parseRegion(): void {
    this.readLine() // consume REGION line

    const region: VTTRegion = {
      id: '',
      width: '100%',
      lines: 3,
      regionAnchor: '0%,100%',
      viewportAnchor: '0%,100%',
      scroll: 'none'
    }

    while (this.pos < this.len) {
      const line = this.readLine().trim()
      if (line === '') break

      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx).trim()
        const value = line.substring(colonIdx + 1).trim()

        switch (key) {
          case 'id': region.id = value; break
          case 'width': region.width = value; break
          case 'lines': region.lines = parseInt(value) || 3; break
          case 'regionanchor': region.regionAnchor = value; break
          case 'viewportanchor': region.viewportAnchor = value; break
          case 'scroll': region.scroll = value === 'up' ? 'up' : 'none'; break
        }
      }
    }

    this.doc.regions![this.doc.regions!.length] = region
  }

  private parseCue(): SubtitleEvent | null {
    // Read first line and check for --> directly using indexOf (avoids substring)
    let lineStart = this.pos
    let arrowPos = this.src.indexOf(' --> ', lineStart)
    let nlPos = this.src.indexOf('\n', lineStart)
    if (nlPos === -1) nlPos = this.len

    let lineEnd = nlPos
    if (lineEnd > lineStart && this.src.charCodeAt(lineEnd - 1) === 13) lineEnd--

    // Consume line
    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    // If no arrow on first line, this is a cue identifier - read next line
    if (arrowPos === -1 || arrowPos >= lineEnd) {
      if (this.pos >= this.len) return null

      lineStart = this.pos
      arrowPos = this.src.indexOf(' --> ', lineStart)
      nlPos = this.src.indexOf('\n', lineStart)
      if (nlPos === -1) nlPos = this.len

      lineEnd = nlPos
      if (lineEnd > lineStart && this.src.charCodeAt(lineEnd - 1) === 13) lineEnd--

      this.pos = nlPos < this.len ? nlPos + 1 : this.len
      this.lineNum++
    }

    if (arrowPos === -1 || arrowPos >= lineEnd) {
      this.addError('INVALID_TIMESTAMP', `Invalid time line`)
      this.skipToNextCue()
      return null
    }

    // Parse timestamps inline for speed (avoids function call overhead)
    const afterArrowStart = arrowPos + 5
    const spacePos = this.src.indexOf(' ', afterArrowStart)
    const endPos = (spacePos === -1 || spacePos > lineEnd) ? lineEnd : spacePos

    // Inline start time parsing (HH:MM:SS.mmm or MM:SS.mmm)
    const startLen = arrowPos - lineStart
    let start: number
    if (startLen === 12) {
      const s = this.src
      const o = lineStart
      start = ((s.charCodeAt(o) - 48) * 10 + (s.charCodeAt(o + 1) - 48)) * 3600000 +
              ((s.charCodeAt(o + 3) - 48) * 10 + (s.charCodeAt(o + 4) - 48)) * 60000 +
              ((s.charCodeAt(o + 6) - 48) * 10 + (s.charCodeAt(o + 7) - 48)) * 1000 +
              (s.charCodeAt(o + 9) - 48) * 100 + (s.charCodeAt(o + 10) - 48) * 10 + (s.charCodeAt(o + 11) - 48)
    } else if (startLen === 9) {
      const s = this.src
      const o = lineStart
      start = ((s.charCodeAt(o) - 48) * 10 + (s.charCodeAt(o + 1) - 48)) * 60000 +
              ((s.charCodeAt(o + 3) - 48) * 10 + (s.charCodeAt(o + 4) - 48)) * 1000 +
              (s.charCodeAt(o + 6) - 48) * 100 + (s.charCodeAt(o + 7) - 48) * 10 + (s.charCodeAt(o + 8) - 48)
    } else {
      this.addError('INVALID_TIMESTAMP', `Invalid timestamp`)
      this.skipToNextCue()
      return null
    }

    // Inline end time parsing
    const endLen = endPos - afterArrowStart
    let end: number
    if (endLen === 12) {
      const s = this.src
      const o = afterArrowStart
      end = ((s.charCodeAt(o) - 48) * 10 + (s.charCodeAt(o + 1) - 48)) * 3600000 +
            ((s.charCodeAt(o + 3) - 48) * 10 + (s.charCodeAt(o + 4) - 48)) * 60000 +
            ((s.charCodeAt(o + 6) - 48) * 10 + (s.charCodeAt(o + 7) - 48)) * 1000 +
            (s.charCodeAt(o + 9) - 48) * 100 + (s.charCodeAt(o + 10) - 48) * 10 + (s.charCodeAt(o + 11) - 48)
    } else if (endLen === 9) {
      const s = this.src
      const o = afterArrowStart
      end = ((s.charCodeAt(o) - 48) * 10 + (s.charCodeAt(o + 1) - 48)) * 60000 +
            ((s.charCodeAt(o + 3) - 48) * 10 + (s.charCodeAt(o + 4) - 48)) * 1000 +
            (s.charCodeAt(o + 6) - 48) * 100 + (s.charCodeAt(o + 7) - 48) * 10 + (s.charCodeAt(o + 8) - 48)
    } else {
      this.addError('INVALID_TIMESTAMP', `Invalid timestamp`)
      this.skipToNextCue()
      return null
    }

    // Read text lines using indexOf for speed
    const textStart = this.pos
    let textEnd = this.pos

    while (this.pos < this.len) {
      const ls = this.pos
      let nl = this.src.indexOf('\n', this.pos)
      if (nl === -1) nl = this.len

      let le = nl
      if (le > ls && this.src.charCodeAt(le - 1) === 13) le--

      // Check if line is empty (only whitespace) - inline check
      let isEmpty = true
      for (let i = ls; i < le; i++) {
        const c = this.src.charCodeAt(i)
        if (c !== 32 && c !== 9) {
          isEmpty = false
          break
        }
      }
      if (isEmpty) break

      textEnd = le
      this.pos = nl < this.len ? nl + 1 : this.len
      this.lineNum++
    }

    let text = this.src.substring(textStart, textEnd)
    if (text.includes('\r')) {
      text = text.replace(/\r/g, '')
    }
    text = text.trim()

    return {
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

  private skipToNextCue(): void {
    while (this.pos < this.len) {
      const line = this.readLine()
      if (line.trim() === '') break
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
 * Parses a WebVTT subtitle file into a SubtitleDocument.
 *
 * WebVTT (Web Video Text Tracks) is a modern subtitle format designed for HTML5.
 * Supports cues with timestamps, REGION blocks for positioning, STYLE blocks
 * for CSS styling, and NOTE blocks for comments. Timestamps use dot (.) separator
 * for milliseconds and support both HH:MM:SS.mmm and MM:SS.mmm formats.
 *
 * @param input - The WebVTT file content as a string
 * @returns A parsed subtitle document with regions if defined
 * @throws {SubforgeError} If the input is missing the WEBVTT header or contains invalid syntax
 *
 * @example
 * ```ts
 * const vtt = `WEBVTT
 *
 * 00:00:01.000 --> 00:00:03.000
 * Hello, world!
 *
 * 00:00:04.000 --> 00:00:06.000
 * <b>Bold text</b>`;
 *
 * const doc = parseVTT(vtt);
 * console.log(doc.events.length); // 2
 * ```
 */
export function parseVTT(input: string): SubtitleDocument {
  const parser = new VTTParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses a WebVTT subtitle file with detailed error reporting.
 *
 * Unlike parseVTT, this function returns a ParseResult object containing
 * the document, errors, and warnings. Useful when you need to handle
 * malformed files gracefully.
 *
 * @param input - The WebVTT file content as a string
 * @param opts - Parsing options controlling error handling and strictness
 * @returns A parse result containing the document and any errors/warnings
 *
 * @example
 * ```ts
 * const result = parseVTTResult(vtt, { onError: 'collect' });
 * if (result.errors.length > 0) {
 *   console.log('Found errors:', result.errors);
 * }
 * console.log(result.document.events);
 * console.log(result.document.regions);
 * ```
 */
export function parseVTTResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new VTTParser(input, opts)
  return parser.parse()
}
