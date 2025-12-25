import type { SubtitleDocument, SubtitleEvent, TextSegment, InlineStyle, Style } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../../../core/errors.ts'
import { SubforgeError } from '../../../core/errors.ts'
import { createDocument, generateId, createDefaultStyle } from '../../../core/document.ts'
import { parseCSS, styleFromClass, type SAMIClass } from './css.ts'

interface SyncPoint {
  time: number
  pTagEnd: number
  contentEnd: number
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

  // Pass 1: Find all SYNC positions (fast scan)
  const syncPositions = findAllSyncs(input, start, len)
  const syncCount = syncPositions.length

  if (syncCount === 0) {
    return { document: doc, errors, warnings: [] }
  }

  // Pass 2: Parse each SYNC point knowing where the next one is
  for (let i = 0; i < syncCount; i++) {
    const syncPos = syncPositions[i]
    const nextSyncPos = i + 1 < syncCount ? syncPositions[i + 1] : len

    const syncData = parseSyncPoint(input, syncPos, nextSyncPos, len)
    if (!syncData) continue

    const { time, pTagEnd, contentEnd, className } = syncData

    // Extract text content
    const text = input.substring(pTagEnd, contentEnd).trim()

    // Skip empty markers
    if (text === '&nbsp;' || text === '') continue

    // Calculate end time from next SYNC
    let endTime = time + 5000
    if (i + 1 < syncCount) {
      const nextData = parseSyncPoint(input, syncPositions[i + 1], syncPositions[i + 2] ?? len, len)
      if (nextData) {
        endTime = nextData.time
      }
    }

    // Parse inline HTML tags if present
    const hasTag = text.indexOf('<') !== -1
    const segments = hasTag ? parseTags(text) : []
    const plainText = hasTag ? stripTags(text) : decodeHTML(text)

    const event: SubtitleEvent = {
      id: generateId(),
      start: time,
      end: endTime,
      layer: 0,
      style: className || 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: plainText,
      segments,
      dirty: segments.length > 0
    }

    doc.events[doc.events.length] = event
  }

  return { document: doc, errors, warnings: [] }
}

/**
 * Single pass to find all <SYNC positions
 */
function findAllSyncs(src: string, start: number, len: number): number[] {
  const positions: number[] = []
  let pos = start

  while (pos < len) {
    // Find < character
    const ltPos = src.indexOf('<', pos)
    if (ltPos === -1) break

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
        positions[positions.length] = ltPos
      }
    }

    pos = ltPos + 1
  }

  return positions
}

/**
 * Parse a single SYNC point
 */
function parseSyncPoint(src: string, syncPos: number, nextSyncPos: number, len: number): SyncPoint | null {
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

  const time = parseInt(src.substring(numStart, numEnd), 10)
  if (isNaN(time)) return null

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
    const pTag = src.substring(pStart, pTagClose)
    const classIdx = pTag.toLowerCase().indexOf('class')
    if (classIdx !== -1) {
      const eqIdx = pTag.indexOf('=', classIdx)
      if (eqIdx !== -1) {
        let valStart = eqIdx + 1
        while (valStart < pTag.length && pTag.charCodeAt(valStart) <= 32) valStart++
        let valEnd = valStart
        while (valEnd < pTag.length) {
          const c = pTag.charCodeAt(valEnd)
          if (c <= 32 || c === 62) break
          valEnd++
        }
        className = pTag.substring(valStart, valEnd).toUpperCase()
      }
    }
  }

  // Find end of P tag
  const pTagEnd = src.indexOf('>', pStart)
  if (pTagEnd === -1) return null

  // Content ends at next SYNC or </P> (whichever comes first)
  // Simple scan for </P> in the bounded region (much faster than indexOf to end)
  let contentEnd = nextSyncPos

  // Quick scan for </P> - only check within bounds
  for (let i = pTagEnd + 1; i < nextSyncPos - 3; i++) {
    if (src.charCodeAt(i) === 60 && // <
        src.charCodeAt(i + 1) === 47 && // /
        (src.charCodeAt(i + 2) === 80 || src.charCodeAt(i + 2) === 112) && // P/p
        src.charCodeAt(i + 3) === 62) { // >
      contentEnd = i
      break
    }
  }

  return {
    time,
    pTagEnd: pTagEnd + 1,
    contentEnd,
    className
  }
}

function extractStyles(src: string, doc: SubtitleDocument): void {
  const styleStartLower = src.toLowerCase().indexOf('<style')
  if (styleStartLower === -1) return

  const styleEndLower = src.toLowerCase().indexOf('</style>', styleStartLower)
  if (styleEndLower === -1) return

  const cssBlock = src.substring(styleStartLower, styleEndLower + 8)
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
