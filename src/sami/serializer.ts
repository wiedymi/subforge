import type { SubtitleDocument, SubtitleEvent, TextSegment } from '../core/types.ts'
import { generateCSS } from './css.ts'

/**
 * Serialize subtitle document to SAMI format
 *
 * @param doc - Subtitle document to serialize
 * @returns SAMI formatted string
 *
 * @example
 * ```ts
 * const sami = toSAMI(doc)
 * ```
 */
export function toSAMI(doc: SubtitleDocument): string {
  const title = doc.info.title || 'Subtitle'

  let result = '<SAMI>\n<HEAD>\n'
  result += `<TITLE>${escapeHTML(title)}</TITLE>\n`
  result += '<STYLE TYPE="text/css">\n<!--\n'

  // Generate CSS from styles
  result += generateCSS(doc.styles)

  result += '-->\n</STYLE>\n</HEAD>\n<BODY>\n'

  // Sort events by start time
  const sortedEvents = [...doc.events].sort((a, b) => a.start - b.start)

  // Output SYNC points
  for (const event of sortedEvents) {
    const text = event.dirty && event.segments.length > 0
      ? serializeTags(event.segments)
      : escapeHTML(event.text)

    const className = event.style !== 'Default' ? event.style.toUpperCase().replace(/[^A-Z0-9]/g, '') : 'ENCC'

    result += `<SYNC Start=${event.start}><P Class=${className}>${text}</P>\n`

    // Add clear marker at end time
    if (event.end > event.start) {
      result += `<SYNC Start=${event.end}><P Class=${className}>&nbsp;</P>\n`
    }
  }

  result += '</BODY>\n</SAMI>\n'
  return result
}

function serializeTags(segments: TextSegment[]): string {
  let result = ''

  for (const seg of segments) {
    let text = escapeHTML(seg.text)
    const openTags: string[] = []
    const closeTags: string[] = []

    if (seg.style?.bold) {
      openTags.push('<b>')
      closeTags.unshift('</b>')
    }
    if (seg.style?.italic) {
      openTags.push('<i>')
      closeTags.unshift('</i>')
    }
    if (seg.style?.underline) {
      openTags.push('<u>')
      closeTags.unshift('</u>')
    }
    if (seg.style?.strikeout) {
      openTags.push('<s>')
      closeTags.unshift('</s>')
    }
    if (seg.style?.primaryColor !== undefined) {
      const color = seg.style.primaryColor
      const r = color & 0xFF
      const g = (color >> 8) & 0xFF
      const b = (color >> 16) & 0xFF
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      openTags.push(`<font color="${hex}">`)
      closeTags.unshift('</font>')
    }

    result += openTags.join('') + text + closeTags.join('')
  }

  return result
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
