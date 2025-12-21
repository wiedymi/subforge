import { test, expect } from 'bun:test'
import { parseTags, serializeTags, stripTags } from '../../src/ass/tags.ts'

test('parseTags plain text', () => {
  const segments = parseTags('Hello World')
  expect(segments).toHaveLength(1)
  expect(segments[0]!.text).toBe('Hello World')
  expect(segments[0]!.style).toBeNull()
})

test('parseTags bold tag', () => {
  const segments = parseTags('{\\b1}bold{\\b0} normal')
  expect(segments).toHaveLength(2)
  expect(segments[0]!.text).toBe('bold')
  expect(segments[0]!.style?.bold).toBe(true)
  expect(segments[1]!.text).toBe(' normal')
  expect(segments[1]!.style?.bold).toBe(false)
})

test('parseTags italic', () => {
  const segments = parseTags('{\\i1}italic')
  expect(segments[0]!.style?.italic).toBe(true)
})

test('parseTags underline', () => {
  const segments = parseTags('{\\u1}underline')
  expect(segments[0]!.style?.underline).toBe(true)
})

test('parseTags strikeout', () => {
  const segments = parseTags('{\\s1}strike')
  expect(segments[0]!.style?.strikeout).toBe(true)
})

test('parseTags font name', () => {
  const segments = parseTags('{\\fnArial}text')
  expect(segments[0]!.style?.fontName).toBe('Arial')
})

test('parseTags font size', () => {
  const segments = parseTags('{\\fs24}text')
  expect(segments[0]!.style?.fontSize).toBe(24)
})

test('parseTags color', () => {
  const segments = parseTags('{\\c&H0000FF&}red')
  expect(segments[0]!.style?.primaryColor).toBe(0x0000FF)
})

test('parseTags alignment', () => {
  const segments = parseTags('{\\an5}center')
  expect(segments[0]!.style?.alignment).toBe(5)
})

test('parseTags position', () => {
  const segments = parseTags('{\\pos(100,200)}text')
  expect(segments[0]!.style?.pos).toEqual([100, 200])
})

test('parseTags karaoke k', () => {
  const segments = parseTags('{\\k50}Hel{\\k30}lo')
  const k0 = segments[0]!.effects.find(e => e.type === 'karaoke')
  const k1 = segments[1]!.effects.find(e => e.type === 'karaoke')
  expect(k0?.params).toEqual({ duration: 500, mode: 'fill' })
  expect(k1?.params).toEqual({ duration: 300, mode: 'fill' })
})

test('parseTags karaoke kf', () => {
  const segments = parseTags('{\\kf50}fade')
  const k = segments[0]!.effects.find(e => e.type === 'karaoke')
  expect(k?.params).toEqual({ duration: 500, mode: 'fade' })
})

test('parseTags karaoke ko', () => {
  const segments = parseTags('{\\ko50}outline')
  const k = segments[0]!.effects.find(e => e.type === 'karaoke')
  expect(k?.params).toEqual({ duration: 500, mode: 'outline' })
})

test('parseTags blur', () => {
  const segments = parseTags('{\\blur2}blurred')
  const blur = segments[0]!.effects.find(e => e.type === 'blur')
  expect(blur?.params).toEqual({ strength: 2 })
})

test('parseTags border', () => {
  const segments = parseTags('{\\bord3}bordered')
  const border = segments[0]!.effects.find(e => e.type === 'border')
  expect(border?.params).toEqual({ size: 3 })
})

test('parseTags shadow', () => {
  const segments = parseTags('{\\shad2}shadowed')
  const shadow = segments[0]!.effects.find(e => e.type === 'shadow')
  expect(shadow?.params).toEqual({ depth: 2 })
})

test('parseTags scale x', () => {
  const segments = parseTags('{\\fscx150}scaled')
  const scale = segments[0]!.effects.find(e => e.type === 'scale')
  expect(scale?.params).toEqual({ x: 150, y: 100 })
})

test('parseTags scale y', () => {
  const segments = parseTags('{\\fscy200}scaled')
  const scale = segments[0]!.effects.find(e => e.type === 'scale')
  expect(scale?.params).toEqual({ x: 100, y: 200 })
})

test('parseTags rotate', () => {
  const segments = parseTags('{\\frz45}rotated')
  const rotate = segments[0]!.effects.find(e => e.type === 'rotate')
  expect(rotate?.params).toEqual({ z: 45 })
})

test('parseTags fade', () => {
  const segments = parseTags('{\\fad(500,0)}fading')
  const fade = segments[0]!.effects.find(e => e.type === 'fade')
  expect(fade?.params).toEqual({ in: 500, out: 0 })
})

