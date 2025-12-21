import type { SubtitleDocument, SubtitleEvent, TextSegment, InlineStyle } from '../core/types.ts'
import { formatTime } from './time.ts'

/**
 * Options for TTML serialization
 */
export interface TTMLSerializeOptions {
  /** Include XML namespace declarations (default: true) */
  xmlns?: boolean
  /** Include head section with styles and regions (default: true) */
  includeHead?: boolean
  /** Time format - 'clock' for HH:MM:SS.mmm or 'offset' for seconds (default: 'clock') */
  format?: 'clock' | 'offset'
}

/**
 * Serialize subtitle document to TTML format
 *
 * @param doc - Subtitle document to serialize
 * @param opts - Serialization options
 * @returns TTML formatted string
 *
 * @example
 * ```ts
 * const ttml = toTTML(doc, {
 *   xmlns: true,
 *   includeHead: true,
 *   format: 'clock'
 * })
 * ```
 */
export function toTTML(doc: SubtitleDocument, opts: TTMLSerializeOptions = {}): string {
  const {
    xmlns = true,
    includeHead = true,
    format = 'clock'
  } = opts

  const lines: string[] = []

  // XML declaration
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')

  // Root element
  if (xmlns) {
    lines.push('<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">')
  } else {
    lines.push('<tt>')
  }

  // Head section
  if (includeHead) {
    lines.push('  <head>')

    // Styling section
    const styles = extractStyles(doc)
    if (styles.length > 0) {
      lines.push('    <styling>')
      for (const style of styles) {
        lines.push(`      ${style}`)
      }
      lines.push('    </styling>')
    }

    // Layout section (regions)
    const regions = extractRegions(doc)
    if (regions.length > 0) {
      lines.push('    <layout>')
      for (const region of regions) {
        lines.push(`      ${region}`)
      }
      lines.push('    </layout>')
    }

    lines.push('  </head>')
  }

  // Body section
  lines.push('  <body>')
  lines.push('    <div>')

  for (const event of doc.events) {
    const p = serializeEvent(event, format)
    lines.push(`      ${p}`)
  }

  lines.push('    </div>')
  lines.push('  </body>')
  lines.push('</tt>')

  return lines.join('\n')
}

function extractStyles(doc: SubtitleDocument): string[] {
  const styles: string[] = []
  const seenStyles = new Set<string>()

  // Extract unique styles from document
  for (const [name, style] of doc.styles.entries()) {
    if (seenStyles.has(name)) continue
    seenStyles.add(name)

    const attrs: string[] = []
    attrs.push(`xml:id="${escapeXml(name)}"`)

    if (style.fontName) {
      attrs.push(`tts:fontFamily="${escapeXml(style.fontName)}"`)
    }
    if (style.fontSize) {
      attrs.push(`tts:fontSize="${style.fontSize}px"`)
    }
    if (style.bold) {
      attrs.push(`tts:fontWeight="bold"`)
    }
    if (style.italic) {
      attrs.push(`tts:fontStyle="italic"`)
    }
    if (style.underline || style.strikeout) {
      const decorations = []
      if (style.underline) decorations.push('underline')
      if (style.strikeout) decorations.push('line-through')
      attrs.push(`tts:textDecoration="${decorations.join(' ')}"`)
    }

    // Colors (convert from ABGR to #RRGGBB)
    if (style.primaryColor) {
      const color = formatColor(style.primaryColor)
      attrs.push(`tts:color="${color}"`)
    }
    if (style.backColor) {
      const color = formatColor(style.backColor)
      attrs.push(`tts:backgroundColor="${color}"`)
    }

    styles.push(`<style ${attrs.join(' ')}/>`)
  }

  return styles
}

function extractRegions(doc: SubtitleDocument): string[] {
  const regions: string[] = []
  const seenRegions = new Set<string>()

  // Extract unique regions from events
  for (const event of doc.events) {
    if (!event.effect) continue
    if (seenRegions.has(event.effect)) continue
    seenRegions.add(event.effect)

    const attrs: string[] = []
    attrs.push(`xml:id="${escapeXml(event.effect)}"`)

    // Default region positioning
    attrs.push(`tts:origin="10% 80%"`)
    attrs.push(`tts:extent="80% 20%"`)

    regions.push(`<region ${attrs.join(' ')}/>`)
  }

  return regions
}

function serializeEvent(event: SubtitleEvent, format: 'clock' | 'offset'): string {
  const attrs: string[] = []

  // Timing
  attrs.push(`begin="${formatTime(event.start, format)}"`)
  attrs.push(`end="${formatTime(event.end, format)}"`)

  // Style reference
  if (event.style && event.style !== 'Default') {
    attrs.push(`style="${escapeXml(event.style)}"`)
  }

  // Region reference
  if (event.effect) {
    attrs.push(`region="${escapeXml(event.effect)}"`)
  }

  // Serialize text with segments
  const content = serializeSegments(event.segments.length > 0 ? event.segments : [{ text: event.text, style: null, effects: [] }])

  return `<p ${attrs.join(' ')}>${content}</p>`
}

function serializeSegments(segments: TextSegment[]): string {
  let result = ''

  for (const segment of segments) {
    const text = escapeXml(segment.text)

    if (!segment.style) {
      // Plain text
      result += text
    } else {
      // Text with inline styling
      const attrs = serializeInlineStyle(segment.style)
      if (attrs.length > 0) {
        result += `<span ${attrs.join(' ')}>${text}</span>`
      } else {
        result += text
      }
    }
  }

  return result
}

function serializeInlineStyle(style: InlineStyle): string[] {
  const attrs: string[] = []

  if (style.fontName) {
    attrs.push(`tts:fontFamily="${escapeXml(style.fontName)}"`)
  }
  if (style.fontSize) {
    attrs.push(`tts:fontSize="${style.fontSize}px"`)
  }
  if (style.bold) {
    const weight = typeof style.bold === 'number' ? style.bold : 700
    attrs.push(`tts:fontWeight="${weight}"`)
  }
  if (style.italic) {
    attrs.push(`tts:fontStyle="italic"`)
  }
  if (style.underline || style.strikeout) {
    const decorations = []
    if (style.underline) decorations.push('underline')
    if (style.strikeout) decorations.push('line-through')
    attrs.push(`tts:textDecoration="${decorations.join(' ')}"`)
  }
  if (style.primaryColor !== undefined) {
    const color = formatColor(style.primaryColor)
    attrs.push(`tts:color="${color}"`)
  }
  if (style.backColor !== undefined) {
    const color = formatColor(style.backColor)
    attrs.push(`tts:backgroundColor="${color}"`)
  }

  return attrs
}

function formatColor(color: number): string {
  // Convert ABGR to #RRGGBB or #RRGGBBAA
  const a = (color >>> 24) & 0xff
  const b = (color >>> 16) & 0xff
  const g = (color >>> 8) & 0xff
  const r = color & 0xff

  const rHex = r.toString(16).padStart(2, '0')
  const gHex = g.toString(16).padStart(2, '0')
  const bHex = b.toString(16).padStart(2, '0')

  if (a === 0xff) {
    return `#${rHex}${gHex}${bHex}`
  } else {
    const aHex = a.toString(16).padStart(2, '0')
    return `#${rHex}${gHex}${bHex}${aHex}`
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
