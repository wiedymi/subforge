import { test, expect } from 'bun:test'
import { parseASS } from '../../src/ass/parser.ts'
import { toASS } from '../../src/ass/serializer.ts'
import { createDocument, createEvent, createDefaultStyle } from '../../src/core/document.ts'

test('toASS serializes basic document', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Hello world'))

  const output = toASS(doc)

  expect(output).toContain('[Script Info]')
  expect(output).toContain('[V4+ Styles]')
  expect(output).toContain('[Events]')
  expect(output).toContain('Hello world')
})

test('toASS serializes script info', () => {
  const doc = createDocument({ info: { title: 'Test Title', playResX: 1280, playResY: 720, scaleBorderAndShadow: true, wrapStyle: 0 } })

  const output = toASS(doc)

  expect(output).toContain('Title: Test Title')
  expect(output).toContain('PlayResX: 1280')
  expect(output).toContain('PlayResY: 720')
})

test('toASS serializes styles', () => {
  const doc = createDocument()
  const style = createDefaultStyle()
  style.name = 'Sign'
  style.fontName = 'Impact'
  style.fontSize = 60
  doc.styles.set('Sign', style)

  const output = toASS(doc)

  expect(output).toContain('Style: Sign,Impact,60')
})

test('toASS serializes dialogue events', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Hello', { layer: 1, style: 'Sign', actor: 'Alice' }))

  const output = toASS(doc)

  expect(output).toContain('Dialogue: 1,0:00:01.00,0:00:05.00,Sign,Alice')
})

test('toASS roundtrip preserves content', () => {
  const original = `[Script Info]
Title: Test
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello world`

  const doc = parseASS(original)
  const output = toASS(doc)
  const reparsed = parseASS(output)

  expect(reparsed.events.length).toBe(doc.events.length)
  expect(reparsed.events[0]!.text).toBe(doc.events[0]!.text)
  expect(reparsed.events[0]!.start).toBe(doc.events[0]!.start)
  expect(reparsed.events[0]!.end).toBe(doc.events[0]!.end)
})

test('toASS serializes comments', () => {
  const doc = createDocument()
  doc.comments.push({ text: 'This is a comment', beforeEventIndex: 0 })
  doc.events.push(createEvent(1000, 5000, 'Hello'))

  const output = toASS(doc)

  expect(output).toContain('Comment:')
  expect(output).toContain('This is a comment')
})

test('toASS serializes dirty events with segments', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.dirty = true
  event.segments = [
    { text: 'bold', style: { bold: true }, effects: [] },
    { text: ' normal', style: { bold: false }, effects: [] }
  ]
  doc.events.push(event)

  const output = toASS(doc)

  expect(output).toContain('\\b1')
  expect(output).toContain('bold')
})

// Coverage: fonts section (lines 52-64)
test('toASS serializes fonts section', () => {
  const doc = createDocument()
  doc.fonts = [
    { name: 'TestFont.ttf', data: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODk=' },
    { name: 'AnotherFont.otf', data: 'QUJD' }
  ]
  doc.events.push(createEvent(1000, 5000, 'Hello'))

  const output = toASS(doc)

  expect(output).toContain('[Fonts]')
  expect(output).toContain('fontname: TestFont.ttf')
  expect(output).toContain('fontname: AnotherFont.otf')
})

// Coverage: graphics section (lines 68-80)
test('toASS serializes graphics section', () => {
  const doc = createDocument()
  doc.graphics = [
    { name: 'image.png', data: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODk=' },
    { name: 'logo.jpg', data: 'QUJD' }
  ]
  doc.events.push(createEvent(1000, 5000, 'Hello'))

  const output = toASS(doc)

  expect(output).toContain('[Graphics]')
  expect(output).toContain('filename: image.png')
  expect(output).toContain('filename: logo.jpg')
})

// Coverage: author field (line 9)
test('toASS serializes author field', () => {
  const doc = createDocument({ info: { author: 'Test Author', playResX: 1920, playResY: 1080, scaleBorderAndShadow: true, wrapStyle: 0 } })
  doc.events.push(createEvent(1000, 5000, 'Hello'))

  const output = toASS(doc)

  expect(output).toContain('Original Author: Test Author')
})
