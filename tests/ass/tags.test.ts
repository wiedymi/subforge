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
