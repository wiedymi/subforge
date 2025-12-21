import type { SubtitleDocument } from '../core/types.ts'
import { formatTime } from './time.ts'

/**
 * Serialize subtitle document to RealText format
 *
 * @param doc - Subtitle document to serialize
 * @returns RealText formatted string
 *
 * @example
 * ```ts
 * const rt = toRealText(doc)
 * ```
 */
export function toRealText(doc: SubtitleDocument): string {
  let result = '<window duration="'

  // Calculate total duration
  const events = doc.events
  if (events.length > 0) {
    const lastEvent = events[events.length - 1]!
    const totalMs = lastEvent.end
    result += formatTime(totalMs)
  } else {
    result += '00:00:00.00'
  }

  result += '" wordwrap="true" bgcolor="black">\n'

  for (let i = 0; i < events.length; i++) {
    const event = events[i]!

    result += '<time begin="' + formatTime(event.start) + '"/>\n'
    result += '<clear/>'
    result += escapeText(event.text)
    result += '\n'
  }

  result += '</window>\n'
  return result
}

function escapeText(text: string): string {
  // Convert newlines to <br/>
  let result = text.replace(/\n/g, '<br/>')

  // Escape XML entities (but preserve existing tags)
  // This is a simple implementation - in production you'd want more robust handling
  result = result.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;')

  return result
}
