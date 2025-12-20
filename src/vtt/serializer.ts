import type { SubtitleDocument, SubtitleEvent } from '../core/types.ts'
import { formatTime } from './time.ts'
import { serializeTags } from './tags.ts'

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
