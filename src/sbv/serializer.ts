import type { SubtitleDocument } from '../core/types.ts'
import { formatTime } from './time.ts'

/**
 * Serializes a subtitle document to SBV format.
 *
 * Converts subtitle events to SBV format with timestamp pairs in H:MM:SS.mmm,H:MM:SS.mmm notation.
 * Each subtitle is followed by a blank line separator.
 *
 * @param doc - The subtitle document to serialize
 * @returns SBV formatted string
 *
 * @example
 * ```ts
 * const sbv = toSBV(document);
 * console.log(sbv);
 * // 0:00:01.500,0:00:04.000
 * // First subtitle
 * //
 * // 0:00:05.000,0:00:08.000
 * // Second subtitle
 * ```
 */
export function toSBV(doc: SubtitleDocument): string {
  let result = ''
  const events = doc.events
  const len = events.length

  for (let i = 0; i < len; i++) {
    const event = events[i]!
    // SBV doesn't support styling, so always use plain text
    const text = event.text

    result += formatTime(event.start) + ',' + formatTime(event.end) + '\n'
    result += text + '\n\n'
  }

  return result
}
