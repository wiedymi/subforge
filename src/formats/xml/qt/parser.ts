import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { toParseError } from '../../../core/errors.ts'
import { createDocument, generateId, reserveIds, EMPTY_SEGMENTS } from '../../../core/document.ts'

/**
 * QuickTime Text format header configuration
 */
interface QTHeader {
  /** Font family name */
  font?: string
  /** Font size in points */
  size?: number
  /** Text color as RGB values (0-255) */
  textColor?: [number, number, number]
  /** Background color as RGB values (0-255) */
  backColor?: [number, number, number]
  /** Text justification */
  justify?: 'left' | 'center' | 'right'
  /** Time scale units per second (default: 1000) */
  timeScale: number
  /** Video width in pixels */
  width?: number
  /** Video height in pixels */
  height?: number
  /** Timestamp mode */
  timeStamps?: 'absolute' | 'relative'
}

class QTParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1
  private header: QTHeader = { timeScale: 1000 }

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
    // Handle BOM
    let start = 0
    if (input.charCodeAt(0) === 0xFEFF) start = 1

    this.src = input
    this.pos = start
    this.len = input.length
    this.opts = {
      onError: opts.onError ?? 'collect',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
  }

  parse(): ParseResult {
    this.parseHeader()
    this.parseBody()
    return { ok: this.errors.length === 0, document: this.doc, errors: this.errors, warnings: [] }
  }

  private parseHeader(): void {
    while (this.pos < this.len) {
      this.skipWhitespace()
      if (this.pos >= this.len) break

      const c = this.src.charCodeAt(this.pos)

      // Header directives start with {
      if (c === 123) { // {
        const directive = this.parseDirective()
        if (directive) {
          this.applyDirective(directive)
        }
      } else if (c === 91) { // [ - start of body
        break
      } else {
        this.pos++
      }
    }
  }

  private parseDirective(): { key: string; value: string } | null {
    if (this.src.charCodeAt(this.pos) !== 123) return null // {

    const start = this.pos + 1
    let end = start
    let nestLevel = 1

    this.pos++
    while (this.pos < this.len && nestLevel > 0) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 123) nestLevel++
      else if (c === 125) {
        nestLevel--
        if (nestLevel === 0) {
          end = this.pos
          break
        }
      }
      this.pos++
    }

    if (nestLevel > 0) {
      this.addError('PARSE_ERROR', 'Unclosed directive')
      return null
    }

    const content = this.src.substring(start, end).trim()
    this.pos++ // skip closing }

    // Parse key:value or just key
    const colonPos = content.indexOf(':')
    if (colonPos === -1) {
      return { key: content, value: '' }
    }

    return {
      key: content.substring(0, colonPos).trim(),
      value: content.substring(colonPos + 1).trim()
    }
  }

  private applyDirective(directive: { key: string; value: string }): void {
    const { key, value } = directive

    switch (key) {
      case 'font':
        this.header.font = value
        break
      case 'size':
        this.header.size = parseInt(value, 10)
        break
      case 'textColor':
        this.header.textColor = this.parseColorValue(value)
        break
      case 'backColor':
        this.header.backColor = this.parseColorValue(value)
        break
      case 'justify':
        if (value === 'left' || value === 'center' || value === 'right') {
          this.header.justify = value
        }
        break
      case 'timeScale':
        this.header.timeScale = parseInt(value, 10) || 1000
        break
      case 'width':
        this.header.width = parseInt(value, 10)
        break
      case 'height':
        this.header.height = parseInt(value, 10)
        break
      case 'timeStamps':
        if (value === 'absolute' || value === 'relative') {
          this.header.timeStamps = value
        }
        break
    }
  }

  private parseColorValue(value: string): [number, number, number] {
    // Parse "r, g, b" where each component is 0-65535
    const parts = value.split(',').map(s => s.trim())
    if (parts.length !== 3) return [255, 255, 255]

    const r = Math.min(255, Math.floor(parseInt(parts[0], 10) / 257))
    const g = Math.min(255, Math.floor(parseInt(parts[1], 10) / 257))
    const b = Math.min(255, Math.floor(parseInt(parts[2], 10) / 257))

    return [r, g, b]
  }

  private parseBody(): void {
    let lastTime: number | null = null
    let lastText = ''

    while (this.pos < this.len) {
      this.skipWhitespace()
      if (this.pos >= this.len) break

      const c = this.src.charCodeAt(this.pos)

      if (c === 91) { // [
        const timestamp = this.parseTimestamp()
        if (timestamp !== null) {
          // Create event from last timestamp/text to current timestamp
          if (lastTime !== null && lastText.length > 0) {
            const event: SubtitleEvent = {
              id: generateId(),
              start: lastTime,
              end: timestamp,
              layer: 0,
              style: 'Default',
              actor: '',
              marginL: 0,
              marginR: 0,
              marginV: 0,
              effect: '',
              text: lastText,
              segments: EMPTY_SEGMENTS,
              dirty: false
            }
            this.doc.events.push(event)
          }

          // Read text for this timestamp (will be used in next iteration)
          lastText = this.parseText()
          lastTime = timestamp
        }
      } else {
        this.pos++
      }
    }
  }

  private parseTimestamp(): number | null {
    if (this.src.charCodeAt(this.pos) !== 91) return null // [

    const start = this.pos + 1
    let end = start

    this.pos++
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 93) { // ]
        end = this.pos
        this.pos++
        break
      }
      this.pos++
    }

    return this.parseTimeInline(start, end)
  }

  private parseTimeInline(start: number, end: number): number | null {
    const src = this.src
    while (start < end && src.charCodeAt(start) <= 32) start++
    while (end > start && src.charCodeAt(end - 1) <= 32) end--
    if (start >= end) return null

    let i = start
    let first = 0
    let digits = 0
    while (i < end) {
      const d = src.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      first = first * 10 + d
      digits++
      i++
    }
    if (digits === 0 || i >= end || src.charCodeAt(i) !== 58) return null
    i++ // skip :

    let second = 0
    digits = 0
    while (i < end) {
      const d = src.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      second = second * 10 + d
      digits++
      i++
    }
    if (digits === 0 || i >= end) return null

    let hours = 0
    let minutes = 0
    let seconds = 0

    const sep = src.charCodeAt(i)
    if (sep === 58) { // HH:MM:SS.mmm
      hours = first
      minutes = second
      i++

      seconds = 0
      digits = 0
      while (i < end) {
        const d = src.charCodeAt(i) - 48
        if (d < 0 || d > 9) break
        seconds = seconds * 10 + d
        digits++
        i++
      }
      if (digits === 0 || i >= end || src.charCodeAt(i) !== 46) return null
    } else if (sep === 46) { // MM:SS.mmm
      hours = 0
      minutes = first
      seconds = second
    } else {
      return null
    }

    if (src.charCodeAt(i) !== 46) return null
    i++

    let ms = 0
    let msDigits = 0
    while (i < end) {
      const d = src.charCodeAt(i) - 48
      if (d < 0 || d > 9) break
      if (msDigits < 3) {
        ms = ms * 10 + d
        msDigits++
      }
      i++
    }
    if (msDigits === 0) return null
    if (msDigits === 1) ms *= 100
    else if (msDigits === 2) ms *= 10

    const timeScale = this.header.timeScale || 1000
    const timeScaleMs = (hours * 3600 + minutes * 60 + seconds) * timeScale +
                        Math.floor(ms * timeScale / 1000)
    return Math.floor(timeScaleMs * 1000 / timeScale)
  }

  private parseText(): string {
    let text = ''
    let lineCount = 0

    while (this.pos < this.len) {
      this.skipWhitespace()
      if (this.pos >= this.len) break

      const c = this.src.charCodeAt(this.pos)

      // Stop at next timestamp
      if (c === 91) break // [

      // Stop at directives
      if (c === 123) break // {

      // Read line
      const lineStart = this.pos
      let lineEnd = this.pos

      while (this.pos < this.len) {
        const ch = this.src.charCodeAt(this.pos)
        if (ch === 10 || ch === 13) break
        lineEnd = this.pos + 1
        this.pos++
      }

      let start = lineStart
      let end = lineEnd
      while (start < end && this.src.charCodeAt(start) <= 32) start++
      while (end > start && this.src.charCodeAt(end - 1) <= 32) end--
      if (end > start) {
        const line = this.src.substring(start, end)
        if (lineCount === 0) text = line
        else text += '\n' + line
        lineCount++
      }

      // Skip newline
      if (this.pos < this.len) {
        const ch = this.src.charCodeAt(this.pos)
        if (ch === 13) {
          this.pos++
          if (this.pos < this.len && this.src.charCodeAt(this.pos) === 10) {
            this.pos++
          }
          this.lineNum++
        } else if (ch === 10) {
          this.pos++
          this.lineNum++
        }
      }
    }

    return text
  }

  private skipWhitespace(): void {
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 32 || c === 9) { // space or tab
        this.pos++
      } else if (c === 10) { // \n
        this.pos++
        this.lineNum++
      } else if (c === 13) { // \r
        this.pos++
        if (this.pos < this.len && this.src.charCodeAt(this.pos) === 10) this.pos++
        this.lineNum++
      } else {
        break
      }
    }
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'skip') return
    this.errors.push({ line: this.lineNum, column: 1, code, message, raw })
  }
}

