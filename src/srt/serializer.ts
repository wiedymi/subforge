import type { SubtitleDocument, SubtitleEvent } from '../core/types.ts'
import { formatTime } from './time.ts'
import { serializeTags } from './tags.ts'

/**
 * Serializes a SubtitleDocument to SRT format.
 *
 * Generates valid SRT output with sequential numbering, timestamps in
 * HH:MM:SS,mmm format, and text with HTML-like formatting tags.
 * Automatically serializes rich text segments if the event is marked dirty.
 *
 * @param doc - The subtitle document to serialize
 * @returns SRT-formatted string ready to be written to a file
 *
 * @example
 * ```ts
 * const doc = createDocument();
 * doc.events.push({
 *   id: '1',
 *   start: 1000,
 *   end: 3000,
 *   text: '<b>Hello</b>',
 *   // ... other required fields
 * });
 *
 * const srt = toSRT(doc);
 * // Output:
 * // 1
 * // 00:00:01,000 --> 00:00:03,000
 * // <b>Hello</b>
 * ```
 */
export function toSRT(doc: SubtitleDocument): string {
  let result = ''
  const events = doc.events
  const len = events.length

  for (let i = 0; i < len; i++) {
    const event = events[i]!
    const text = event.dirty && event.segments.length > 0
      ? serializeTags(event.segments)
      : event.text

    result += (i + 1) + '\n'
    result += formatTime(event.start) + ' --> ' + formatTime(event.end) + '\n'
    result += text + '\n\n'
  }

  return result
}
