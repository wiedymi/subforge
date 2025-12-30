import type { SubtitleDocument, SubtitleEvent, TextSegment, InlineStyle, Style } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, createDefaultStyle } from '../../../core/document.ts'
import { parseCSS, styleFromClass, type SAMIClass } from './css.ts'

interface SyncPoint {
  time: number
  pTagEnd: number
  className: string | undefined
}

/**
 * High-performance SAMI parser using two-pass approach:
 * 1. First pass: collect all SYNC positions
 * 2. Second pass: extract content knowing boundaries
 */
export function parseSAMI(input: string): SubtitleDocument {
  const result = parseSAMIResult(input, { onError: 'throw' })
  return result.document
}

export function parseSAMIResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const errors: ParseError[] = []
  const options: ParseOptions = {
    onError: opts?.onError ?? 'throw',
    strict: opts?.strict ?? false,
    preserveOrder: opts?.preserveOrder ?? true
  }

  // Handle BOM
  let start = 0
  if (input.charCodeAt(0) === 0xFEFF) start = 1

  const doc = createDocument()
  const len = input.length

  // Extract CSS styles
  extractStyles(input, doc)

  let pos = start
  let prev: SyncPoint | null = null

  while (pos < len) {
    const syncPos = findNextSync(input, pos, len)
    if (syncPos === -1) break

    const current = parseSyncHeader(input, syncPos, len)
    if (!current) {
      pos = syncPos + 5
      continue
    }

    if (prev) {
      const contentEnd = findContentEnd(input, prev.pTagEnd, syncPos)
      const text = extractTrimmedText(input, prev.pTagEnd, contentEnd)

      if (text && text !== '&nbsp;') {
        const hasTag = text.indexOf('<') !== -1
        const segments = hasTag ? parseTags(text) : []
        const plainText = hasTag ? stripTags(text) : decodeHTML(text)

        doc.events[doc.events.length] = {
          id: generateId(),
          start: prev.time,
          end: current.time,
          layer: 0,
          style: prev.className || 'Default',
          actor: '',
          marginL: 0,
          marginR: 0,
          marginV: 0,
          effect: '',
          text: plainText,
          segments,
          dirty: segments.length > 0
        }
      }
    }

    prev = current
    pos = syncPos + 5
  }

  if (prev) {
    const contentEnd = findContentEnd(input, prev.pTagEnd, len)
    const text = extractTrimmedText(input, prev.pTagEnd, contentEnd)
    if (text && text !== '&nbsp;') {
      const hasTag = text.indexOf('<') !== -1
      const segments = hasTag ? parseTags(text) : []
      const plainText = hasTag ? stripTags(text) : decodeHTML(text)

      doc.events[doc.events.length] = {
        id: generateId(),
        start: prev.time,
        end: prev.time + 5000,
        layer: 0,
        style: prev.className || 'Default',
        actor: '',
        marginL: 0,
        marginR: 0,
        marginV: 0,
        effect: '',
        text: plainText,
        segments,
        dirty: segments.length > 0
      }
    }
  }

  return { document: doc, errors, warnings: [] }
}

/**
 * Find next <SYNC position
 */
function findNextSync(src: string, start: number, len: number): number {
  let pos = start

  while (pos < len) {
    // Find < character
    const ltPos = src.indexOf('<', pos)
    if (ltPos === -1) return -1

    // Check if it's SYNC (case insensitive)
    if (ltPos + 5 <= len) {
      const c1 = src.charCodeAt(ltPos + 1)
      const c2 = src.charCodeAt(ltPos + 2)
      const c3 = src.charCodeAt(ltPos + 3)
      const c4 = src.charCodeAt(ltPos + 4)

      // S/s Y/y N/n C/c
      if ((c1 === 83 || c1 === 115) &&
          (c2 === 89 || c2 === 121) &&
          (c3 === 78 || c3 === 110) &&
          (c4 === 67 || c4 === 99)) {
        return ltPos
      }
    }

    pos = ltPos + 1
  }

  return -1
}

/**
 * Parse SYNC header info (time, class, p tag end)
 */
