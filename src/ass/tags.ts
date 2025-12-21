import type { TextSegment, InlineStyle, Effect, Alignment } from '../core/types.ts'
import { parseColor, parseAlpha } from './color.ts'

// Convert ASS escape sequences to characters
// \N -> newline, \n -> newline (soft), \h -> non-breaking space
function processEscapes(text: string): string {
  return text
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\h/g, '\u00A0')
}

// Convert characters back to ASS escape sequences for serialization
function serializeEscapes(text: string): string {
  return text
    .replace(/\n/g, '\\N')
    .replace(/\u00A0/g, '\\h')
}

/**
 * Parses ASS override tags from raw text into structured TextSegments.
 *
 * This function extracts and parses all ASS override tags (formatting codes enclosed in {})
 * from text and converts them into a structured array of text segments with associated
 * styles and effects. It handles all ASS tag types including formatting, colors, positioning,
 * animations, karaoke effects, and more.
 *
 * @param raw - The raw text containing ASS override tags (e.g., "{\\b1}Bold text{\\b0}Normal")
 * @returns An array of TextSegments with parsed styles and effects
 *
 * @example
 * ```ts
 * const segments = parseTags("{\\b1\\c&H0000FF&}Red bold text{\\b0}Normal")
 * // Returns:
 * // [
 * //   { text: "Red bold text", style: { bold: true, primaryColor: 0xFF }, effects: [] },
 * //   { text: "Normal", style: { bold: false }, effects: [] }
 * // ]
 * ```
 */
export function parseTags(raw: string): TextSegment[] {
  const segments: TextSegment[] = []
  let currentStyle: InlineStyle | null = null
  let currentEffects: Effect[] = []
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
        segments[segments.length] = {
          text: processEscapes(raw.slice(textStart, i)),
          style: currentStyle ? { ...currentStyle } : null,
          effects: [...currentEffects]
        }
      }

      const tagBlock = raw.slice(i + 1, closeIdx)
      const result = parseTagBlock(tagBlock, currentStyle, currentEffects)
      currentStyle = result.style
      currentEffects = result.effects

      i = closeIdx + 1
      textStart = i
    } else {
      i++
    }
  }

  if (textStart < raw.length) {
    segments[segments.length] = {
      text: processEscapes(raw.slice(textStart)),
      style: currentStyle ? { ...currentStyle } : null,
      effects: [...currentEffects]
    }
  }

  return segments
}

interface TagDef {
  pattern: RegExp
  handler: (match: RegExpMatchArray, style: InlineStyle, effects: Effect[]) => { hasStyleChanges: boolean }
}

