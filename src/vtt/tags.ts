import type { TextSegment, InlineStyle, Effect } from '../core/types.ts'

interface ParseState {
  bold: boolean
  italic: boolean
  underline: boolean
}

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

export function stripTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, '')
}