function parseSyncHeader(src: string, syncPos: number, len: number): SyncPoint | null {
  // Find Start= attribute
  const searchEnd = Math.min(syncPos + 50, len)
  let startPos = -1

  for (let i = syncPos + 5; i < searchEnd; i++) {
    const c = src.charCodeAt(i)
    // S/s
    if (c === 83 || c === 115) {
      const c2 = src.charCodeAt(i + 1)
      const c3 = src.charCodeAt(i + 2)
      const c4 = src.charCodeAt(i + 3)
      const c5 = src.charCodeAt(i + 4)
      // t/T a/A r/R t/T
      if ((c2 === 84 || c2 === 116) &&
          (c3 === 65 || c3 === 97) &&
          (c4 === 82 || c4 === 114) &&
          (c5 === 84 || c5 === 116)) {
        startPos = i
        break
      }
    }
  }

  if (startPos === -1) return null

  // Find = and parse number
  const eqPos = src.indexOf('=', startPos)
  if (eqPos === -1 || eqPos > startPos + 10) return null

  let numStart = eqPos + 1
  while (numStart < len && src.charCodeAt(numStart) <= 32) numStart++

  let numEnd = numStart
  while (numEnd < len) {
    const c = src.charCodeAt(numEnd)
    if (c < 48 || c > 57) break
    numEnd++
  }

  let time = 0
  for (let i = numStart; i < numEnd; i++) {
    const d = src.charCodeAt(i) - 48
    if (d < 0 || d > 9) return null
    time = time * 10 + d
  }
  if (numStart === numEnd) return null

  // Find end of SYNC tag
  const syncTagEnd = src.indexOf('>', syncPos)
  if (syncTagEnd === -1) return null

  // Find <P tag
  let pStart = syncTagEnd + 1
  while (pStart < len && src.charCodeAt(pStart) <= 32) pStart++

  const c1 = src.charCodeAt(pStart)
  const c2 = src.charCodeAt(pStart + 1)
  if (c1 !== 60 || (c2 !== 80 && c2 !== 112)) return null // <P or <p

  // Find Class attribute
  let className: string | undefined
  const pTagClose = src.indexOf('>', pStart)
  if (pTagClose !== -1) {
    for (let i = pStart; i < pTagClose - 4; i++) {
      const c1 = src.charCodeAt(i) | 32
      if (c1 !== 99) continue // c
      const c2 = src.charCodeAt(i + 1) | 32
      const c3 = src.charCodeAt(i + 2) | 32
      const c4 = src.charCodeAt(i + 3) | 32
      const c5 = src.charCodeAt(i + 4) | 32
      if (c2 !== 108 || c3 !== 97 || c4 !== 115 || c5 !== 115) continue // l a s s

      let j = i + 5
      while (j < pTagClose && src.charCodeAt(j) <= 32) j++
      if (j >= pTagClose || src.charCodeAt(j) !== 61) continue
      j++
      while (j < pTagClose && src.charCodeAt(j) <= 32) j++
      if (j >= pTagClose) break

      const quote = src.charCodeAt(j)
      let valStart = j
      let valEnd = j
      if (quote === 34 || quote === 39) {
        valStart = j + 1
        valEnd = src.indexOf(String.fromCharCode(quote), valStart)
        if (valEnd === -1 || valEnd > pTagClose) valEnd = pTagClose
      } else {
        while (j < pTagClose) {
          const ch = src.charCodeAt(j)
          if (ch <= 32 || ch === 62) break
          j++
        }
        valEnd = j
      }

      if (valEnd > valStart) className = src.substring(valStart, valEnd).toUpperCase()
      break
    }
  }

  // Find end of P tag
  const pTagEnd = src.indexOf('>', pStart)
  if (pTagEnd === -1) return null

  return {
    time,
    pTagEnd: pTagEnd + 1,
    className
  }
}

function findContentEnd(src: string, start: number, end: number): number {
  let pos = start
  while (pos < end) {
    const lt = src.indexOf('<', pos)
    if (lt === -1 || lt + 3 >= end) return end
    if (src.charCodeAt(lt + 1) === 47) { // /
      const c = src.charCodeAt(lt + 2)
      if ((c === 80 || c === 112) && src.charCodeAt(lt + 3) === 62) {
        return lt
      }
    }
    pos = lt + 1
  }
  return end
}

function extractTrimmedText(src: string, start: number, end: number): string {
  let textStart = start
  let textEnd = end
  while (textStart < textEnd && src.charCodeAt(textStart) <= 32) textStart++
  while (textEnd > textStart && src.charCodeAt(textEnd - 1) <= 32) textEnd--
  if (textEnd <= textStart) return ''
  return src.substring(textStart, textEnd)
}

