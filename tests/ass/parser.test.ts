import { test, expect } from 'bun:test'
import { parseASS, parseASSResult } from '../../src/ass/parser.ts'

const simpleASS = `[Script Info]
Title: Test
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello world`

test('parseASS parses script info', () => {
  const doc = parseASS(simpleASS)
  expect(doc.info.title).toBe('Test')
  expect(doc.info.playResX).toBe(1920)
  expect(doc.info.playResY).toBe(1080)
})

test('parseASS parses styles', () => {
  const doc = parseASS(simpleASS)
  expect(doc.styles.has('Default')).toBe(true)
  const style = doc.styles.get('Default')!
  expect(style.fontName).toBe('Arial')
  expect(style.fontSize).toBe(48)
})

test('parseASS parses dialogue', () => {
  const doc = parseASS(simpleASS)
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(5000)
  expect(doc.events[0]!.text).toBe('Hello world')
  expect(doc.events[0]!.id).toBeDefined()
})

test('parseASS parses multiple events', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,First
Dialogue: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,Second
Dialogue: 1,0:00:03.00,0:00:04.00,Default,,0,0,0,,Third`

  const doc = parseASS(ass)
  expect(doc.events).toHaveLength(3)
  expect(doc.events[0]!.text).toBe('First')
  expect(doc.events[1]!.text).toBe('Second')
  expect(doc.events[2]!.layer).toBe(1)
})

test('parseASS parses comments', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Comment: 0,0:00:00.00,0:00:00.00,Default,,0,0,0,,This is a comment
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello`

  const doc = parseASS(ass)
  expect(doc.comments).toHaveLength(1)
  expect(doc.comments[0]!.text).toBe('This is a comment')
})

test('parseASS parses actor field', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,Alice,0,0,0,,Hello`

  const doc = parseASS(ass)
  expect(doc.events[0]!.actor).toBe('Alice')
})

test('parseASS parses margins', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,10,20,30,,Hello`

  const doc = parseASS(ass)
  expect(doc.events[0]!.marginL).toBe(10)
  expect(doc.events[0]!.marginR).toBe(20)
  expect(doc.events[0]!.marginV).toBe(30)
})

test('parseASS parses effect field', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,Scroll up;100;200;,Hello`

  const doc = parseASS(ass)
  expect(doc.events[0]!.effect).toBe('Scroll up;100;200;')
})

test('parseASS preserves text with commas', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello, world, how are you?`

  const doc = parseASS(ass)
  expect(doc.events[0]!.text).toBe('Hello, world, how are you?')
})

test('parseASS parses style colors', () => {
  const ass = `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Test,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1`

  const doc = parseASS(ass)
  const style = doc.styles.get('Test')!
  expect(style.primaryColor).toBe(0x00FFFFFF)
  expect(style.secondaryColor).toBe(0x000000FF)
  expect(style.backColor).toBe(0x80000000)
})

test('parseASS parses style flags', () => {
  const ass = `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Test,Arial,48,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,-1,-1,0,0,100,100,0,0,1,2,2,2,10,10,10,1`

  const doc = parseASS(ass)
  const style = doc.styles.get('Test')!
  expect(style.bold).toBe(true)
  expect(style.italic).toBe(true)
  expect(style.underline).toBe(false)
})

test('parseASSResult collects errors', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,invalid,0:00:05.00,Default,,0,0,0,,Hello`

  const result = parseASSResult(ass, { onError: 'collect' })
  expect(result.errors.length).toBeGreaterThan(0)
  expect(result.errors[0]!.code).toBe('INVALID_TIMESTAMP')
})

test('parseASS with ScaledBorderAndShadow', () => {
  const ass = `[Script Info]
ScaledBorderAndShadow: yes`

  const doc = parseASS(ass)
  expect(doc.info.scaleBorderAndShadow).toBe(true)
})

test('parseASS with WrapStyle', () => {
  const ass = `[Script Info]
WrapStyle: 2`

  const doc = parseASS(ass)
  expect(doc.info.wrapStyle).toBe(2)
})