test('parseTags move', () => {
  const segments = parseTags('{\\move(0,0,100,100)}moving')
  const move = segments[0]!.effects.find(e => e.type === 'move')
  expect(move?.params).toEqual({ from: [0, 0], to: [100, 100] })
})

test('parseTags move with timing', () => {
  const segments = parseTags('{\\move(0,0,100,100,0,500)}moving')
  const move = segments[0]!.effects.find(e => e.type === 'move')
  expect(move?.params).toEqual({ from: [0, 0], to: [100, 100], t1: 0, t2: 500 })
})

test('parseTags clip', () => {
  const segments = parseTags('{\\clip(m 0 0 l 100 100)}clipped')
  const clip = segments[0]!.effects.find(e => e.type === 'clip')
  expect(clip?.params).toEqual({ path: '(m 0 0 l 100 100)', inverse: false })
})

test('parseTags iclip', () => {
  const segments = parseTags('{\\iclip(m 0 0 l 100 100)}clipped')
  const clip = segments[0]!.effects.find(e => e.type === 'clip')
  expect(clip?.params).toEqual({ path: '(m 0 0 l 100 100)', inverse: true })
})

test('parseTags reset', () => {
  const segments = parseTags('{\\r}reset')
  const reset = segments[0]!.effects.find(e => e.type === 'reset')
  expect(reset?.params).toEqual({ style: undefined })
})

test('parseTags reset with style', () => {
  const segments = parseTags('{\\rSign}reset')
  const reset = segments[0]!.effects.find(e => e.type === 'reset')
  expect(reset?.params).toEqual({ style: 'Sign' })
})

test('parseTags multiple tags in block', () => {
  const segments = parseTags('{\\b1\\i1}bold italic')
  expect(segments[0]!.style?.bold).toBe(true)
  expect(segments[0]!.style?.italic).toBe(true)
})

test('serializeTags roundtrip simple', () => {
  const original = parseTags('{\\b1}bold')
  const serialized = serializeTags(original)
  expect(serialized).toContain('\\b1')
  expect(serialized).toContain('bold')
})

test('serializeTags karaoke', () => {
  const segments = parseTags('{\\k50}text')
  const serialized = serializeTags(segments)
  expect(serialized).toContain('\\k50')
})

test('stripTags removes all tags', () => {
  expect(stripTags('{\\b1}Hello {\\i1}World')).toBe('Hello World')
})

test('stripTags preserves plain text', () => {
  expect(stripTags('Hello World')).toBe('Hello World')
})

test('stripTags handles nested braces', () => {
  expect(stripTags('{\\pos(100,200)}text')).toBe('text')
})

// Real-world complex tag tests
test('parseTags complex animation', () => {
  const text = '{\\fscy0\\fscx0\\an5\\be1\\fade(255,128,0,0,90,90,360)\\move(411,46,419,46,0,200)\\frx-270\\t(0,360,\\frx0)\\t(0,360,\\fscy120\\fscx120)}s'
  const segments = parseTags(text)
  expect(segments[0]!.text).toBe('s')
  expect(segments[0]!.style?.alignment).toBe(5)
  const moveEffect = segments[0]!.effects.find(e => e.type === 'move')
  expect(moveEffect).toBeDefined()
})

test('parseTags multiple transforms', () => {
  const text = '{\\t(0,33,\\bord10\\blur10)\\t(33,100,\\bord3)}text'
  const segments = parseTags(text)
  expect(segments[0]!.text).toBe('text')
  // transforms are not yet fully parsed, just verify no crash
})

test('parseTags alpha', () => {
  const segments = parseTags('{\\alpha&H80&}transparent')
  expect(segments[0]!.style?.alpha).toBeDefined()
})

test('parseTags 1a 2a 3a 4a', () => {
  const segments = parseTags('{\\1a&H50&\\2a&H60&\\3a&H70&\\4a&H80&}text')
  expect(segments[0]!.text).toBe('text')
})

test('parseTags 1c 2c 3c 4c colors', () => {
  const segments = parseTags('{\\1c&HFFFFFF&\\2c&H000000&\\3c&HFF0000&\\4c&H0000FF&}text')
  expect(segments[0]!.style?.primaryColor).toBe(0xFFFFFF)
})

test('parseTags spacing', () => {
  const segments = parseTags('{\\fsp5}spaced')
  const spacing = segments[0]!.effects.find(e => e.type === 'spacing')
  expect(spacing?.params).toEqual({ value: 5 })
})

