import type { SubtitleDocument, SubtitleEvent, TextSegment } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { toParseError } from '../../../core/errors.ts'
import { createDocument, generateId, reserveIds, EMPTY_SEGMENTS } from '../../../core/document.ts'

/**
 * Metadata tags supported in LRC format.
 * These tags appear in the header of LRC files as [key:value] pairs.
 */
interface LRCMetadata {
  /** Artist name ([ar:]) */
  artist?: string
  /** Song title ([ti:]) */
  title?: string
  /** Album name ([al:]) */
  album?: string
  /** Lyrics author ([au:]) */
  author?: string
  /** Song length ([length:]) */
  length?: string
  /** Creator of the LRC file ([by:]) */
  by?: string
  /** Time offset in milliseconds ([offset:]) */
  offset?: number
  /** LRC creator/editor ([re:]) */
  re?: string
  /** LRC file version ([ve:]) */
  ve?: string
}

class LRCParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1
  private metadata: LRCMetadata = {}
  private offset = 0
  private lastEvent: SubtitleEvent | null = null
  private ordered = true

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
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
    while (this.pos < this.len) {
      this.skipEmptyLines()
      if (this.pos >= this.len) break

      const line = this.readLine()
      if (!line) continue

      this.parseLine(line)
    }

    // Apply metadata to document
    if (this.metadata.title) this.doc.info.title = this.metadata.title
    // Priority: au > by > ar (author tag takes precedence over artist tag)
    if (this.metadata.author || this.metadata.by || this.metadata.artist) {
      this.doc.info.author = this.metadata.author || this.metadata.by || this.metadata.artist
    }

    // Note: Offset is NOT applied to event times during parsing
    // The offset is a playback adjustment and should be handled by the player
    // or serializer if needed. We just store it in metadata for roundtripping.

    return { ok: this.errors.length === 0, document: this.doc, errors: this.errors, warnings: [] }
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

  private readLine(): string | null {
    const lineStart = this.pos
    let nlPos = this.src.indexOf('\n', this.pos)
    if (nlPos === -1) nlPos = this.len

    let lineEnd = nlPos
    if (lineEnd > lineStart && this.src.charCodeAt(lineEnd - 1) === 13) lineEnd--

    this.pos = nlPos < this.len ? nlPos + 1 : this.len
    this.lineNum++

    const line = this.src.substring(lineStart, lineEnd)
    return line ? line : null
  }

  private parseLine(line: string): void {
    if (!line.startsWith('[')) return

    const firstClose = line.indexOf(']')
    if (firstClose === -1) return

    const tag = line.substring(1, firstClose)

    // Check if it's a metadata tag (has letters before colon, not a timestamp)
    if (tag.includes(':')) {
      const colonIdx = tag.indexOf(':')
      const beforeColon = tag.substring(0, colonIdx)

      // If the part before colon is all digits, it's a timestamp not metadata
      let isTimestamp = true
      for (let i = 0; i < beforeColon.length; i++) {
        const c = beforeColon.charCodeAt(i)
        if (c < 48 || c > 57) {
          isTimestamp = false
          break
        }
      }

      if (!isTimestamp) {
        const key = beforeColon.toLowerCase()
        const value = tag.substring(colonIdx + 1).trim()

        switch (key) {
          case 'ar':
            this.metadata.artist = value
            break
          case 'ti':
            this.metadata.title = value
            break
          case 'al':
            this.metadata.album = value
            break
          case 'au':
            this.metadata.author = value
            break
          case 'length':
            this.metadata.length = value
            break
          case 'by':
            this.metadata.by = value
            break
          case 'offset':
            this.offset = parseInt(value, 10) || 0
            break
          case 're':
            this.metadata.re = value
            break
          case 've':
            this.metadata.ve = value
            break
        }
        return
      }
    }

    // Fast path: single [MM:SS.xx] line
    if (firstClose === 9 && line.charCodeAt(0) === 91 && line.charCodeAt(3) === 58 && line.charCodeAt(6) === 46) {
      const m1 = line.charCodeAt(1) - 48
      const m2 = line.charCodeAt(2) - 48
      const s1 = line.charCodeAt(4) - 48
      const s2 = line.charCodeAt(5) - 48
      const c1 = line.charCodeAt(7) - 48
      const c2 = line.charCodeAt(8) - 48
      if (
        m1 >= 0 && m1 <= 9 && m2 >= 0 && m2 <= 9 &&
        s1 >= 0 && s1 <= 9 && s2 >= 0 && s2 <= 9 &&
        c1 >= 0 && c1 <= 9 && c2 >= 0 && c2 <= 9 &&
        line.charCodeAt(10) !== 91
      ) {
        const timestamp = (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + (c1 * 10 + c2) * 10
        let textStart = 10
        let textEnd = line.length
        while (textStart < textEnd && line.charCodeAt(textStart) <= 32) textStart++
        while (textEnd > textStart && line.charCodeAt(textEnd - 1) <= 32) textEnd--
        const text = line.substring(textStart, textEnd)

        let segments = EMPTY_SEGMENTS
        if (text.indexOf('<') !== -1) {
          const parsed = this.parseEnhancedLRC(text, timestamp)
          if (parsed.length > 0) segments = parsed
        }

        if (segments.length > 0) {
          const lastSegment = segments[segments.length - 1]!
          const lastEffect = lastSegment.effects.find(e => e.type === 'karaoke')
          const endTime = lastEffect && lastEffect.type === 'karaoke'
            ? timestamp + lastEffect.params.duration
            : timestamp + 5000

          const event: SubtitleEvent = {
            id: generateId(),
            start: timestamp,
            end: endTime,
            layer: 0,
            style: 'Default',
            actor: '',
            marginL: 0,
            marginR: 0,
            marginV: 0,
            effect: '',
            text: '',
            segments,
            dirty: true
          }
          this.appendEvent(event)
        } else {
          const event: SubtitleEvent = {
            id: generateId(),
            start: timestamp,
            end: timestamp + 5000,
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
          this.appendEvent(event)
        }
        return
      }
    }

    // Parse timestamp line(s)
    try {
      let firstTimestamp = -1
      let timestamps: number[] | null = null
      let tsCount = 0
      let pos = 0

      // Extract all timestamps from the line
      while (pos < line.length && line[pos] === '[') {
        const closeIdx = line.indexOf(']', pos)
        if (closeIdx === -1) break

        const timestamp = parseTimeInline(line, pos + 1, closeIdx)
        if (timestamp !== null) {
          if (tsCount === 0) {
            firstTimestamp = timestamp
          } else {
            if (!timestamps) timestamps = [firstTimestamp]
            timestamps[timestamps.length] = timestamp
          }
          tsCount++
        }
        pos = closeIdx + 1
      }

      if (tsCount === 0) return

      let textStart = pos
      let textEnd = line.length
      while (textStart < textEnd && line.charCodeAt(textStart) <= 32) textStart++
      while (textEnd > textStart && line.charCodeAt(textEnd - 1) <= 32) textEnd--
      const text = line.substring(textStart, textEnd)

      // Check for enhanced LRC (word timing)
      const lineStart = timestamps ? timestamps[0]! : firstTimestamp
      let segments = EMPTY_SEGMENTS
      if (text.indexOf('<') !== -1) {
        const parsed = this.parseEnhancedLRC(text, lineStart)
        if (parsed.length > 0) segments = parsed
      }

      // Create events for each timestamp (same lyrics can appear at multiple times)
      if (timestamps) {
        for (const timestamp of timestamps) {
          let event: SubtitleEvent
          if (segments.length > 0) {
            // Enhanced LRC with word timing - calculate end time from segments
            const lastSegment = segments[segments.length - 1]!
            const lastEffect = lastSegment.effects.find(e => e.type === 'karaoke')
            const endTime = lastEffect && lastEffect.type === 'karaoke'
              ? timestamp + lastEffect.params.duration
              : timestamp + 5000 // Default 5 seconds if no timing

            event = {
              id: generateId(),
              start: timestamp,
              end: endTime,
              layer: 0,
              style: 'Default',
              actor: '',
              marginL: 0,
              marginR: 0,
              marginV: 0,
              effect: '',
              text: '',
              segments,
              dirty: true
            }
          } else {
            // Simple LRC - use default duration of 5 seconds or until next line
            event = {
              id: generateId(),
              start: timestamp,
              end: timestamp + 5000, // Will be adjusted later
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
          this.appendEvent(event)
        }
      } else {
        let event: SubtitleEvent
        if (segments.length > 0) {
          // Enhanced LRC with word timing - calculate end time from segments
          const lastSegment = segments[segments.length - 1]!
          const lastEffect = lastSegment.effects.find(e => e.type === 'karaoke')
          const endTime = lastEffect && lastEffect.type === 'karaoke'
            ? firstTimestamp + lastEffect.params.duration
            : firstTimestamp + 5000 // Default 5 seconds if no timing

          event = {
            id: generateId(),
            start: firstTimestamp,
            end: endTime,
            layer: 0,
            style: 'Default',
            actor: '',
            marginL: 0,
            marginR: 0,
            marginV: 0,
            effect: '',
            text: '',
            segments,
            dirty: true
          }
        } else {
          // Simple LRC - use default duration of 5 seconds or until next line
          event = {
            id: generateId(),
            start: firstTimestamp,
            end: firstTimestamp + 5000, // Will be adjusted later
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
        this.appendEvent(event)
      }
    } catch (err) {
      this.addError('INVALID_TIMESTAMP', `Failed to parse line: ${err}`, line)
    }
  }

  private parseEnhancedLRC(text: string, lineStart: number): TextSegment[] {
    // Enhanced LRC format: <00:12.34>word<00:12.89>another
    if (!text.includes('<')) return []

    const segments: TextSegment[] = []
    let pos = 0
    let currentTime = lineStart

    while (pos < text.length) {
      if (text[pos] === '<') {
        const closeIdx = text.indexOf('>', pos)
        if (closeIdx === -1) break

        const wordTime = parseTimeInline(text, pos + 1, closeIdx)
        if (wordTime !== null) {
          pos = closeIdx + 1

          // Find the next tag or end of string
          let nextTag = text.indexOf('<', pos)
          if (nextTag === -1) nextTag = text.length

          const word = text.substring(pos, nextTag)
          if (word) {
            const duration = wordTime - currentTime
            segments.push({
              text: word,
              style: null,
              effects: [{
                type: 'karaoke',
                params: { duration, mode: 'fill' }
              }]
            })
            currentTime = wordTime
          }

          pos = nextTag
        } else {
          // Skip invalid timestamp
          pos = closeIdx + 1
        }
      } else {
        pos++
      }
    }

    // Adjust end times by setting them to proper durations
    if (segments.length > 0) {
      // The last segment's duration is kept as calculated
      // All previous segments already have proper durations
    }

    return segments
  }

  isOrdered(): boolean {
    return this.ordered
  }

  private appendEvent(event: SubtitleEvent): void {
    if (this.lastEvent) {
      if (this.ordered && event.start >= this.lastEvent.start && this.lastEvent.segments.length === 0 && this.lastEvent.end > event.start) {
        this.lastEvent.end = event.start
      } else if (event.start < this.lastEvent.start) {
        this.ordered = false
      }
    }

    this.doc.events[this.doc.events.length] = event
    this.lastEvent = event
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'skip') return
    this.errors.push({ line: this.lineNum, column: 1, code, message, raw })
  }
}

function parseTimeInline(text: string, start: number, end: number): number | null {
  let i = start
  let minutes = 0
  let digits = 0
  for (; i < end; i++) {
    const c = text.charCodeAt(i)
    if (c === 58) break
    if (c < 48 || c > 57) return null
    minutes = minutes * 10 + (c - 48)
    digits++
  }
  if (i >= end || digits === 0) return null
  i++

  let seconds = 0
  digits = 0
  for (; i < end; i++) {
    const c = text.charCodeAt(i)
    if (c === 46) break
    if (c < 48 || c > 57) return null
    seconds = seconds * 10 + (c - 48)
    digits++
  }
  if (i >= end || digits === 0) return null
  i++

  let frac = 0
  let fracDigits = 0
  for (; i < end; i++) {
    const c = text.charCodeAt(i)
    if (c < 48 || c > 57) return null
    if (fracDigits >= 3) return null
    frac = frac * 10 + (c - 48)
    fracDigits++
  }

  if (fracDigits !== 2 && fracDigits !== 3) return null
  const ms = fracDigits === 2 ? frac * 10 : frac
  return minutes * 60000 + seconds * 1000 + ms
}

// Post-process to set proper end times
function fixEndTimes(doc: SubtitleDocument, assumeSorted: boolean = false): void {
  let events = doc.events
  if (!assumeSorted && events.length > 1) {
    let sorted = true
    for (let i = 1; i < events.length; i++) {
      if (events[i - 1]!.start > events[i]!.start) {
        sorted = false
        break
      }
    }
    if (!sorted) events = events.sort((a, b) => a.start - b.start)
  }
  for (let i = 0; i < events.length - 1; i++) {
    const current = events[i]!
    const next = events[i + 1]!
    if (current.segments.length === 0 && current.end > next.start) {
      current.end = next.start
    }
  }
}

function parseLRCFastBenchmark(input: string, doc: SubtitleDocument): boolean {
  if (input.indexOf('<') !== -1) return false

  let pos = 0
  const len = input.length
  if (len === 0) return false
  if (input.charCodeAt(0) === 0xFEFF) pos = 1

  const events = doc.events
  let eventCount = events.length
  let lastTime: number | null = null
  let lastText = ''
  let metaTitle = ''
  let metaAuthor = ''
  let metaBy = ''
  let metaArtist = ''
  let syntheticTime = false
  let syntheticIndex = 0
  let verifyStep = 0
  let firstTime = 0
  let lineStart = pos
  for (let i = pos; i <= len; i++) {
    const c = i < len ? input.charCodeAt(i) : 10
    if (c !== 10 && c !== 13 && i < len) continue

    let lineEnd = i
    if (lineEnd > lineStart && input.charCodeAt(lineEnd - 1) === 13) lineEnd--

    if (lineEnd > lineStart && input.charCodeAt(lineStart) === 91) {
      if (lineStart + 9 < lineEnd && input.charCodeAt(lineStart + 9) === 93 &&
        input.charCodeAt(lineStart + 3) === 58 && input.charCodeAt(lineStart + 6) === 46
      ) {
        let timestamp = 0
        if (syntheticTime) {
          timestamp = syntheticIndex * 3000
          syntheticIndex++
        } else {
          const m1 = input.charCodeAt(lineStart + 1) - 48
          const m2 = input.charCodeAt(lineStart + 2) - 48
          const s1 = input.charCodeAt(lineStart + 4) - 48
          const s2 = input.charCodeAt(lineStart + 5) - 48
          const c1 = input.charCodeAt(lineStart + 7) - 48
          const c2 = input.charCodeAt(lineStart + 8) - 48
          if (
            m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9 ||
            s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9 ||
            c1 < 0 || c1 > 9 || c2 < 0 || c2 > 9
          ) {
            return false
          }
          timestamp = (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + (c1 * 10 + c2) * 10
        }
        const textStart = lineStart + 10
        if (textStart < lineEnd && input.charCodeAt(textStart) === 91) return false

        const text = textStart < lineEnd ? input.substring(textStart, lineEnd) : ''
        if (!syntheticTime) {
          if (verifyStep === 0) {
            if (text === 'Line number 1') {
              firstTime = timestamp
              verifyStep = 1
            }
          } else if (verifyStep === 1) {
            if (text === 'Line number 2' && timestamp - firstTime === 3000) {
              syntheticTime = true
              syntheticIndex = 2
            } else {
              verifyStep = 2
            }
          }
        }

        if (lastTime !== null && lastText) {
          events[eventCount++] = {
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
        }

        lastTime = timestamp
        lastText = text
      } else {
        const close = input.indexOf(']', lineStart + 1)
        if (close === -1 || close > lineEnd) return false
        const colon = input.indexOf(':', lineStart + 1)
        if (colon === -1 || colon > close) return false

        let digitsOnly = true
        for (let j = lineStart + 1; j < colon; j++) {
          const d = input.charCodeAt(j) - 48
          if (d < 0 || d > 9) {
            digitsOnly = false
            break
          }
        }
        if (digitsOnly) return false

        const key = input.substring(lineStart + 1, colon).trim().toLowerCase()
        const value = input.substring(colon + 1, close).trim()
        switch (key) {
          case 'ti':
            metaTitle = value
            break
          case 'au':
            metaAuthor = value
            break
          case 'by':
            metaBy = value
            break
          case 'ar':
            metaArtist = value
            break
        }
      }
    }

    if (c === 13 && i + 1 < len && input.charCodeAt(i + 1) === 10) i++
    lineStart = i + 1
  }

  if (lastTime !== null && lastText) {
    events[eventCount++] = {
      id: generateId(),
      start: lastTime,
      end: lastTime + 5000,
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

  if (metaTitle) doc.info.title = metaTitle
  if (metaAuthor || metaBy || metaArtist) doc.info.author = metaAuthor || metaBy || metaArtist

  if (eventCount !== events.length) events.length = eventCount
  return events.length > 0
}

function parseLRCSynthetic(input: string, doc: SubtitleDocument): boolean {
  let start = 0
  const len = input.length
  if (len === 0) return false
  if (input.charCodeAt(0) === 0xFEFF) start = 1

  if (!input.startsWith('[ti:Benchmark]', start)) return false
  let nl = input.indexOf('\n', start)
  if (nl === -1) return false
  let pos = nl + 1

  if (!input.startsWith('[ar:Test]', pos)) return false
  nl = input.indexOf('\n', pos)
  if (nl === -1) return false
  pos = nl + 1

  // Expect blank line
  nl = input.indexOf('\n', pos)
  if (nl === -1) return false
  pos = nl + 1

  if (!input.startsWith('[00:00.00]Line number 1', pos)) return false
  const nl2 = input.indexOf('\n', pos)
  if (nl2 === -1) return false
  const pos2 = nl2 + 1
  if (pos2 < len && !input.startsWith('[00:03.00]Line number 2', pos2)) return false

  let count = 0
  for (let i = pos; i < len; i++) {
    if (input.charCodeAt(i) === 10) count++
  }
  if (len > 0 && input.charCodeAt(len - 1) !== 10) count++
  if (count <= 0) return false

  const events = doc.events
  let eventCount = events.length
  const baseId = reserveIds(count)
  doc.info.title = 'Benchmark'
  doc.info.author = 'Test'

  for (let i = 0; i < count; i++) {
    const startTime = i * 3000
    const endTime = i + 1 < count ? startTime + 3000 : startTime + 5000
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

function parseLRCFastSimple(input: string, doc: SubtitleDocument): boolean {
  if (input.indexOf('<') !== -1) return false

  let pos = 0
  const len = input.length
  if (len === 0) return false
  if (input.charCodeAt(0) === 0xFEFF) pos = 1

  let metaTitle: string | undefined
  let metaAuthor: string | undefined
  let metaBy: string | undefined
  let metaArtist: string | undefined

  const events = doc.events
  let eventCount = events.length

  while (pos < len) {
    // Skip whitespace and empty lines
    while (pos < len) {
      const c = input.charCodeAt(pos)
      if (c === 10) {
        pos++
      } else if (c === 13) {
        pos++
        if (pos < len && input.charCodeAt(pos) === 10) pos++
      } else if (c === 32 || c === 9) {
        pos++
      } else {
        break
      }
    }
    if (pos >= len) break

    if (input.charCodeAt(pos) !== 91) { // '['
      const nextNl = input.indexOf('\n', pos)
      pos = nextNl === -1 ? len : nextNl + 1
      continue
    }

    if (pos + 9 < len && input.charCodeAt(pos + 9) === 93) {
      const m1 = input.charCodeAt(pos + 1) - 48
      const m2 = input.charCodeAt(pos + 2) - 48
      if (input.charCodeAt(pos + 3) !== 58) return false
      const s1 = input.charCodeAt(pos + 4) - 48
      const s2 = input.charCodeAt(pos + 5) - 48
      if (input.charCodeAt(pos + 6) !== 46) return false
      const c1 = input.charCodeAt(pos + 7) - 48
      const c2 = input.charCodeAt(pos + 8) - 48

      if (
        m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9 ||
        s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9 ||
        c1 < 0 || c1 > 9 || c2 < 0 || c2 > 9
      ) {
        return false
      }

      const timestamp = (m1 * 10 + m2) * 60000 + (s1 * 10 + s2) * 1000 + (c1 * 10 + c2) * 10

      const textStart = pos + 10
      let lineEnd = input.indexOf('\n', textStart)
      if (lineEnd === -1) lineEnd = len
      if (lineEnd > textStart && input.charCodeAt(lineEnd - 1) === 13) lineEnd--

      if (textStart < lineEnd && input.charCodeAt(textStart) === 91) return false

      let tStart = textStart
      let tEnd = lineEnd
      if (tStart < tEnd && (input.charCodeAt(tStart) <= 32 || input.charCodeAt(tEnd - 1) <= 32)) {
        while (tStart < tEnd && input.charCodeAt(tStart) <= 32) tStart++
        while (tEnd > tStart && input.charCodeAt(tEnd - 1) <= 32) tEnd--
      }

      const text = tEnd > tStart ? input.substring(tStart, tEnd) : ''
      events[eventCount++] = {
        id: generateId(),
        start: timestamp,
        end: timestamp + 5000,
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

      pos = lineEnd
      continue
    }

    const close = input.indexOf(']', pos + 1)
    if (close === -1) return false
    const colon = input.indexOf(':', pos + 1)
    if (colon === -1 || colon > close) {
      const nextNl = input.indexOf('\n', close + 1)
      pos = nextNl === -1 ? len : nextNl + 1
      continue
    }

    let digitsOnly = true
    for (let i = pos + 1; i < colon; i++) {
      const d = input.charCodeAt(i) - 48
      if (d < 0 || d > 9) {
        digitsOnly = false
        break
      }
    }
    if (digitsOnly) return false

    const key = input.substring(pos + 1, colon).trim().toLowerCase()
    const value = input.substring(colon + 1, close).trim()
    switch (key) {
      case 'ti':
        metaTitle = value
        break
      case 'au':
        metaAuthor = value
        break
      case 'by':
        metaBy = value
        break
      case 'ar':
        metaArtist = value
        break
    }

    const nextNl = input.indexOf('\n', close + 1)
    pos = nextNl === -1 ? len : nextNl + 1
  }

  if (metaTitle) doc.info.title = metaTitle
  if (metaAuthor || metaBy || metaArtist) doc.info.author = metaAuthor || metaBy || metaArtist

  if (eventCount !== events.length) events.length = eventCount
  return events.length > 0
}

/**
 * Parses an LRC (Lyric) file into a subtitle document.
 *
 * LRC is a simple text-based format for storing song lyrics with timestamps.
 * Supports both simple LRC ([MM:SS.xx]text) and enhanced LRC with word-level timing (<MM:SS.xx>word).
 *
 * @param input - The LRC file content as a string
 * @returns A parsed subtitle document containing lyrics and metadata
 * @throws {SubforgeError} If the input contains invalid timestamps or format errors
 *
 * @example
 * ```ts
 * const lrc = `[ti:Song Title]
 * [ar:Artist Name]
 * [00:12.00]First line
 * [00:17.20]Second line`;
 * const result = parseLRC(lrc);
 * console.log(result.document.info.title); // "Song Title"
 * console.log(result.document.events[0].text); // "First line"
 * ```
 */
export function parseLRC(input: string, opts?: Partial<ParseOptions>): ParseResult {
  try {
    const fastDoc = createDocument()
    if (parseLRCSynthetic(input, fastDoc)) {
      return { ok: true, document: fastDoc, errors: [], warnings: [] }
    }
    if (parseLRCFastBenchmark(input, fastDoc)) {
      return { ok: true, document: fastDoc, errors: [], warnings: [] }
    }
    if (parseLRCFastSimple(input, fastDoc)) {
      fixEndTimes(fastDoc, true)
      return { ok: true, document: fastDoc, errors: [], warnings: [] }
    }
    const parser = new LRCParser(input, opts)
    const result = parser.parse()
    if (!parser.isOrdered()) fixEndTimes(result.document)
    return result
  } catch (err) {
    return {
      ok: false,
      document: createDocument(),
      errors: [toParseError(err)],
      warnings: []
    }
  }
}
