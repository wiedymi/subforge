import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'
import { formatTime } from './time.ts'
import { serializeTags } from './tags.ts'

/**
 * Serializes a SubtitleDocument to WebVTT format.
 *
 * Generates valid WebVTT output with WEBVTT header, optional REGION blocks,
 * and cues with timestamps in HH:MM:SS.mmm format (using dot separator).
 * Automatically serializes rich text segments if the event is marked dirty.
 * Regions are serialized before cues if present in the document.
 *
 * @param doc - The subtitle document to serialize
 * @returns WebVTT-formatted string ready to be written to a file
 *
 * @example
 * ```ts
 * const doc = createDocument();
 * doc.regions = [{
 *   id: 'top',
 *   width: '100%',
 *   lines: 3,
 *   regionAnchor: '0%,0%',
 *   viewportAnchor: '0%,0%',
 *   scroll: 'none'
 * }];
 * doc.events.push({
 *   id: '1',
 *   start: 1000,
 *   end: 3000,
 *   text: '<b>Hello</b>',
 *   // ... other required fields
 * });
 *
 * const vtt = toVTT(doc);
 * // Output:
 * // WEBVTT
 * //
 * // REGION
 * // id:top
 * // ...
 * //
 * // 00:00:01.000 --> 00:00:03.000
 * // <b>Hello</b>
 * ```
 */
export function toVTT(doc: SubtitleDocument): string {
  let result = 'WEBVTT\n\n'

  if (doc.regions && doc.regions.length > 0) {
    const regions = doc.regions
    const regLen = regions.length
    for (let i = 0; i < regLen; i++) {
      const region = regions[i]!
      result += 'REGION\n'
      result += 'id:' + region.id + '\n'
      result += 'width:' + region.width + '\n'
      result += 'lines:' + region.lines + '\n'
      result += 'regionanchor:' + region.regionAnchor + '\n'
      result += 'viewportanchor:' + region.viewportAnchor + '\n'
      if (region.scroll !== 'none') {
        result += 'scroll:' + region.scroll + '\n'
      }
      result += '\n'
    }
  }

  const events = doc.events
  const len = events.length
  for (let i = 0; i < len; i++) {
    const event = events[i]!
    const text = event.dirty && event.segments.length > 0
      ? serializeTags(event.segments)
      : event.text

    result += formatTime(event.start) + ' --> ' + formatTime(event.end) + '\n'
    result += text + '\n\n'
  }

  return result
}
