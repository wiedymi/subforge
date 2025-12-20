import type { SubtitleDocument, SubtitleEvent } from '../core/types.ts'
import { formatTime } from './time.ts'
import { serializeTags } from './tags.ts'

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