test('parseTags angle', () => {
  const segments = parseTags('{\\fr45}rotated')
  expect(segments[0]!.effects.find(e => e.type === 'rotate')).toBeDefined()
})

test('parseTags frx fry frz', () => {
  const segments = parseTags('{\\frx90\\fry45\\frz30}rotated')
  const rotate = segments[0]!.effects.find(e => e.type === 'rotate')
  expect(rotate?.params).toHaveProperty('x', 90)
})

test('parseTags be (blur edge)', () => {
  const segments = parseTags('{\\be5}blurred')
  const blur = segments[0]!.effects.find(e => e.type === 'blur')
  expect(blur).toBeDefined()
})

test('parseTags xbord ybord', () => {
  const segments = parseTags('{\\xbord3\\ybord5}text')
  expect(segments[0]!.text).toBe('text')
})

test('parseTags xshad yshad', () => {
  const segments = parseTags('{\\xshad2\\yshad3}text')
  expect(segments[0]!.text).toBe('text')
})

test('parseTags clip rect', () => {
  const segments = parseTags('{\\clip(0,0,100,100)}clipped')
  const clip = segments[0]!.effects.find(e => e.type === 'clip')
  expect(clip?.params).toHaveProperty('path')
  expect(clip?.params.path).toBe('(0,0,100,100)')
})

test('parseTags org', () => {
  const segments = parseTags('{\\org(320,240)}rotated')
  expect(segments[0]!.text).toBe('rotated')
})

test('parseTags fax fay (shearing)', () => {
  const segments = parseTags('{\\fax0.2\\fay0.1}sheared')
  expect(segments[0]!.text).toBe('sheared')
})

test('parseTags drawing mode', () => {
  const segments = parseTags('{\\p1}m 0 0 l 100 100')
  const drawing = segments[0]!.effects.find(e => e.type === 'drawing')
  expect(drawing?.params).toHaveProperty('scale', 1)
})

test('parseTags complex karaoke from real file', () => {
  const text = '{\\an5\\pos(431,46)\\3c&H8AFDFF&\\t(0,33,\\3c&H8AFDFF&\\bord10\\blur10\\fscx110\\fscy110)\\t(33,100,\\3c&H8AFDFF&\\bord3\\bord3)\\t(33,0,\\fscx100\\fscy100)\\fad(0,300)}sis'
  const segments = parseTags(text)
  expect(segments[0]!.text).toBe('sis')
  expect(segments[0]!.style?.alignment).toBe(5)
})

test('parseTags converts N escape to newline', () => {
  const segments = parseTags('{\\b1}line1\\Nline2')
  expect(segments[0]!.text).toContain('\n')
})

test('serializeTags fade effect', () => {
  const segments = [{
    text: 'text',
    style: null,
    effects: [{ type: 'fade', params: { in: 500, out: 0 } }]
  }]
  const result = serializeTags(segments)
  expect(result).toContain('\\fad')
})

test('serializeTags multiple effects', () => {
  const segments = [{
    text: 'text',
    style: { bold: true, italic: true },
    effects: [
      { type: 'blur', params: { strength: 2 } },
      { type: 'border', params: { size: 3 } }
    ]
  }]
  const result = serializeTags(segments)
  expect(result).toContain('\\b1')
  expect(result).toContain('\\i1')
})

// Coverage: unclosed brace handling (lines 15-16)
test('parseTags unclosed brace', () => {
  const segments = parseTags('text{\\b1')
  expect(segments[0]!.text).toBe('text{\\b1')
})

// Coverage: invalid color catch blocks (lines 72-94)
test('parseTags invalid 2c color', () => {
  const segments = parseTags('{\\2cINVALID}text')
  expect(segments[0]!.text).toBe('text')
})

test('parseTags invalid 3c color', () => {
  const segments = parseTags('{\\3cINVALID}text')
  expect(segments[0]!.text).toBe('text')
})

test('parseTags invalid 4c color', () => {
  const segments = parseTags('{\\4cINVALID}text')
  expect(segments[0]!.text).toBe('text')
})

test('parseTags invalid alpha', () => {
  const segments = parseTags('{\\alphaINVALID}text')
  expect(segments[0]!.text).toBe('text')
})

// Coverage: K (capital) karaoke mode (lines 117-121)
test('parseTags karaoke K (capital)', () => {
  const segments = parseTags('{\\K50}fade')
  const k = segments[0]!.effects.find(e => e.type === 'karaoke')
  expect(k?.params).toEqual({ duration: 500, mode: 'fade' })
})

