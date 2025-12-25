import type { TextSegment, InlineStyle, Effect } from '../../../core/types.ts'

/**
 * Internal state for tracking nested formatting tags during parsing.
 */
interface ParseState {
  bold: boolean
  italic: boolean
  underline: boolean
  strikeout: boolean
  color?: number
}

/**
 * Parses SRT formatting tags into structured text segments.
 *
 * Supports HTML-like tags: <b>, <i>, <u>, <s>, and <font color="#RRGGBB">.
 * Tags can be nested and are tracked using a state stack. Colors are
 * converted from RGB hex to BGR integer format.
 *
 * @param raw - Raw text containing SRT formatting tags
 * @returns Array of text segments with associated styles
 *
 * @example
 * ```ts
 * const segments = parseTags('<b>Bold</b> and <i>italic</i>');
 * // Returns:
 * // [
 * //   { text: 'Bold', style: { bold: true }, effects: [] },
 * //   { text: ' and ', style: null, effects: [] },
 * //   { text: 'italic', style: { italic: true }, effects: [] }
 * // ]
 * ```
 */
export function parseTags(raw: string): TextSegment[] {
  const segments: TextSegment[] = []
  const stateStack: ParseState[] = [{ bold: false, italic: false, underline: false, strikeout: false }]

  let textStart = 0
  let i = 0

  while (i < raw.length) {
    if (raw[i] === '<') {
      const closeIdx = raw.indexOf('>', i)
      if (closeIdx === -1) {
        i++
        continue
      }

      if (i > textStart) {
        const state = stateStack[stateStack.length - 1]!
        const style = buildStyle(state)
        segments[segments.length] = {
          text: raw.slice(textStart, i),
          style,
          effects: []
        }
      }

      const tag = raw.slice(i + 1, closeIdx).toLowerCase()
      processTag(tag, stateStack)

      i = closeIdx + 1
      textStart = i
    } else {
      i++
    }
  }

  if (textStart < raw.length) {
    const state = stateStack[stateStack.length - 1]!
    const style = buildStyle(state)
    segments[segments.length] = {
      text: raw.slice(textStart),
      style,
      effects: []
    }
  }

  return segments
}

function processTag(tag: string, stateStack: ParseState[]): void {
  const currentState = stateStack[stateStack.length - 1]!

  if (tag === 'b') {
    stateStack[stateStack.length] = { ...currentState, bold: true }
  } else if (tag === '/b') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tag === 'i') {
    stateStack[stateStack.length] = { ...currentState, italic: true }
  } else if (tag === '/i') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tag === 'u') {
    stateStack[stateStack.length] = { ...currentState, underline: true }
  } else if (tag === '/u') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tag === 's') {
    stateStack[stateStack.length] = { ...currentState, strikeout: true }
  } else if (tag === '/s') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tag.startsWith('font')) {
    const colorMatch = tag.match(/color\s*=\s*["']?#?([0-9a-f]{6})["']?/i)
    if (colorMatch) {
      const hex = colorMatch[1]!
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const color = ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)
      stateStack[stateStack.length] = { ...currentState, color }
    } else {
      stateStack[stateStack.length] = { ...currentState }
    }
  } else if (tag === '/font') {
    if (stateStack.length > 1) stateStack.pop()
  }
}

function buildStyle(state: ParseState): InlineStyle | null {
  if (!state.bold && !state.italic && !state.underline && !state.strikeout && state.color === undefined) {
    return null
  }

  const style: InlineStyle = {}
  if (state.bold) style.bold = true
  if (state.italic) style.italic = true
  if (state.underline) style.underline = true
  if (state.strikeout) style.strikeout = true
  if (state.color !== undefined) style.primaryColor = state.color

  return style
}

/**
 * Serializes text segments into SRT-formatted text with tags.
 *
 * Converts structured text segments back into HTML-like tags for SRT format.
 * Handles bold, italic, underline, strikeout, and color formatting.
 * Colors are converted from BGR integer to RGB hex format.
 *
 * @param segments - Array of text segments with styling information
 * @returns SRT-formatted text with HTML-like tags
 *
 * @example
 * ```ts
 * const segments = [
 *   { text: 'Bold', style: { bold: true }, effects: [] },
 *   { text: ' normal', style: null, effects: [] }
 * ];
 * const text = serializeTags(segments);
 * // Returns: "<b>Bold</b> normal"
 * ```
 */
export function serializeTags(segments: TextSegment[]): string {
  let result = ''

  for (const seg of segments) {
    let text = seg.text
    const openTags: string[] = []
    const closeTags: string[] = []

    if (seg.style?.bold) {
      openTags[openTags.length] = '<b>'
      closeTags.unshift('</b>')
    }
    if (seg.style?.italic) {
      openTags[openTags.length] = '<i>'
      closeTags.unshift('</i>')
    }
    if (seg.style?.underline) {
      openTags[openTags.length] = '<u>'
      closeTags.unshift('</u>')
    }
    if (seg.style?.strikeout) {
      openTags[openTags.length] = '<s>'
      closeTags.unshift('</s>')
    }
    if (seg.style?.primaryColor !== undefined) {
      const color = seg.style.primaryColor
      const r = color & 0xFF
      const g = (color >> 8) & 0xFF
      const b = (color >> 16) & 0xFF
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      openTags[openTags.length] = `<font color="${hex}">`
      closeTags.unshift('</font>')
    }

    result += openTags.join('') + text + closeTags.join('')
  }

  return result
}

/**
 * Removes all SRT formatting tags from text.
 *
 * Strips out all HTML-like tags, leaving only plain text.
 * Useful for extracting clean text content.
 *
 * @param raw - Text containing SRT formatting tags
 * @returns Plain text with all tags removed
 *
 * @example
 * ```ts
 * const plain = stripTags('<b>Bold</b> and <i>italic</i>');
 * // Returns: "Bold and italic"
 * ```
 */
export function stripTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, '')
}