function indexOfTagCaseInsensitive(src: string, tag: string, start: number): number {
  const tagLen = tag.length
  const max = src.length - tagLen
  for (let i = start; i <= max; i++) {
    let matched = true
    for (let j = 0; j < tagLen; j++) {
      const a = src.charCodeAt(i + j)
      const b = tag.charCodeAt(j)
      if ((a | 32) !== (b | 32)) {
        matched = false
        break
      }
    }
    if (matched) return i
  }
  return -1
}

function extractStyles(src: string, doc: SubtitleDocument): void {
  const styleStart = indexOfTagCaseInsensitive(src, '<style', 0)
  if (styleStart === -1) return

  const styleEnd = indexOfTagCaseInsensitive(src, '</style>', styleStart)
  if (styleEnd === -1) return

  const cssBlock = src.substring(styleStart, styleEnd + 8)
  const classes = parseCSS(cssBlock)

  for (const [className, classObj] of classes) {
    const baseStyle = createDefaultStyle()
    const styleProps = styleFromClass(classObj, baseStyle)
    const style: Style = { ...baseStyle, ...styleProps, name: className }
    doc.styles.set(className, style)
  }
}

function parseTags(raw: string): TextSegment[] {
  const segments: TextSegment[] = []
  const stateStack: InlineStyle[] = [{}]

  let textStart = 0
  let i = 0
  const rawLen = raw.length

  while (i < rawLen) {
    if (raw.charCodeAt(i) === 60) { // <
      const closeIdx = raw.indexOf('>', i)
      if (closeIdx === -1) {
        i++
        continue
      }

      if (i > textStart) {
        const state = stateStack[stateStack.length - 1]!
        const style = Object.keys(state).length > 0 ? { ...state } : null
        const text = decodeHTML(raw.substring(textStart, i))
        segments[segments.length] = { text, style, effects: [] }
      }

      const tag = raw.substring(i + 1, closeIdx)
      processTag(tag, stateStack)

      i = closeIdx + 1
      textStart = i
    } else {
      i++
    }
  }

  if (textStart < rawLen) {
    const state = stateStack[stateStack.length - 1]!
    const style = Object.keys(state).length > 0 ? { ...state } : null
    const text = decodeHTML(raw.substring(textStart))
    segments[segments.length] = { text, style, effects: [] }
  }

  return segments
}

function processTag(tag: string, stateStack: InlineStyle[]): void {
  const tagLower = tag.toLowerCase().trim()
  const currentState = stateStack[stateStack.length - 1]!

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
  } else if (tagLower === 's') {
    stateStack[stateStack.length] = { ...currentState, strikeout: true }
  } else if (tagLower === '/s') {
    if (stateStack.length > 1) stateStack.pop()
  } else if (tagLower.startsWith('font')) {
    const colorIdx = tag.indexOf('color')
    if (colorIdx !== -1) {
      const colorStart = tag.indexOf('"', colorIdx)
      if (colorStart !== -1) {
        const colorEnd = tag.indexOf('"', colorStart + 1)
        if (colorEnd !== -1) {
          const colorValue = tag.substring(colorStart + 1, colorEnd)
          const color = parseColorFast(colorValue)
          stateStack[stateStack.length] = { ...currentState, primaryColor: color }
          return
        }
      }
    }
    stateStack[stateStack.length] = { ...currentState }
  } else if (tagLower === '/font') {
    if (stateStack.length > 1) stateStack.pop()
  }
}

function parseColorFast(value: string): number {
  if (value.charCodeAt(0) === 35) { // #
    const hex = value.substring(1)
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      return ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)
    }
  }
  return 0x00FFFFFF
}

function decodeHTML(text: string): string {
  if (text.indexOf('&') === -1) return text

  let result = text
  if (result.indexOf('&nbsp;') !== -1) result = result.split('&nbsp;').join(' ')
  if (result.indexOf('&lt;') !== -1) result = result.split('&lt;').join('<')
  if (result.indexOf('&gt;') !== -1) result = result.split('&gt;').join('>')
  if (result.indexOf('&amp;') !== -1) result = result.split('&amp;').join('&')
  if (result.indexOf('&quot;') !== -1) result = result.split('&quot;').join('"')
  return result
}

function stripTags(raw: string): string {
  if (raw.indexOf('<') === -1) return decodeHTML(raw)

  let result = ''
  let i = 0
  const rawLen = raw.length

  while (i < rawLen) {
    if (raw.charCodeAt(i) === 60) { // <
      const closeIdx = raw.indexOf('>', i)
      if (closeIdx === -1) {
        result += raw.substring(i)
        break
      }
      i = closeIdx + 1
    } else {
      result += raw.charAt(i)
      i++
    }
  }

  return decodeHTML(result)
}
