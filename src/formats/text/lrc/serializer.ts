import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import { formatTime } from './time.ts'

/**
 * Options for controlling LRC serialization output.
 */
export interface LRCSerializeOptions {
  /** Whether to include metadata tags (title, artist, etc.) in the output. Default: true */
  includeMetadata?: boolean
  /** Whether to use centiseconds (.xx) instead of milliseconds (.xxx). Default: true */
  useCentiseconds?: boolean
  /** Time offset in milliseconds to add to all timestamps. Default: 0 */
  offset?: number
}

/**
 * Serializes a subtitle document to LRC format.
 *
 * Converts subtitle events to LRC format with timestamps in [MM:SS.xx] notation.
 * Supports both simple LRC and enhanced LRC with word-level karaoke timing.
 *
 * @param doc - The subtitle document to serialize
 * @param opts - Serialization options
 * @returns LRC formatted string
 *
 * @example
 * ```ts
 * const lrc = toLRC(document, {
 *   includeMetadata: true,
 *   useCentiseconds: true,
 *   offset: 0
 * });
 * console.log(lrc);
 * // [ti:Song Title]
 * // [ar:Artist]
 * // [00:12.00]First line
 * ```
 */
export function toLRC(doc: SubtitleDocument, opts: LRCSerializeOptions = {}): string {
  const {
    includeMetadata = true,
    useCentiseconds = true,
    offset = 0
  } = opts

  let result = ''

  // Write metadata tags
  if (includeMetadata) {
    if (doc.info.title) {
      result += `[ti:${doc.info.title}]\n`
    }
    if (doc.info.author) {
      result += `[ar:${doc.info.author}]\n`
    }
    if (offset !== 0) {
      result += `[offset:${offset}]\n`
    }
  }

  // Sort events by start time
  const events = [...doc.events].sort((a, b) => a.start - b.start)

  for (const event of events) {
    const timestamp = formatTime(event.start + offset, useCentiseconds)

    // Check if event has karaoke effects (enhanced LRC)
    if (event.dirty && event.segments.length > 0) {
      const hasKaraoke = event.segments.some(s =>
        s.effects.some(e => e.type === 'karaoke')
      )

      if (hasKaraoke) {
        // Enhanced LRC with word timing
        result += `[${timestamp}]`
        let currentTime = event.start

        for (const segment of event.segments) {
          const karaokeEffect = segment.effects.find(e => e.type === 'karaoke')
          if (karaokeEffect && karaokeEffect.type === 'karaoke') {
            currentTime += karaokeEffect.params.duration
            const wordTime = formatTime(currentTime + offset, useCentiseconds)
            result += `<${wordTime}>${segment.text}`
          } else {
            result += segment.text
          }
        }
        result += '\n'
      } else {
        // Regular segments without karaoke
        const text = event.segments.map(s => s.text).join('')
        result += `[${timestamp}]${text}\n`
      }
    } else {
      // Simple LRC
      result += `[${timestamp}]${event.text}\n`
    }
  }

  return result
}