const tagDefs: TagDef[] = [
  // Bold: \b0, \b1, or \b<weight> (100-900)
  { pattern: /^b(\d+)$/, handler: (m, s) => {
    const val = parseInt(m[1]!)
    if (val === 0) s.bold = false
    else if (val === 1) s.bold = true
    else s.bold = val  // font weight
    return { hasStyleChanges: true }
  } },
  { pattern: /^i([01])$/, handler: (m, s) => { s.italic = m[1] === '1'; return { hasStyleChanges: true } } },
  { pattern: /^u([01])$/, handler: (m, s) => { s.underline = m[1] === '1'; return { hasStyleChanges: true } } },
  { pattern: /^s([01])$/, handler: (m, s) => { s.strikeout = m[1] === '1'; return { hasStyleChanges: true } } },
  { pattern: /^fn(.+)$/, handler: (m, s) => { s.fontName = m[1]; return { hasStyleChanges: true } } },
  { pattern: /^fs(\d+(?:\.\d+)?)$/, handler: (m, s) => { s.fontSize = parseFloat(m[1]!); return { hasStyleChanges: true } } },
  { pattern: /^an([1-9])$/, handler: (m, s) => { s.alignment = parseInt(m[1]!) as Alignment; return { hasStyleChanges: true } } },
  // Legacy alignment: \a1-3 (bottom), \a5-7 (top), \a9-11 (middle)
  { pattern: /^a(\d+)$/, handler: (m, s) => {
    const val = parseInt(m[1]!)
    // Convert SSA alignment to ASS alignment (numpad style)
    // SSA: 1-3 bottom, 5-7 top, 9-11 middle
    // ASS: 1-3 bottom, 4-6 middle, 7-9 top
    let alignment: number
    if (val >= 1 && val <= 3) alignment = val  // bottom stays same
    else if (val >= 5 && val <= 7) alignment = val + 2  // top: 5->7, 6->8, 7->9
    else if (val >= 9 && val <= 11) alignment = val - 5  // middle: 9->4, 10->5, 11->6
    else return { hasStyleChanges: false }
    s.alignment = alignment as Alignment
    return { hasStyleChanges: true }
  } },
  // Font encoding
  { pattern: /^fe(\d+)$/, handler: (m, s) => { s.fontEncoding = parseInt(m[1]!); return { hasStyleChanges: true } } },
  // Wrap style
  { pattern: /^q([0-3])$/, handler: (m, s) => { s.wrapStyle = parseInt(m[1]!) as 0 | 1 | 2 | 3; return { hasStyleChanges: true } } },
  {
    pattern: /^(?:c|1c)(&H[0-9A-Fa-f]+&?)$/,
    handler: (m, s) => {
      try { s.primaryColor = parseColor(m[1]!); return { hasStyleChanges: true } }
      catch { return { hasStyleChanges: false } }
    }
  },
  {
    pattern: /^2c(&H[0-9A-Fa-f]+&?)$/,
    handler: (m, s) => {
      try { s.secondaryColor = parseColor(m[1]!); return { hasStyleChanges: true } }
      catch { return { hasStyleChanges: false } }
    }
  },
  {
    pattern: /^3c(&H[0-9A-Fa-f]+&?)$/,
    handler: (m, s) => {
      try { s.outlineColor = parseColor(m[1]!); return { hasStyleChanges: true } }
      catch { return { hasStyleChanges: false } }
    }
  },
  {
    pattern: /^4c(&H[0-9A-Fa-f]+&?)$/,
    handler: (m, s) => {
      try { s.backColor = parseColor(m[1]!); return { hasStyleChanges: true } }
      catch { return { hasStyleChanges: false } }
    }
  },
  {
    pattern: /^alpha(&H[0-9A-Fa-f]+&?)$/,
    handler: (m, s) => {
      try { s.alpha = parseAlpha(m[1]!); return { hasStyleChanges: true } }
      catch { return { hasStyleChanges: false } }
    }
  },
  {
    pattern: /^1a(&H[0-9A-Fa-f]+&?)$/,
    handler: (m, s) => {
      try { s.primaryAlpha = parseAlpha(m[1]!); return { hasStyleChanges: true } }
      catch { return { hasStyleChanges: false } }
    }
  },
  {
    pattern: /^2a(&H[0-9A-Fa-f]+&?)$/,
    handler: (m, s) => {
      try { s.secondaryAlpha = parseAlpha(m[1]!); return { hasStyleChanges: true } }
      catch { return { hasStyleChanges: false } }
    }
  },
  {
    pattern: /^3a(&H[0-9A-Fa-f]+&?)$/,
    handler: (m, s) => {
      try { s.outlineAlpha = parseAlpha(m[1]!); return { hasStyleChanges: true } }
      catch { return { hasStyleChanges: false } }
    }
  },
  {
    pattern: /^4a(&H[0-9A-Fa-f]+&?)$/,
    handler: (m, s) => {
      try { s.backAlpha = parseAlpha(m[1]!); return { hasStyleChanges: true } }
      catch { return { hasStyleChanges: false } }
    }
  },
  {
    pattern: /^pos\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)$/,
    handler: (m, s) => {
      s.pos = [parseFloat(m[1]!), parseFloat(m[2]!)]
      return { hasStyleChanges: true }
    }
  },
  {
    pattern: /^org\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)$/,
    handler: (m, _, e) => {
      const idx = e.findIndex(ef => ef.type === 'origin')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'origin', params: { x: parseFloat(m[1]!), y: parseFloat(m[2]!) } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^k(\d+)$/,
    handler: (_, __, e) => {
      const duration = parseInt(_[1]!) * 10
      const idx = e.findIndex(ef => ef.type === 'karaoke')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'karaoke', params: { duration, mode: 'fill' } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^K(\d+)$/,
    handler: (_, __, e) => {
      const duration = parseInt(_[1]!) * 10
      const idx = e.findIndex(ef => ef.type === 'karaoke')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'karaoke', params: { duration, mode: 'fade' } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^kf(\d+)$/,
    handler: (_, __, e) => {
      const duration = parseInt(_[1]!) * 10
      const idx = e.findIndex(ef => ef.type === 'karaoke')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'karaoke', params: { duration, mode: 'fade' } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^ko(\d+)$/,
    handler: (_, __, e) => {
      const duration = parseInt(_[1]!) * 10
      const idx = e.findIndex(ef => ef.type === 'karaoke')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'karaoke', params: { duration, mode: 'outline' } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^kt(\d+)$/,
    handler: (m, _, e) => {
      const time = parseInt(m[1]!)
      const idx = e.findIndex(ef => ef.type === 'karaokeAbsolute')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'karaokeAbsolute', params: { time } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^(?:blur|be)(\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const strength = parseFloat(m[1]!)
      const idx = e.findIndex(ef => ef.type === 'blur')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'blur', params: { strength } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^bord(\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const size = parseFloat(m[1]!)
      const idx = e.findIndex(ef => ef.type === 'border')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'border', params: { size } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^xbord(\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const x = parseFloat(m[1]!)
      let existing = e.find(ef => ef.type === 'border') as Effect<'border', { size: number; x?: number; y?: number }> | undefined
      if (!existing) { existing = { type: 'border', params: { size: 0 } }; e.push(existing) }
      existing.params.x = x
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^ybord(\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const y = parseFloat(m[1]!)
      let existing = e.find(ef => ef.type === 'border') as Effect<'border', { size: number; x?: number; y?: number }> | undefined
      if (!existing) { existing = { type: 'border', params: { size: 0 } }; e.push(existing) }
      existing.params.y = y
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^shad(\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const depth = parseFloat(m[1]!)
      const idx = e.findIndex(ef => ef.type === 'shadow')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'shadow', params: { depth } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^xshad(-?\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const x = parseFloat(m[1]!)
      let existing = e.find(ef => ef.type === 'shadow') as Effect<'shadow', { depth: number; x?: number; y?: number }> | undefined
      if (!existing) { existing = { type: 'shadow', params: { depth: 0 } }; e.push(existing) }
      existing.params.x = x
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^yshad(-?\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const y = parseFloat(m[1]!)
      let existing = e.find(ef => ef.type === 'shadow') as Effect<'shadow', { depth: number; x?: number; y?: number }> | undefined
      if (!existing) { existing = { type: 'shadow', params: { depth: 0 } }; e.push(existing) }
      existing.params.y = y
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^fscx(\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const x = parseFloat(m[1]!)
      const existing = e.find(ef => ef.type === 'scale') as Effect<'scale', { x: number; y: number }> | undefined
      if (existing) existing.params.x = x
      else e[e.length] = { type: 'scale', params: { x, y: 100 } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^fscy(\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const y = parseFloat(m[1]!)
      const existing = e.find(ef => ef.type === 'scale') as Effect<'scale', { x: number; y: number }> | undefined
      if (existing) existing.params.y = y
      else e[e.length] = { type: 'scale', params: { x: 100, y } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^frx(-?\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const angle = parseFloat(m[1]!)
      let existing = e.find(ef => ef.type === 'rotate') as Effect<'rotate', { x?: number; y?: number; z?: number }> | undefined
      if (!existing) { existing = { type: 'rotate', params: {} }; e.push(existing) }
      existing.params.x = angle
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^fry(-?\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const angle = parseFloat(m[1]!)
      let existing = e.find(ef => ef.type === 'rotate') as Effect<'rotate', { x?: number; y?: number; z?: number }> | undefined
      if (!existing) { existing = { type: 'rotate', params: {} }; e.push(existing) }
      existing.params.y = angle
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^(?:frz|fr)(-?\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const angle = parseFloat(m[1]!)
      let existing = e.find(ef => ef.type === 'rotate') as Effect<'rotate', { x?: number; y?: number; z?: number }> | undefined
      if (!existing) { existing = { type: 'rotate', params: {} }; e.push(existing) }
      existing.params.z = angle
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^fax(-?\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const shear = parseFloat(m[1]!)
      let existing = e.find(ef => ef.type === 'shear') as Effect<'shear', { x?: number; y?: number }> | undefined
      if (!existing) { existing = { type: 'shear', params: {} }; e.push(existing) }
      existing.params.x = shear
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^fay(-?\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const shear = parseFloat(m[1]!)
      let existing = e.find(ef => ef.type === 'shear') as Effect<'shear', { x?: number; y?: number }> | undefined
      if (!existing) { existing = { type: 'shear', params: {} }; e.push(existing) }
      existing.params.y = shear
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^fsp(-?\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const value = parseFloat(m[1]!)
      const idx = e.findIndex(ef => ef.type === 'spacing')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'spacing', params: { value } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^fad\((\d+),(\d+)\)$/,
    handler: (m, _, e) => {
      const idx = e.findIndex(ef => ef.type === 'fade')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'fade', params: { in: parseInt(m[1]!), out: parseInt(m[2]!) } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^fade\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)$/,
    handler: (m, _, e) => {
      const idx = e.findIndex(ef => ef.type === 'fadeComplex')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = {
        type: 'fadeComplex',
        params: {
          alphas: [parseInt(m[1]!), parseInt(m[2]!), parseInt(m[3]!)],
          times: [parseInt(m[4]!), parseInt(m[5]!), parseInt(m[6]!), parseInt(m[7]!)]
        }
      }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^move\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+),(\d+))?\)$/,
    handler: (m, _, e) => {
      const params: { from: [number, number]; to: [number, number]; t1?: number; t2?: number } = {
        from: [parseFloat(m[1]!), parseFloat(m[2]!)],
        to: [parseFloat(m[3]!), parseFloat(m[4]!)]
      }
      if (m[5] && m[6]) {
        params.t1 = parseInt(m[5])
        params.t2 = parseInt(m[6])
      }
      const idx = e.findIndex(ef => ef.type === 'move')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'move', params }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^clip(\(.+\))$/,
    handler: (m, _, e) => {
      const idx = e.findIndex(ef => ef.type === 'clip')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'clip', params: { path: m[1]!, inverse: false } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^iclip(\(.+\))$/,
    handler: (m, _, e) => {
      const idx = e.findIndex(ef => ef.type === 'clip')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'clip', params: { path: m[1]!, inverse: true } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^p(\d+)$/,
    handler: (m, _, e) => {
      const scale = parseInt(m[1]!)
      if (scale > 0) {
        const idx = e.findIndex(ef => ef.type === 'drawing')
        if (idx !== -1) e.splice(idx, 1)
        e[e.length] = { type: 'drawing', params: { scale, commands: '' } }
      }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^pbo(-?\d+(?:\.\d+)?)$/,
    handler: (m, _, e) => {
      const offset = parseFloat(m[1]!)
      const idx = e.findIndex(ef => ef.type === 'drawingBaseline')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'drawingBaseline', params: { offset } }
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^r(.*)$/,
    handler: (m, s, e) => {
      const idx = e.findIndex(ef => ef.type === 'reset')
      if (idx !== -1) e.splice(idx, 1)
      e[e.length] = { type: 'reset', params: { style: m[1] || undefined } }
      for (const key of Object.keys(s)) delete s[key as keyof InlineStyle]
      return { hasStyleChanges: false }
    }
  },
  {
    pattern: /^t\((.+)\)$/,
    handler: (m, _, e) => {
      const inner = m[1]!
      const tMatch = inner.match(/^(?:(\d+),(\d+),)?(?:(\d+(?:\.\d+)?),)?(.+)$/)
      if (tMatch) {
        e[e.length] = {
          type: 'animate',
          params: {
            start: tMatch[1] ? parseInt(tMatch[1]) : 0,
            end: tMatch[2] ? parseInt(tMatch[2]) : 0,
            accel: tMatch[3] ? parseFloat(tMatch[3]) : undefined,
            target: {}
          }
        }
      }
      return { hasStyleChanges: false }
    }
  },
]

function parseTagBlock(
  block: string,
  currentStyle: InlineStyle | null,
  currentEffects: Effect[]
): { style: InlineStyle | null; effects: Effect[] } {
  const style: InlineStyle = currentStyle ? { ...currentStyle } : {}
  const effects = [...currentEffects]
  let hasStyleChanges = currentStyle !== null

  const tags = block.split('\\').filter(t => t.length > 0)

  for (const tagStr of tags) {
    let matched = false
    for (const def of tagDefs) {
      const match = tagStr.match(def.pattern)
      if (match) {
        const result = def.handler(match, style, effects)
        if (result.hasStyleChanges) hasStyleChanges = true
        matched = true
        break
      }
    }
    if (!matched && tagStr.length > 0) {
      effects[effects.length] = { type: 'unknown', params: { format: 'ass', raw: `\\${tagStr}` } }
    }
  }

  return {
    style: hasStyleChanges ? style : null,
    effects
  }
}

/**
 * Serializes TextSegments back into ASS override tag format.
 *
 * This function converts structured text segments with styles and effects back into
 * raw ASS text with override tags. It optimizes output by only including tag changes
 * that differ from the previous segment's style.
 *
 * @param segments - Array of TextSegments to serialize
 * @returns The raw ASS text with override tags (e.g., "{\\b1}Bold text{\\b0}Normal")
 *
 * @example
 * ```ts
 * const segments = [
 *   { text: "Bold", style: { bold: true }, effects: [] },
 *   { text: " Normal", style: { bold: false }, effects: [] }
 * ]
 * const raw = serializeTags(segments)
 * // Returns: "{\\b1}Bold{\\b0} Normal"
 * ```
 */
export function serializeTags(segments: TextSegment[]): string {
  let result = ''
  let prevStyle: InlineStyle | null = null

  for (const seg of segments) {
    const tags: string[] = []

    if (seg.style) {
      if (seg.style.bold !== undefined && seg.style.bold !== prevStyle?.bold) {
        if (typeof seg.style.bold === 'number') {
          tags[tags.length] = `\\b${seg.style.bold}`
        } else {
          tags[tags.length] = `\\b${seg.style.bold ? '1' : '0'}`
        }
      }
      if (seg.style.italic !== undefined && seg.style.italic !== prevStyle?.italic) {
        tags[tags.length] = `\\i${seg.style.italic ? '1' : '0'}`
      }
      if (seg.style.underline !== undefined && seg.style.underline !== prevStyle?.underline) {
        tags[tags.length] = `\\u${seg.style.underline ? '1' : '0'}`
      }
      if (seg.style.strikeout !== undefined && seg.style.strikeout !== prevStyle?.strikeout) {
        tags[tags.length] = `\\s${seg.style.strikeout ? '1' : '0'}`
      }
      if (seg.style.fontName !== undefined && seg.style.fontName !== prevStyle?.fontName) {
        tags[tags.length] = `\\fn${seg.style.fontName}`
      }
      if (seg.style.fontSize !== undefined && seg.style.fontSize !== prevStyle?.fontSize) {
        tags[tags.length] = `\\fs${seg.style.fontSize}`
      }
      if (seg.style.fontEncoding !== undefined && seg.style.fontEncoding !== prevStyle?.fontEncoding) {
        tags[tags.length] = `\\fe${seg.style.fontEncoding}`
      }
      if (seg.style.wrapStyle !== undefined && seg.style.wrapStyle !== prevStyle?.wrapStyle) {
        tags[tags.length] = `\\q${seg.style.wrapStyle}`
      }
      if (seg.style.primaryColor !== undefined && seg.style.primaryColor !== prevStyle?.primaryColor) {
        tags[tags.length] = `\\c&H${(seg.style.primaryColor >>> 0).toString(16).toUpperCase().padStart(8, '0')}&`
      }
      if (seg.style.secondaryColor !== undefined && seg.style.secondaryColor !== prevStyle?.secondaryColor) {
        tags[tags.length] = `\\2c&H${(seg.style.secondaryColor >>> 0).toString(16).toUpperCase().padStart(8, '0')}&`
      }
      if (seg.style.outlineColor !== undefined && seg.style.outlineColor !== prevStyle?.outlineColor) {
        tags[tags.length] = `\\3c&H${(seg.style.outlineColor >>> 0).toString(16).toUpperCase().padStart(8, '0')}&`
      }
      if (seg.style.backColor !== undefined && seg.style.backColor !== prevStyle?.backColor) {
        tags[tags.length] = `\\4c&H${(seg.style.backColor >>> 0).toString(16).toUpperCase().padStart(8, '0')}&`
      }
      if (seg.style.alpha !== undefined && seg.style.alpha !== prevStyle?.alpha) {
        tags[tags.length] = `\\alpha&H${seg.style.alpha.toString(16).toUpperCase().padStart(2, '0')}&`
      }
      if (seg.style.primaryAlpha !== undefined && seg.style.primaryAlpha !== prevStyle?.primaryAlpha) {
        tags[tags.length] = `\\1a&H${seg.style.primaryAlpha.toString(16).toUpperCase().padStart(2, '0')}&`
      }
      if (seg.style.secondaryAlpha !== undefined && seg.style.secondaryAlpha !== prevStyle?.secondaryAlpha) {
        tags[tags.length] = `\\2a&H${seg.style.secondaryAlpha.toString(16).toUpperCase().padStart(2, '0')}&`
      }
      if (seg.style.outlineAlpha !== undefined && seg.style.outlineAlpha !== prevStyle?.outlineAlpha) {
        tags[tags.length] = `\\3a&H${seg.style.outlineAlpha.toString(16).toUpperCase().padStart(2, '0')}&`
      }
      if (seg.style.backAlpha !== undefined && seg.style.backAlpha !== prevStyle?.backAlpha) {
        tags[tags.length] = `\\4a&H${seg.style.backAlpha.toString(16).toUpperCase().padStart(2, '0')}&`
      }
      if (seg.style.alignment !== undefined && seg.style.alignment !== prevStyle?.alignment) {
        tags[tags.length] = `\\an${seg.style.alignment}`
      }
      if (seg.style.pos !== undefined) {
        tags[tags.length] = `\\pos(${seg.style.pos[0]},${seg.style.pos[1]})`
      }
    }

    for (const effect of seg.effects) {
      switch (effect.type) {
        case 'karaoke': {
          const p = effect.params as { duration: number; mode: 'fill' | 'fade' | 'outline' }
          const prefix = p.mode === 'fade' ? 'kf' : p.mode === 'outline' ? 'ko' : 'k'
          tags[tags.length] = `\\${prefix}${p.duration / 10}`
          break
        }
        case 'karaokeAbsolute': {
          const p = effect.params as { time: number }
          tags[tags.length] = `\\kt${p.time}`
          break
        }
        case 'blur': {
          const p = effect.params as { strength: number }
          tags[tags.length] = `\\blur${p.strength}`
          break
        }
        case 'border': {
          const p = effect.params as { size: number; x?: number; y?: number }
          if (p.size) tags[tags.length] = `\\bord${p.size}`
          if (p.x !== undefined) tags[tags.length] = `\\xbord${p.x}`
          if (p.y !== undefined) tags[tags.length] = `\\ybord${p.y}`
          break
        }
        case 'shadow': {
          const p = effect.params as { depth: number; x?: number; y?: number }
          if (p.depth) tags[tags.length] = `\\shad${p.depth}`
          if (p.x !== undefined) tags[tags.length] = `\\xshad${p.x}`
          if (p.y !== undefined) tags[tags.length] = `\\yshad${p.y}`
          break
        }
        case 'origin': {
          const p = effect.params as { x: number; y: number }
          tags[tags.length] = `\\org(${p.x},${p.y})`
          break
        }
        case 'scale': {
          const p = effect.params as { x: number; y: number }
          if (p.x !== 100) tags[tags.length] = `\\fscx${p.x}`
          if (p.y !== 100) tags[tags.length] = `\\fscy${p.y}`
          break
        }
        case 'rotate': {
          const p = effect.params as { x?: number; y?: number; z?: number }
          if (p.x !== undefined) tags[tags.length] = `\\frx${p.x}`
          if (p.y !== undefined) tags[tags.length] = `\\fry${p.y}`
          if (p.z !== undefined) tags[tags.length] = `\\frz${p.z}`
          break
        }
        case 'shear': {
          const p = effect.params as { x?: number; y?: number }
          if (p.x !== undefined) tags[tags.length] = `\\fax${p.x}`
          if (p.y !== undefined) tags[tags.length] = `\\fay${p.y}`
          break
        }
        case 'spacing': {
          const p = effect.params as { value: number }
          tags[tags.length] = `\\fsp${p.value}`
          break
        }
        case 'fade': {
          const p = effect.params as { in: number; out: number }
          tags[tags.length] = `\\fad(${p.in},${p.out}`
          break
        }
        case 'fadeComplex': {
          const p = effect.params as { alphas: [number, number, number]; times: [number, number, number, number] }
          tags[tags.length] = `\\fade(${p.alphas.join(',')},${p.times.join(',')}`
          break
        }
        case 'move': {
          const p = effect.params as { from: [number, number]; to: [number, number]; t1?: number; t2?: number }
          if (p.t1 !== undefined && p.t2 !== undefined) {
            tags[tags.length] = `\\move(${p.from[0]},${p.from[1]},${p.to[0]},${p.to[1]},${p.t1},${p.t2}`
          } else {
            tags[tags.length] = `\\move(${p.from[0]},${p.from[1]},${p.to[0]},${p.to[1]}`
          }
          break
        }
        case 'clip': {
          const p = effect.params as { path: string; inverse: boolean }
          tags[tags.length] = `\\${p.inverse ? 'iclip' : 'clip'}${p.path}`
          break
        }
        case 'drawing': {
          const p = effect.params as { scale: number }
          tags[tags.length] = `\\p${p.scale}`
          break
        }
        case 'drawingBaseline': {
          const p = effect.params as { offset: number }
          tags[tags.length] = `\\pbo${p.offset}`
          break
        }
        case 'reset': {
          const p = effect.params as { style?: string }
          tags[tags.length] = `\\r${p.style ?? ''}`
          break
        }
        case 'unknown': {
          const p = effect.params as { raw: string }
          tags[tags.length] = p.raw
          break
        }
      }
    }

    if (tags.length > 0) {
      result += `{${tags.join('')}}`
    }
    result += serializeEscapes(seg.text)

    prevStyle = seg.style
  }

  return result
}

/**
 * Strips all ASS override tags from text, leaving only plain text.
 *
 * This function removes all override tag blocks (anything enclosed in {}) from the text,
 * leaving only the visible text content. Useful for extracting searchable text or
 * creating plain text versions of subtitles.
 *
 * @param raw - The raw text containing ASS override tags
 * @returns The plain text with all tags removed
 *
 * @example
 * ```ts
 * stripTags("{\\b1\\c&HFF0000&}Styled text{\\b0}") // Returns "Styled text"
 * stripTags("No tags here") // Returns "No tags here"
 * stripTags("{\\pos(100,200)}Positioned") // Returns "Positioned"
 * ```
 */
export function stripTags(raw: string): string {
  return raw.replace(/\{[^}]*\}/g, '')
}