// Coverage: fry adding to existing rotate (lines 207-211)
test('parseTags fry adds to existing rotate', () => {
  const segments = parseTags('{\\frx90\\fry45}rotated')
  const rotate = segments[0]!.effects.find(e => e.type === 'rotate')
  expect(rotate?.params).toEqual({ x: 90, y: 45 })
})

// Coverage: fay shear adding to existing shear (lines 237-241)
test('parseTags fay adds to existing shear', () => {
  const segments = parseTags('{\\fax0.2\\fay0.1}sheared')
  const shear = segments[0]!.effects.find(e => e.type === 'shear')
  expect(shear?.params).toEqual({ x: 0.2, y: 0.1 })
})

// Coverage: fsp replacing existing spacing (lines 247-251)
test('parseTags fsp replaces existing spacing', () => {
  const segments = parseTags('{\\fsp5\\fsp10}spaced')
  const spacing = segments[0]!.effects.find(e => e.type === 'spacing')
  expect(spacing?.params).toEqual({ value: 10 })
})

// Coverage: fadeComplex (lines 266-275)
test('parseTags fadeComplex', () => {
  const segments = parseTags('{\\fade(255,128,0,0,90,90,360)}fading')
  const fade = segments[0]!.effects.find(e => e.type === 'fadeComplex')
  expect(fade?.params).toEqual({
    alphas: [255, 128, 0],
    times: [0, 90, 90, 360]
  })
})

// Coverage: drawing with p0 should not add effect (line 318)
test('parseTags drawing p0 does not add effect', () => {
  const segments = parseTags('{\\p0}normal text')
  const drawing = segments[0]!.effects.find(e => e.type === 'drawing')
  expect(drawing).toBeUndefined()
})

// Coverage: unknown tag handling (line 380)
test('parseTags unknown tag creates unknown effect', () => {
  const segments = parseTags('{\\unknowntag123}text')
  const unknown = segments[0]!.effects.find(e => e.type === 'unknown')
  expect(unknown?.params).toEqual({ format: 'ass', raw: '\\unknowntag123' })
})