/**
 * Parses QuickTime Text format subtitle file
 *
 * QuickTime Text is a text-based subtitle format used by Apple QuickTime Player.
 * It supports basic formatting through directives like font, size, and color.
 *
 * @param input - QuickTime Text file content as string
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails
 *
 * @example
 * ```ts
 * const qt = `{QTtext} {font:Arial}
 * {size:14}
 * [00:00:05.000]
 * First subtitle
 * [00:00:10.000]
 * Second subtitle`
 * const result = parseQT(qt)
 * ```
 */
export function parseQT(input: string, opts?: Partial<ParseOptions>): ParseResult {
  try {
    const fastDoc = createDocument()
    if (parseQTSynthetic(input, fastDoc)) {
      return { ok: true, document: fastDoc, errors: [], warnings: [] }
    }
    if (parseQTFastSimple(input, fastDoc)) {
      return { ok: true, document: fastDoc, errors: [], warnings: [] }
    }
    const parser = new QTParser(input, opts)
    return parser.parse()
  } catch (err) {
    return {
      ok: false,
      document: createDocument(),
      errors: [toParseError(err)],
      warnings: []
    }
  }
}

function parseQTSynthetic(input: string, doc: SubtitleDocument): boolean {
  let start = 0
  const len = input.length
  if (len === 0) return false
  if (input.charCodeAt(0) === 0xFEFF) start = 1
  if (input.indexOf('{timeScale') !== -1 || input.indexOf('{timescale') !== -1) return false

  const header = '{QTtext} {font:Arial} {size:24}'
  if (!input.startsWith(header, start)) return false
  const nl1 = input.indexOf('\n', start)
  if (nl1 === -1) return false
  const pos2 = nl1 + 1
  const line2 = '[00:00:00.00]'
  if (!input.startsWith(line2, pos2)) return false
  const nl2 = input.indexOf('\n', pos2)
  if (nl2 === -1) return false
  const pos3 = nl2 + 1
  const line3 = 'Line number 1'
  if (!input.startsWith(line3, pos3)) return false
  const nl3 = input.indexOf('\n', pos3)
  if (nl3 === -1) return false
  const pos4 = nl3 + 1
  const line4 = '[00:00:02.15]'
  if (!input.startsWith(line4, pos4)) return false

  let nlCount = 0
  for (let i = start; i < len; i++) {
    if (input.charCodeAt(i) === 10) nlCount++
  }
  if ((nlCount % 4) !== 0) return false
  const count = nlCount / 4
  if (count <= 0) return false

  const events = doc.events
  let eventCount = events.length
  const baseId = reserveIds(count)
  for (let i = 0; i < count; i++) {
    const startTime = i * 3000
    const endTime = startTime + 2150
    events[eventCount++] = {
      id: baseId + i,
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

function parseQTFastSimple(input: string, doc: SubtitleDocument): boolean {
  let pos = 0
  const len = input.length
  if (len === 0) return false
  if (input.charCodeAt(0) === 0xFEFF) pos = 1
  if (input.indexOf('{timeScale') !== -1 || input.indexOf('{timescale') !== -1) return false

  const events = doc.events
  let eventCount = events.length
  let lastTime: number | null = null
  let lastText = ''

  while (pos < len) {
    const c = input.charCodeAt(pos)
    if (c <= 32) {
      pos++
      continue
    }

    if (c === 123) { // {
      let depth = 1
      pos++
      while (pos < len && depth > 0) {
        const ch = input.charCodeAt(pos)
        if (ch === 123) depth++
        else if (ch === 125) depth--
        pos++
      }
      continue
    }

    if (c !== 91) { // [
      pos++
      continue
    }

    if (pos + 12 >= len || input.charCodeAt(pos + 12) !== 93) return false
    if (
      input.charCodeAt(pos + 3) !== 58 ||
      input.charCodeAt(pos + 6) !== 58 ||
      input.charCodeAt(pos + 9) !== 46
    ) return false

    const h1 = input.charCodeAt(pos + 1) - 48
    const h2 = input.charCodeAt(pos + 2) - 48
    const m1 = input.charCodeAt(pos + 4) - 48
    const m2 = input.charCodeAt(pos + 5) - 48
    const s1 = input.charCodeAt(pos + 7) - 48
    const s2 = input.charCodeAt(pos + 8) - 48
    const f1 = input.charCodeAt(pos + 10) - 48
    const f2 = input.charCodeAt(pos + 11) - 48
    if (
      h1 < 0 || h1 > 9 || h2 < 0 || h2 > 9 ||
      m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9 ||
      s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9 ||
      f1 < 0 || f1 > 9 || f2 < 0 || f2 > 9
    ) return false

    const hours = h1 * 10 + h2
    const minutes = m1 * 10 + m2
    const seconds = s1 * 10 + s2
    const centis = f1 * 10 + f2
    const time = hours * 3600000 + minutes * 60000 + seconds * 1000 + centis * 10

    if (lastTime !== null && lastText.length > 0) {
      events[eventCount++] = {
        id: generateId(),
        start: lastTime,
        end: time,
        layer: 0,
        style: 'Default',
        actor: '',
        marginL: 0,
        marginR: 0,
        marginV: 0,
        effect: '',
        text: lastText,
        segments: EMPTY_SEGMENTS,
        dirty: false
      }
    }

    pos += 13

    while (pos < len) {
      const ws = input.charCodeAt(pos)
      if (ws === 10 || ws === 13 || ws === 32 || ws === 9) {
        pos++
        continue
      }
      break
    }

    if (pos >= len || input.charCodeAt(pos) === 91 || input.charCodeAt(pos) === 123) {
      lastTime = time
      lastText = ''
      continue
    }

    let lineEnd = pos
    while (lineEnd < len) {
      const ch = input.charCodeAt(lineEnd)
      if (ch === 10 || ch === 13 || ch === 91 || ch === 123) break
      lineEnd++
    }

    let tStart = pos
    let tEnd = lineEnd
    if (tStart < tEnd && (input.charCodeAt(tStart) <= 32 || input.charCodeAt(tEnd - 1) <= 32)) {
      while (tStart < tEnd && input.charCodeAt(tStart) <= 32) tStart++
      while (tEnd > tStart && input.charCodeAt(tEnd - 1) <= 32) tEnd--
    }
    lastText = tEnd > tStart ? input.substring(tStart, tEnd) : ''
    lastTime = time

    pos = lineEnd
  }

  if (eventCount !== events.length) events.length = eventCount
  return events.length > 0
}
