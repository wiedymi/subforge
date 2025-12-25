import type { TextSegment, InlineStyle } from '../../../core/types.ts'

/**
 * Internal state for tracking style changes during tag parsing.
 */
interface ParseState {
  /** Bold text enabled */
  bold: boolean
  /** Italic text enabled */
  italic: boolean
  /** Underlined text enabled */
  underline: boolean
  /** Strikethrough text enabled */
  strikeout: boolean
  /** Primary text color (BGR format) */
  color?: number
  /** Font family name */
  fontName?: string
  /** Font size in points */
  fontSize?: number
}

/**
 * Parses MicroDVD inline tags into structured text segments.
 *
 * Supports formatting tags:
 * - {y:b} - Bold
 * - {y:i} - Italic
 * - {y:u} - Underline
 * - {y:s} - Strikeout
 * - {C:$BBGGRR} - Color (BGR hex format)
 * - {f:FontName} - Font name
 * - {s:size} - Font size
 *
 * @param raw - Raw text containing MicroDVD tags
 * @returns Array of text segments with parsed styles
 *
 * @example
 * ```ts
 * const segments = parseTags('{y:b}Bold text{y:i} and italic');
 * console.log(segments[0].style?.bold); // true
 * console.log(segments[1].style?.italic); // true
 * ```
 */
export function parseTags(raw: string): TextSegment[] {
  const segments: TextSegment[] = []
  const stateStack: ParseState[] = [{ bold: false, italic: false, underline: false, strikeout: false }]

  let textStart = 0
  let i = 0

  while (i < raw.length) {
    if (raw[i] === '{') {
      const closeIdx = raw.indexOf('}', i)
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

  if (!tag.includes(':')) return

  const colonIdx = tag.indexOf(':')
  const prefix = tag.slice(0, colonIdx).toLowerCase()
  const value = tag.slice(colonIdx + 1)

  if (prefix === 'y') {
    // Formatting tags: {y:b} bold, {y:i} italic, {y:u} underline, {y:s} strikeout
    const newState = { ...currentState }
    for (const char of value.toLowerCase()) {
      if (char === 'b') newState.bold = true
      else if (char === 'i') newState.italic = true
      else if (char === 'u') newState.underline = true
      else if (char === 's') newState.strikeout = true
    }
    stateStack[stateStack.length] = newState
  } else if (prefix === 'c' || prefix === 'C') {
    // Color tag: {C:$BBGGRR} or {c:$BBGGRR}
    if (value.startsWith('$') && value.length === 7) {
      const hex = value.slice(1)
      const bb = parseInt(hex.slice(0, 2), 16)
      const gg = parseInt(hex.slice(2, 4), 16)
      const rr = parseInt(hex.slice(4, 6), 16)
      const color = ((bb & 0xFF) << 16) | ((gg & 0xFF) << 8) | (rr & 0xFF)
      stateStack[stateStack.length] = { ...currentState, color }
    }
  } else if (prefix === 'f') {
    // Font name: {f:FontName}
    stateStack[stateStack.length] = { ...currentState, fontName: value }
  } else if (prefix === 's') {
    // Font size: {s:size}
    const size = parseInt(value, 10)
    if (!isNaN(size)) {
      stateStack[stateStack.length] = { ...currentState, fontSize: size }
    }
  }
}

function buildStyle(state: ParseState): InlineStyle | null {
  if (!state.bold && !state.italic && !state.underline && !state.strikeout &&
      state.color === undefined && state.fontName === undefined && state.fontSize === undefined) {
    return null
  }

  const style: InlineStyle = {}
  if (state.bold) style.bold = true
  if (state.italic) style.italic = true
  if (state.underline) style.underline = true
  if (state.strikeout) style.strikeout = true
  if (state.color !== undefined) style.primaryColor = state.color
  if (state.fontName !== undefined) style.fontName = state.fontName
  if (state.fontSize !== undefined) style.fontSize = state.fontSize

  return style
}

/**
 * Serializes text segments with inline styles back to MicroDVD tag format.
 *
 * Converts structured text segments into MicroDVD tagged text.
 * Combines multiple formatting attributes into appropriate tags.
 *
 * @param segments - Array of text segments with inline styles
 * @returns String with MicroDVD formatting tags
 *
 * @example
 * ```ts
 * const segments = [
 *   { text: 'Bold', style: { bold: true }, effects: [] },
 *   { text: ' and italic', style: { italic: true }, effects: [] }
 * ];
 * const tagged = serializeTags(segments);
 * console.log(tagged); // "{y:b}Bold{y:i} and italic"
 * ```
 */
export function serializeTags(segments: TextSegment[]): string {
  let result = ''
  let activeStyles: string[] = []

  for (const seg of segments) {
    let text = seg.text

    // Build tags for this segment
    const tags: string[] = []

    if (seg.style) {
      const formatChars: string[] = []
      if (seg.style.bold) formatChars.push('b')
      if (seg.style.italic) formatChars.push('i')
      if (seg.style.underline) formatChars.push('u')
      if (seg.style.strikeout) formatChars.push('s')

      if (formatChars.length > 0) {
        tags.push(`{y:${formatChars.join('')}}`)
      }

      if (seg.style.primaryColor !== undefined) {
        const color = seg.style.primaryColor
        const rr = color & 0xFF
        const gg = (color >> 8) & 0xFF
        const bb = (color >> 16) & 0xFF
        const hex = `${bb.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${rr.toString(16).padStart(2, '0')}`
        tags.push(`{C:$${hex}}`)
      }

      if (seg.style.fontName !== undefined) {
        tags.push(`{f:${seg.style.fontName}}`)
      }

      if (seg.style.fontSize !== undefined) {
        tags.push(`{s:${seg.style.fontSize}}`)
      }
    }

    result += tags.join('') + text
  }

  return result
}

/**
 * Removes all MicroDVD formatting tags from text.
 *
 * Strips all curly brace tags, leaving only plain text.
 *
 * @param raw - Text containing MicroDVD tags
 * @returns Plain text with all tags removed
 *
 * @example
 * ```ts
 * stripTags('{y:b}Bold text{y:i} italic') // "Bold text italic"
 * stripTags('{C:$FF0000}Red text')        // "Red text"
 * ```
 */
export function stripTags(raw: string): string {
  return raw.replace(/\{[^}]*\}/g, '')
}
