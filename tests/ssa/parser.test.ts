import { test, expect } from 'bun:test'
import { parseSSA, parseSSAResult } from '../../src/formats/text/ssa/parser.ts'
import { readFileSync } from 'fs'
import { join } from 'path'

const simpleSSA = `[Script Info]
Title: Test
PlayResX: 640
PlayResY: 480

[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
Style: Default,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,1,2,3,2,20,20,20,0,1

[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello world`

test('parseSSA parses script info', () => {
  const doc = parseSSA(simpleSSA)
  expect(doc.info.title).toBe('Test')
  expect(doc.info.playResX).toBe(640)
  expect(doc.info.playResY).toBe(480)
})

test('parseSSA parses V4 styles', () => {
  const doc = parseSSA(simpleSSA)
  expect(doc.styles.has('Default')).toBe(true)
  const style = doc.styles.get('Default')!
  expect(style.fontName).toBe('Arial')
  expect(style.fontSize).toBe(32)
  expect(style.bold).toBe(true)
  expect(style.italic).toBe(false)
})

test('parseSSA handles TertiaryColour field', () => {
  const doc = parseSSA(simpleSSA)
  const style = doc.styles.get('Default')!
  // TertiaryColour in SSA maps to outlineColor in our internal format
  expect(style.outlineColor).toBeDefined()
})

test('parseSSA converts SSA alignment to ASS alignment', () => {
  const ssaWithAlignment = `[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
Style: Left,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,1,2,3,1,20,20,20,0,1
Style: Center,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,1,2,3,2,20,20,20,0,1
Style: Right,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,1,2,3,3,20,20,20,0,1
Style: TopLeft,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,1,2,3,9,20,20,20,0,1
Style: TopCenter,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,1,2,3,10,20,20,20,0,1
Style: TopRight,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,1,2,3,11,20,20,20,0,1`

  const doc = parseSSA(ssaWithAlignment)
  expect(doc.styles.get('Left')!.alignment).toBe(1)   // SSA 1 -> ASS 1
  expect(doc.styles.get('Center')!.alignment).toBe(2) // SSA 2 -> ASS 2
  expect(doc.styles.get('Right')!.alignment).toBe(3)  // SSA 3 -> ASS 3
  expect(doc.styles.get('TopLeft')!.alignment).toBe(7)   // SSA 9 -> ASS 7
  expect(doc.styles.get('TopCenter')!.alignment).toBe(8) // SSA 10 -> ASS 8
  expect(doc.styles.get('TopRight')!.alignment).toBe(9)  // SSA 11 -> ASS 9
})

test('parseSSA parses dialogue with Marked field', () => {
  const doc = parseSSA(simpleSSA)
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(5000)
  expect(doc.events[0]!.text).toBe('Hello world')
  expect(doc.events[0]!.id).toBeDefined()
})

test('parseSSA parses multiple events', () => {
  const ssa = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,First
Dialogue: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,Second
Dialogue: 0,0:00:03.00,0:00:04.00,Default,,0,0,0,,Third`

  const doc = parseSSA(ssa)
  expect(doc.events).toHaveLength(3)
  expect(doc.events[0]!.text).toBe('First')
  expect(doc.events[1]!.text).toBe('Second')
  expect(doc.events[2]!.text).toBe('Third')
})

test('parseSSA parses comments', () => {
  const ssa = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Comment: 0,0:00:00.00,0:00:00.00,Default,,0,0,0,,This is a comment
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello`

  const doc = parseSSA(ssa)
  expect(doc.comments).toHaveLength(1)
  expect(doc.comments[0]!.text).toBe('This is a comment')
})

test('parseSSA parses actor field', () => {
  const ssa = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,Alice,0,0,0,,Hello`

  const doc = parseSSA(ssa)
  expect(doc.events[0]!.actor).toBe('Alice')
})

test('parseSSA parses margins', () => {
  const ssa = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,10,20,30,,Hello`

  const doc = parseSSA(ssa)
  expect(doc.events[0]!.marginL).toBe(10)
  expect(doc.events[0]!.marginR).toBe(20)
  expect(doc.events[0]!.marginV).toBe(30)
})

test('parseSSA parses effect field', () => {
  const ssa = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,Scroll up;100;200;,Hello`

  const doc = parseSSA(ssa)
  expect(doc.events[0]!.effect).toBe('Scroll up;100;200;')
})

test('parseSSA preserves text with commas', () => {
  const ssa = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello, world, how are you?`

  const doc = parseSSA(ssa)
  expect(doc.events[0]!.text).toBe('Hello, world, how are you?')
})

test('parseSSA loads fixture file', () => {
  const fixturePath = join(__dirname, '../fixtures/ssa/simple.ssa')
  const content = readFileSync(fixturePath, 'utf-8')
  const doc = parseSSA(content)

  expect(doc.info.title).toBe('Simple SSA Test')
  expect(doc.info.author).toBe('Subforge')
  expect(doc.events).toHaveLength(3)
  expect(doc.styles.has('Default')).toBe(true)
})

test('parseSSAResult returns errors without throwing', () => {
  const badSSA = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,invalid,0:00:05.00,Default,,0,0,0,,Hello`

  const result = parseSSAResult(badSSA, { onError: 'collect' })
  expect(result.errors.length).toBeGreaterThan(0)
})

test('parseSSA handles Marked field in events', () => {
  const ssa = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Marked: 1,0:00:01.00,0:00:05.00,Default,,0,0,0,,Marked line
Dialogue: 0,0:00:05.00,0:00:10.00,Default,,0,0,0,,Normal line`

  const doc = parseSSA(ssa)
  expect(doc.events).toHaveLength(2)
  expect(doc.events[0]!.text).toBe('Marked line')
  expect(doc.events[1]!.text).toBe('Normal line')
})
