import type { SubtitleDocument, SubtitleEvent, TextSegment } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../core/document.ts'

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

    return { document: this.doc, errors: this.errors, warnings: [] }
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
          this.doc.events.push(event)
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
        this.doc.events.push(event)
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

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: this.lineNum, column: 1 })
    }
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
function fixEndTimes(doc: SubtitleDocument): void {
  const events = doc.events.sort((a, b) => a.start - b.start)
  for (let i = 0; i < events.length - 1; i++) {
    const current = events[i]!
    const next = events[i + 1]!
    if (current.segments.length === 0 && current.end > next.start) {
      current.end = next.start
    }
  }
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
 * const doc = parseLRC(lrc);
 * console.log(doc.info.title); // "Song Title"
 * console.log(doc.events[0].text); // "First line"
 * ```
 */
export function parseLRC(input: string): SubtitleDocument {
  const parser = new LRCParser(input, { onError: 'throw' })
  const result = parser.parse()
  fixEndTimes(result.document)
  return result.document
}

/**
 * Parses an LRC file with detailed error reporting.
 *
 * This function provides more control over error handling and returns
 * detailed parse results including errors and warnings.
 *
 * @param input - The LRC file content as a string
 * @param opts - Parse options controlling error handling and strictness
 * @returns Parse result containing the document, errors, and warnings
 *
 * @example
 * ```ts
 * const result = parseLRCResult(lrcContent, {
 *   onError: 'collect',
 *   strict: false
 * });
 * if (result.errors.length > 0) {
 *   console.error('Parse errors:', result.errors);
 * }
 * ```
 */
export function parseLRCResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new LRCParser(input, opts)
  const result = parser.parse()
  fixEndTimes(result.document)
  return result
}
