import type { TextSegment, InlineStyle, Effect } from '../core/types.ts'

/**
 * Internal state for tracking nested formatting tags during parsing.
 */
interface ParseState {
  bold: boolean
  italic: boolean
  underline: boolean
}

/**
 * Parses WebVTT formatting tags into structured text segments.
 *
 * Supports WebVTT-specific tags: <b>, <i>, <u>, <v> (voice), <c> (class),
 * and <lang>. Tags can be nested and are tracked using a state stack.
 * Voice and class tags are parsed but their attributes are not stored in
 * the current implementation.
 *
 * @param raw - Raw text containing WebVTT formatting tags
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
  const stateStack: ParseState[] = [{ bold: false, italic: false, underline: false }]

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

      const tag = raw.slice(i + 1, closeIdx)
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
  const tagLower = tag.toLowerCase()

  if (tagLower === 'b') {
    stateStack[stateStack.length] = { ...currentState, bold: true }
  } else if (tagLower === '/b') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tagLower === 'i') {
    stateStack[stateStack.length] = { ...currentState, italic: true }
  } else if (tagLower === '/i') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tagLower === 'u') {
    stateStack[stateStack.length] = { ...currentState, underline: true }
  } else if (tagLower === '/u') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tagLower.startsWith('v ') || tagLower.startsWith('v.')) {
    stateStack[stateStack.length] = { ...currentState }
  } else if (tagLower === '/v') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tagLower.startsWith('c.') || tagLower === 'c') {
    stateStack[stateStack.length] = { ...currentState }
  } else if (tagLower === '/c') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tagLower.startsWith('lang ')) {
    stateStack[stateStack.length] = { ...currentState }
  } else if (tagLower === '/lang') {
    if (stateStack.length > 1) stateStack.pop()
  }
}

function buildStyle(state: ParseState): InlineStyle | null {
  if (!state.bold && !state.italic && !state.underline) {
    return null
  }

  const style: InlineStyle = {}
  if (state.bold) style.bold = true
  if (state.italic) style.italic = true
  if (state.underline) style.underline = true

  return style
}

/**
 * Serializes text segments into WebVTT-formatted text with tags.
 *
 * Converts structured text segments back into WebVTT tags.
 * Currently only handles bold, italic, and underline formatting.
 * Other WebVTT-specific tags like <v>, <c>, and <lang> are not
 * generated in serialization.
 *
 * @param segments - Array of text segments with styling information
 * @returns WebVTT-formatted text with tags
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

    result += openTags.join('') + text + closeTags.join('')
  }

  return result
}

/**
 * Removes all WebVTT formatting tags from text.
 *
 * Strips out all WebVTT tags, leaving only plain text.
 * Useful for extracting clean text content.
 *
 * @param raw - Text containing WebVTT formatting tags
 * @returns Plain text with all tags removed
 *
 * @example
 * ```ts
 * const plain = stripTags('<b>Bold</b> and <v Speaker>voiced</v>');
 * // Returns: "Bold and voiced"
 * ```
 */
export function stripTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, '')
}
