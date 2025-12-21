import { test, expect } from 'bun:test'
import { parseSSA } from '../../src/ssa/parser.ts'
import { toSSA } from '../../src/ssa/serializer.ts'
import { createDocument } from '../../src/core/document.ts'

test('toSSA generates valid SSA output', () => {
  const doc = createDocument()
  doc.info.title = 'Test'
  doc.info.playResX = 640
  doc.info.playResY = 480

  const output = toSSA(doc)

  expect(output).toContain('[Script Info]')
  expect(output).toContain('Title: Test')
  expect(output).toContain('PlayResX: 640')
  expect(output).toContain('PlayResY: 480')
})

test('toSSA outputs V4 Styles section', () => {
  const doc = createDocument()
  const output = toSSA(doc)

  expect(output).toContain('[V4 Styles]')
  expect(output).toContain('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding')
})

test('toSSA converts ASS alignment to SSA alignment', () => {
  const doc = createDocument()
  const style = doc.styles.get('Default')!

  // Test bottom-center (ASS 2 -> SSA 2)
  style.alignment = 2
  let output = toSSA(doc)
  expect(output).toMatch(/Style: Default,.*,2,/)

  // Test top-left (ASS 7 -> SSA 9)
  style.alignment = 7
  output = toSSA(doc)
  expect(output).toMatch(/Style: Default,.*,9,/)

  // Test top-center (ASS 8 -> SSA 10)
  style.alignment = 8
  output = toSSA(doc)
  expect(output).toMatch(/Style: Default,.*,10,/)

  // Test top-right (ASS 9 -> SSA 11)
  style.alignment = 9
  output = toSSA(doc)
  expect(output).toMatch(/Style: Default,.*,11,/)
})

test('toSSA outputs Events with Marked field', () => {
  const doc = createDocument()
  doc.events.push({
    id: 1,
    start: 1000,
    end: 5000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Hello world',
    segments: [],
    dirty: false
  })

  const output = toSSA(doc)

  expect(output).toContain('[Events]')
  expect(output).toContain('Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text')
  expect(output).toContain('Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello world')
})

test('toSSA outputs AlphaLevel field in styles', () => {
  const doc = createDocument()
  const output = toSSA(doc)

  // AlphaLevel should be 0 in SSA output
  expect(output).toMatch(/Style: Default,.*,0,\d+\n/)
})

test('toSSA preserves event data', () => {
  const doc = createDocument()
  doc.events.push({
    id: 1,
    start: 5500,
    end: 10000,
    layer: 0,
    style: 'Custom',
    actor: 'Alice',
    marginL: 10,
    marginR: 20,
    marginV: 30,
    effect: 'Scroll up',
    text: 'Test text',
    segments: [],
    dirty: false
  })

  const output = toSSA(doc)

  expect(output).toContain('Dialogue: 0,0:00:05.50,0:00:10.00,Custom,Alice,10,20,30,Scroll up,Test text')
})

test('toSSA outputs comments', () => {
  const doc = createDocument()
  doc.comments.push({
    text: 'This is a comment',
    beforeEventIndex: 0
  })

  const output = toSSA(doc)

  expect(output).toContain('Comment: 0,0:00:00.00,0:00:00.00,Default,,0,0,0,,This is a comment')
})

test('toSSA handles fonts section', () => {
  const doc = createDocument()
  doc.fonts = [{
    name: 'Arial.ttf',
    data: 'ABCDEFGH'
  }]

  const output = toSSA(doc)

  expect(output).toContain('[Fonts]')
  expect(output).toContain('fontname: Arial.ttf')
  expect(output).toContain('ABCDEFGH')
})

test('toSSA handles graphics section', () => {
  const doc = createDocument()
  doc.graphics = [{
    name: 'logo.png',
    data: 'IMAGEDATA'
  }]

  const output = toSSA(doc)

  expect(output).toContain('[Graphics]')
  expect(output).toContain('filename: logo.png')
  expect(output).toContain('IMAGEDATA')
})

test('toSSA uses TertiaryColour instead of OutlineColour', () => {
  const doc = createDocument()
  const output = toSSA(doc)

  expect(output).toContain('TertiaryColour')
  expect(output).not.toContain('OutlineColour')
})
