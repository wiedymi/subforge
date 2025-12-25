import { test, expect } from 'bun:test'
import { parseSSA } from '../../src/formats/text/ssa/parser.ts'
import { toSSA } from '../../src/formats/text/ssa/serializer.ts'
import { readFileSync } from 'fs'
import { join } from 'path'

test('SSA roundtrip preserves basic structure', () => {
  const original = `[Script Info]
Title: Roundtrip Test
PlayResX: 640
PlayResY: 480

[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
Style: Default,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,1,2,3,2,20,20,20,0,1

[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello world`

  const doc = parseSSA(original)
  const output = toSSA(doc)

  expect(output).toContain('[Script Info]')
  expect(output).toContain('Title: Roundtrip Test')
  expect(output).toContain('[V4 Styles]')
  expect(output).toContain('[Events]')
  expect(output).toContain('Hello world')
})

test('SSA roundtrip preserves event data', () => {
  const original = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,First line
Dialogue: 0,0:00:05.50,0:00:10.00,Default,Alice,10,20,30,,Second line
Dialogue: 0,0:00:11.00,0:00:15.00,Default,,0,0,0,Scroll up,Third line`

  const doc = parseSSA(original)
  const output = toSSA(doc)
  const doc2 = parseSSA(output)

  expect(doc2.events).toHaveLength(3)
  expect(doc2.events[0]!.text).toBe('First line')
  expect(doc2.events[1]!.actor).toBe('Alice')
  expect(doc2.events[1]!.marginL).toBe(10)
  expect(doc2.events[1]!.marginR).toBe(20)
  expect(doc2.events[1]!.marginV).toBe(30)
  expect(doc2.events[2]!.effect).toBe('Scroll up')
})

test('SSA roundtrip preserves style data', () => {
  const original = `[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
Style: Custom,Verdana,48,&H00FF0000,&H0000FF00,&H000000FF,&H00808080,-1,-1,1,3,4,10,25,30,35,0,1`

  const doc = parseSSA(original)
  const output = toSSA(doc)
  const doc2 = parseSSA(output)

  const style = doc2.styles.get('Custom')!
  expect(style.fontName).toBe('Verdana')
  expect(style.fontSize).toBe(48)
  expect(style.bold).toBe(true)
  expect(style.italic).toBe(true)
  expect(style.outline).toBe(3)
  expect(style.shadow).toBe(4)
  expect(style.marginL).toBe(25)
  expect(style.marginR).toBe(30)
  expect(style.marginV).toBe(35)
})

test('SSA roundtrip preserves alignment conversions', () => {
  const original = `[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
Style: Left,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,1,2,3,1,20,20,20,0,1
Style: TopLeft,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,1,2,3,9,20,20,20,0,1`

  const doc = parseSSA(original)
  const output = toSSA(doc)
  const doc2 = parseSSA(output)

  // SSA 1 -> ASS 1 -> SSA 1
  expect(doc2.styles.get('Left')!.alignment).toBe(1)
  // SSA 9 -> ASS 7 -> SSA 9
  expect(doc2.styles.get('TopLeft')!.alignment).toBe(7)
})

test('SSA roundtrip with fixture file', () => {
  const fixturePath = join(__dirname, '../fixtures/ssa/simple.ssa')
  const original = readFileSync(fixturePath, 'utf-8')

  const doc = parseSSA(original)
  const output = toSSA(doc)
  const doc2 = parseSSA(output)

  expect(doc2.info.title).toBe(doc.info.title)
  expect(doc2.events.length).toBe(doc.events.length)
  expect(doc2.styles.size).toBe(doc.styles.size)

  for (let i = 0; i < doc.events.length; i++) {
    expect(doc2.events[i]!.text).toBe(doc.events[i]!.text)
    expect(doc2.events[i]!.start).toBe(doc.events[i]!.start)
    expect(doc2.events[i]!.end).toBe(doc.events[i]!.end)
  }
})

test('SSA roundtrip preserves comments', () => {
  const original = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Comment: 0,0:00:00.00,0:00:00.00,Default,,0,0,0,,Comment line
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Dialogue line`

  const doc = parseSSA(original)
  const output = toSSA(doc)
  const doc2 = parseSSA(output)

  expect(doc2.comments).toHaveLength(1)
  expect(doc2.comments[0]!.text).toBe('Comment line')
  expect(doc2.events).toHaveLength(1)
})

test('SSA roundtrip preserves text with special characters', () => {
  const original = `[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Text with {\\b1}tags{\\b0}
Dialogue: 0,0:00:05.00,0:00:10.00,Default,,0,0,0,,Text, with, commas`

  const doc = parseSSA(original)
  const output = toSSA(doc)
  const doc2 = parseSSA(output)

  expect(doc2.events[0]!.text).toBe('Text with {\\b1}tags{\\b0}')
  expect(doc2.events[1]!.text).toBe('Text, with, commas')
})