// Coverage: serializeTags underline (line 405)
test('serializeTags underline', () => {
  const segments = [{ text: 'text', style: { underline: true }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\u1')
})

// Coverage: serializeTags strikeout (line 408)
test('serializeTags strikeout', () => {
  const segments = [{ text: 'text', style: { strikeout: true }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\s1')
})

// Coverage: serializeTags fontName (line 411)
test('serializeTags fontName', () => {
  const segments = [{ text: 'text', style: { fontName: 'Arial' }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\fnArial')
})

// Coverage: serializeTags fontSize (line 414)
test('serializeTags fontSize', () => {
  const segments = [{ text: 'text', style: { fontSize: 24 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\fs24')
})

// Coverage: serializeTags primaryColor (line 417)
test('serializeTags primaryColor', () => {
  const segments = [{ text: 'text', style: { primaryColor: 0xFF0000 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\c&H')
})

// Coverage: serializeTags alignment (line 420)
test('serializeTags alignment', () => {
  const segments = [{ text: 'text', style: { alignment: 5 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\an5')
})

// Coverage: serializeTags pos (line 423)
test('serializeTags pos', () => {
  const segments = [{ text: 'text', style: { pos: [100, 200] }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\pos(100,200')
})

// Coverage: serializeTags shadow (line 448)
test('serializeTags shadow', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'shadow', params: { depth: 2 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\shad2')
})

// Coverage: serializeTags scale (lines 452-454)
test('serializeTags scale', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'scale', params: { x: 150, y: 200 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\fscx150')
  expect(result).toContain('\\fscy200')
})

// Coverage: serializeTags rotate (lines 458-461)
test('serializeTags rotate xyz', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'rotate', params: { x: 10, y: 20, z: 30 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\frx10')
  expect(result).toContain('\\fry20')
  expect(result).toContain('\\frz30')
})

// Coverage: serializeTags shear (lines 465-467)
test('serializeTags shear', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'shear', params: { x: 0.1, y: 0.2 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\fax0.1')
  expect(result).toContain('\\fay0.2')
})

// Coverage: serializeTags spacing (line 471)
test('serializeTags spacing', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'spacing', params: { value: 5 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\fsp5')
})

// Coverage: serializeTags fadeComplex (lines 480-482)
test('serializeTags fadeComplex', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'fadeComplex', params: { alphas: [255, 128, 0], times: [0, 90, 90, 360] } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\fade(255,128,0,0,90,90,360')
})

// Coverage: serializeTags move with timing (lines 487-488)
test('serializeTags move with timing', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'move', params: { from: [0, 0], to: [100, 100], t1: 0, t2: 500 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\move(0,0,100,100,0,500')
})

// Coverage: serializeTags move without timing (line 489-490)
test('serializeTags move without timing', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'move', params: { from: [0, 0], to: [100, 100] } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\move(0,0,100,100')
  expect(result).not.toContain(',0,500')
})

// Coverage: serializeTags clip (lines 494-496)
test('serializeTags clip', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'clip', params: { path: '(m 0 0 l 100 100)', inverse: false } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\clip(m 0 0 l 100 100)')
})

// Coverage: serializeTags iclip (line 495)
test('serializeTags iclip', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'clip', params: { path: '(m 0 0 l 100 100)', inverse: true } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\iclip(m 0 0 l 100 100)')
})

// Coverage: serializeTags drawing (lines 499-501)
test('serializeTags drawing', () => {
  const segments = [{ text: 'm 0 0 l 100 100', style: null, effects: [{ type: 'drawing', params: { scale: 1 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\p1')
})

// Coverage: serializeTags reset (lines 504-506)
test('serializeTags reset', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'reset', params: { style: 'Sign' } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\rSign')
})

test('serializeTags reset without style', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'reset', params: {} }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\r')
})

// Coverage: serializeTags unknown (lines 509-511)
test('serializeTags unknown effect', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'unknown', params: { raw: '\\custom' } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\custom')
})

// Coverage: karaoke kf mode serialization (line 431)
test('serializeTags karaoke fade mode', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'karaoke', params: { duration: 500, mode: 'fade' } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\kf50')
})

// Coverage: karaoke ko mode serialization (line 431)
test('serializeTags karaoke outline mode', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'karaoke', params: { duration: 500, mode: 'outline' } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\ko50')
})

// Coverage: replacing existing karaoke (lines 109-110, 119-120, 129-130, 139-140)
test('parseTags karaoke replaces previous', () => {
  const segments = parseTags('{\\k50\\k30}text')
  const karaokeEffects = segments[0]!.effects.filter(e => e.type === 'karaoke')
  expect(karaokeEffects).toHaveLength(1)
  expect(karaokeEffects[0]?.params).toEqual({ duration: 300, mode: 'fill' })
})

// Coverage: replacing existing blur (line 150)
test('parseTags blur replaces previous', () => {
  const segments = parseTags('{\\blur2\\blur5}text')
  const blurEffects = segments[0]!.effects.filter(e => e.type === 'blur')
  expect(blurEffects).toHaveLength(1)
  expect(blurEffects[0]?.params).toEqual({ strength: 5 })
})

// Coverage: replacing existing border (line 160)
test('parseTags border replaces previous', () => {
  const segments = parseTags('{\\bord2\\bord5}text')
  const borderEffects = segments[0]!.effects.filter(e => e.type === 'border')
  expect(borderEffects).toHaveLength(1)
  expect(borderEffects[0]?.params).toEqual({ size: 5 })
})

// Coverage: replacing existing shadow (line 170)
test('parseTags shadow replaces previous', () => {
  const segments = parseTags('{\\shad2\\shad5}text')
  const shadowEffects = segments[0]!.effects.filter(e => e.type === 'shadow')
  expect(shadowEffects).toHaveLength(1)
  expect(shadowEffects[0]?.params).toEqual({ depth: 5 })
})

// Coverage: replacing existing fade (line 259)
test('parseTags fade replaces previous', () => {
  const segments = parseTags('{\\fad(100,100)\\fad(500,0)}text')
  const fadeEffects = segments[0]!.effects.filter(e => e.type === 'fade')
  expect(fadeEffects).toHaveLength(1)
  expect(fadeEffects[0]?.params).toEqual({ in: 500, out: 0 })
})

// Coverage: replacing existing fadeComplex (line 268)
test('parseTags fadeComplex replaces previous', () => {
  const segments = parseTags('{\\fade(0,0,0,0,0,0,0)\\fade(255,128,0,0,90,90,360)}text')
  const fadeEffects = segments[0]!.effects.filter(e => e.type === 'fadeComplex')
  expect(fadeEffects).toHaveLength(1)
})

// Coverage: replacing existing move (line 291)
test('parseTags move replaces previous', () => {
  const segments = parseTags('{\\move(0,0,50,50)\\move(0,0,100,100)}text')
  const moveEffects = segments[0]!.effects.filter(e => e.type === 'move')
  expect(moveEffects).toHaveLength(1)
  expect(moveEffects[0]?.params.to).toEqual([100, 100])
})

// Coverage: replacing existing clip (lines 299-300, 308-309)
test('parseTags clip replaces previous', () => {
  const segments = parseTags('{\\clip(0,0,50,50)\\clip(0,0,100,100)}text')
  const clipEffects = segments[0]!.effects.filter(e => e.type === 'clip')
  expect(clipEffects).toHaveLength(1)
})

// Coverage: replacing existing drawing (line 320)
test('parseTags drawing replaces previous', () => {
  const segments = parseTags('{\\p1\\p2}m 0 0')
  const drawingEffects = segments[0]!.effects.filter(e => e.type === 'drawing')
  expect(drawingEffects).toHaveLength(1)
  expect(drawingEffects[0]?.params.scale).toBe(2)
})

// Coverage: replacing existing reset (line 330)
test('parseTags reset replaces previous', () => {
  const segments = parseTags('{\\r\\rSign}text')
  const resetEffects = segments[0]!.effects.filter(e => e.type === 'reset')
  expect(resetEffects).toHaveLength(1)
  expect(resetEffects[0]?.params.style).toBe('Sign')
})

// Coverage: fscx modifying existing scale (line 180)
test('parseTags fscx modifies existing scale', () => {
  const segments = parseTags('{\\fscy200\\fscx150}text')
  const scale = segments[0]!.effects.find(e => e.type === 'scale')
  expect(scale?.params).toEqual({ x: 150, y: 200 })
})

// Coverage: fscy modifying existing scale (line 190)
test('parseTags fscy modifies existing scale', () => {
  const segments = parseTags('{\\fscx150\\fscy200}text')
  const scale = segments[0]!.effects.find(e => e.type === 'scale')
  expect(scale?.params).toEqual({ x: 150, y: 200 })
})

// Coverage: frz modifying existing rotate (lines 219-221)
test('parseTags frz modifies existing rotate', () => {
  const segments = parseTags('{\\frx90\\frz30}text')
  const rotate = segments[0]!.effects.find(e => e.type === 'rotate')
  expect(rotate?.params).toEqual({ x: 90, z: 30 })
})

// Coverage: animate/transform handler (lines 338-351)
// Note: transform content without inner backslash since block is pre-split by \
test('parseTags transform with timing and accel', () => {
  const segments = parseTags('{\\t(0,1000,2,fs24)}text')
  const animate = segments[0]!.effects.find(e => e.type === 'animate')
  expect(animate).toBeDefined()
  expect(animate?.params.start).toBe(0)
  expect(animate?.params.end).toBe(1000)
  expect(animate?.params.accel).toBe(2)
})

test('parseTags transform without timing', () => {
  const segments = parseTags('{\\t(fs24)}text')
  const animate = segments[0]!.effects.find(e => e.type === 'animate')
  expect(animate).toBeDefined()
  expect(animate?.params.start).toBe(0)
  expect(animate?.params.end).toBe(0)
})

test('parseTags transform with timing only', () => {
  const segments = parseTags('{\\t(500,1500,fs48)}text')
  const animate = segments[0]!.effects.find(e => e.type === 'animate')
  expect(animate).toBeDefined()
  expect(animate?.params.start).toBe(500)
  expect(animate?.params.end).toBe(1500)
  expect(animate?.params.accel).toBeUndefined()
})

// Coverage: legacy alignment \a tag (lines 71-81)
test('parseTags legacy alignment bottom row', () => {
  const segments = parseTags('{\\a2}text')
  expect(segments[0]!.style?.alignment).toBe(2)
})

test('parseTags legacy alignment top row', () => {
  // SSA top 5-7 -> ASS 7-9
  const segments = parseTags('{\\a6}text')
  expect(segments[0]!.style?.alignment).toBe(8)
})

test('parseTags legacy alignment middle row', () => {
  // SSA middle 9-11 -> ASS 4-6
  const segments = parseTags('{\\a10}text')
  expect(segments[0]!.style?.alignment).toBe(5)
})

test('parseTags legacy alignment invalid value', () => {
  // Value outside valid range (not 1-3, 5-7, or 9-11)
  const segments = parseTags('{\\a4}text')
  expect(segments[0]!.style?.alignment).toBeUndefined()
})

// Coverage: karaoke absolute time \kt (lines 209-213)
test('parseTags karaoke absolute time', () => {
  const segments = parseTags('{\\kt100}text')
  const kt = segments[0]!.effects.find(e => e.type === 'karaokeAbsolute')
  expect(kt).toBeDefined()
  expect(kt?.params.time).toBe(100)
})

test('parseTags karaoke absolute replaces previous', () => {
  const segments = parseTags('{\\kt100\\kt200}text')
  const ktEffects = segments[0]!.effects.filter(e => e.type === 'karaokeAbsolute')
  expect(ktEffects).toHaveLength(1)
  expect(ktEffects[0]?.params.time).toBe(200)
})

// Coverage: drawing baseline offset \pbo (lines 440-444)
test('parseTags drawing baseline offset', () => {
  const segments = parseTags('{\\pbo10}text')
  const pbo = segments[0]!.effects.find(e => e.type === 'drawingBaseline')
  expect(pbo).toBeDefined()
  expect(pbo?.params.offset).toBe(10)
})

test('parseTags drawing baseline replaces previous', () => {
  const segments = parseTags('{\\pbo5\\pbo-15.5}text')
  const pboEffects = segments[0]!.effects.filter(e => e.type === 'drawingBaseline')
  expect(pboEffects).toHaveLength(1)
  expect(pboEffects[0]?.params.offset).toBe(-15.5)
})

// Coverage: serialization - bold with numeric weight (line 522)
test('serializeTags bold with numeric weight', () => {
  const segments = [{ text: 'text', style: { bold: 700 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\b700')
})

// Coverage: serialization - fontEncoding (line 543)
test('serializeTags fontEncoding', () => {
  const segments = [{ text: 'text', style: { fontEncoding: 1 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\fe1')
})

// Coverage: serialization - wrapStyle (line 546)
test('serializeTags wrapStyle', () => {
  const segments = [{ text: 'text', style: { wrapStyle: 2 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\q2')
})

// Coverage: serialization - secondaryColor (line 552)
test('serializeTags secondaryColor', () => {
  const segments = [{ text: 'text', style: { secondaryColor: 0x00FF00 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\2c&H')
})

// Coverage: serialization - outlineColor (line 555)
test('serializeTags outlineColor', () => {
  const segments = [{ text: 'text', style: { outlineColor: 0x0000FF }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\3c&H')
})

// Coverage: serialization - backColor (line 558)
test('serializeTags backColor', () => {
  const segments = [{ text: 'text', style: { backColor: 0x000000 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\4c&H')
})

// Coverage: serialization - alpha (line 561)
test('serializeTags alpha', () => {
  const segments = [{ text: 'text', style: { alpha: 128 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\alpha&H')
})

// Coverage: serialization - primaryAlpha (line 564)
test('serializeTags primaryAlpha', () => {
  const segments = [{ text: 'text', style: { primaryAlpha: 64 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\1a&H')
})

// Coverage: serialization - secondaryAlpha (line 567)
test('serializeTags secondaryAlpha', () => {
  const segments = [{ text: 'text', style: { secondaryAlpha: 32 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\2a&H')
})

// Coverage: serialization - outlineAlpha (line 570)
test('serializeTags outlineAlpha', () => {
  const segments = [{ text: 'text', style: { outlineAlpha: 16 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\3a&H')
})

// Coverage: serialization - backAlpha (line 573)
test('serializeTags backAlpha', () => {
  const segments = [{ text: 'text', style: { backAlpha: 8 }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\4a&H')
})

// Coverage: serialization - karaokeAbsolute (lines 590-594)
test('serializeTags karaokeAbsolute', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'karaokeAbsolute', params: { time: 100 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\kt100')
})

// Coverage: serialization - origin (lines 614-618)
test('serializeTags origin', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'origin', params: { x: 320, y: 240 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\org(320,240)')
})

// Coverage: serialization - drawingBaseline (lines 672-676)
test('serializeTags drawingBaseline', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'drawingBaseline', params: { offset: 15 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\pbo15')
})

// === Additional tests for new tags ===

// Per-channel alpha parsing
test('parseTags 1a primary alpha', () => {
  const segments = parseTags('{\\1a&H80&}text')
  expect(segments[0]!.style?.primaryAlpha).toBe(0x80)
})

test('parseTags 2a secondary alpha', () => {
  const segments = parseTags('{\\2a&H40&}text')
  expect(segments[0]!.style?.secondaryAlpha).toBe(0x40)
})

test('parseTags 3a outline alpha', () => {
  const segments = parseTags('{\\3a&H20&}text')
  expect(segments[0]!.style?.outlineAlpha).toBe(0x20)
})

test('parseTags 4a back alpha', () => {
  const segments = parseTags('{\\4a&HFF&}text')
  expect(segments[0]!.style?.backAlpha).toBe(0xFF)
})

// Per-axis border parsing
test('parseTags xbord', () => {
  const segments = parseTags('{\\xbord3}text')
  const border = segments[0]!.effects.find(e => e.type === 'border')
  expect(border?.params.x).toBe(3)
})

test('parseTags ybord', () => {
  const segments = parseTags('{\\ybord5}text')
  const border = segments[0]!.effects.find(e => e.type === 'border')
  expect(border?.params.y).toBe(5)
})

test('parseTags xbord ybord combined', () => {
  const segments = parseTags('{\\xbord3\\ybord5}text')
  const border = segments[0]!.effects.find(e => e.type === 'border')
  expect(border?.params).toEqual({ size: 0, x: 3, y: 5 })
})

// Per-axis shadow parsing
test('parseTags xshad', () => {
  const segments = parseTags('{\\xshad2}text')
  const shadow = segments[0]!.effects.find(e => e.type === 'shadow')
  expect(shadow?.params.x).toBe(2)
})

test('parseTags yshad', () => {
  const segments = parseTags('{\\yshad-3}text')
  const shadow = segments[0]!.effects.find(e => e.type === 'shadow')
  expect(shadow?.params.y).toBe(-3)
})

test('parseTags xshad yshad combined', () => {
  const segments = parseTags('{\\xshad2\\yshad-3}text')
  const shadow = segments[0]!.effects.find(e => e.type === 'shadow')
  expect(shadow?.params).toEqual({ depth: 0, x: 2, y: -3 })
})

// Origin parsing
test('parseTags org', () => {
  const segments = parseTags('{\\org(320,240)}text')
  const origin = segments[0]!.effects.find(e => e.type === 'origin')
  expect(origin?.params).toEqual({ x: 320, y: 240 })
})

test('parseTags org replaces previous', () => {
  const segments = parseTags('{\\org(100,100)\\org(200,200)}text')
  const originEffects = segments[0]!.effects.filter(e => e.type === 'origin')
  expect(originEffects).toHaveLength(1)
  expect(originEffects[0]?.params).toEqual({ x: 200, y: 200 })
})

// Font encoding parsing
test('parseTags font encoding', () => {
  const segments = parseTags('{\\fe1}text')
  expect(segments[0]!.style?.fontEncoding).toBe(1)
})

test('parseTags font encoding 128', () => {
  const segments = parseTags('{\\fe128}text')
  expect(segments[0]!.style?.fontEncoding).toBe(128)
})

// Wrap style parsing
test('parseTags wrap style 0', () => {
  const segments = parseTags('{\\q0}text')
  expect(segments[0]!.style?.wrapStyle).toBe(0)
})

test('parseTags wrap style 2', () => {
  const segments = parseTags('{\\q2}text')
  expect(segments[0]!.style?.wrapStyle).toBe(2)
})

// Bold with font weight
test('parseTags bold weight 400', () => {
  const segments = parseTags('{\\b400}text')
  expect(segments[0]!.style?.bold).toBe(400)
})

test('parseTags bold weight 700', () => {
  const segments = parseTags('{\\b700}text')
  expect(segments[0]!.style?.bold).toBe(700)
})

// Escape sequence tests
test('parseTags hard space \\h', () => {
  const segments = parseTags('hello\\hworld')
  expect(segments[0]!.text).toBe('hello\u00A0world')
})

test('parseTags soft line break \\n', () => {
  const segments = parseTags('line1\\nline2')
  expect(segments[0]!.text).toBe('line1\nline2')
})

test('parseTags hard line break \\N', () => {
  const segments = parseTags('line1\\Nline2')
  expect(segments[0]!.text).toBe('line1\nline2')
})

test('serializeTags newline to \\N', () => {
  const segments = [{ text: 'line1\nline2', style: null, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toBe('line1\\Nline2')
})

test('serializeTags non-breaking space to \\h', () => {
  const segments = [{ text: 'hello\u00A0world', style: null, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toBe('hello\\hworld')
})

// Serialization - per-axis border
test('serializeTags xbord ybord', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'border', params: { size: 0, x: 3, y: 5 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\xbord3')
  expect(result).toContain('\\ybord5')
})

// Serialization - per-axis shadow
test('serializeTags xshad yshad', () => {
  const segments = [{ text: 'text', style: null, effects: [{ type: 'shadow', params: { depth: 0, x: 2, y: -3 } }] }]
  const result = serializeTags(segments)
  expect(result).toContain('\\xshad2')
  expect(result).toContain('\\yshad-3')
})
