import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseASS } from '../../src/formats/text/ass/parser.ts'

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
  const doc = unwrap(parseASS(simpleASS))
  expect(doc.info.title).toBe('Test')
  expect(doc.info.playResX).toBe(1920)
  expect(doc.info.playResY).toBe(1080)
})

test('parseASS parses styles', () => {
  const doc = unwrap(parseASS(simpleASS))
  expect(doc.styles.has('Default')).toBe(true)
  const style = doc.styles.get('Default')!
  expect(style.fontName).toBe('Arial')
  expect(style.fontSize).toBe(48)
})

test('parseASS parses dialogue', () => {
  const doc = unwrap(parseASS(simpleASS))
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

  const doc = unwrap(parseASS(ass))
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

  const doc = unwrap(parseASS(ass))
  expect(doc.comments).toHaveLength(1)
  expect(doc.comments[0]!.text).toBe('This is a comment')
})

test('parseASS parses actor field', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,Alice,0,0,0,,Hello`

  const doc = unwrap(parseASS(ass))
  expect(doc.events[0]!.actor).toBe('Alice')
})

test('parseASS parses margins', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,10,20,30,,Hello`

  const doc = unwrap(parseASS(ass))
  expect(doc.events[0]!.marginL).toBe(10)
  expect(doc.events[0]!.marginR).toBe(20)
  expect(doc.events[0]!.marginV).toBe(30)
})

test('parseASS parses effect field', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,Scroll up;100;200;,Hello`

  const doc = unwrap(parseASS(ass))
  expect(doc.events[0]!.effect).toBe('Scroll up;100;200;')
})

test('parseASS preserves text with commas', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello, world, how are you?`

  const doc = unwrap(parseASS(ass))
  expect(doc.events[0]!.text).toBe('Hello, world, how are you?')
})

test('parseASS parses style colors', () => {
  const ass = `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Test,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1`

  const doc = unwrap(parseASS(ass))
  const style = doc.styles.get('Test')!
  expect(style.primaryColor).toBe(0x00FFFFFF)
  expect(style.secondaryColor).toBe(0x000000FF)
  expect(style.backColor).toBe(0x80000000)
})

test('parseASS parses style flags', () => {
  const ass = `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Test,Arial,48,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,-1,-1,0,0,100,100,0,0,1,2,2,2,10,10,10,1`

  const doc = unwrap(parseASS(ass))
  const style = doc.styles.get('Test')!
  expect(style.bold).toBe(true)
  expect(style.italic).toBe(true)
  expect(style.underline).toBe(false)
})

test('parseASS collects errors', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,invalid,0:00:05.00,Default,,0,0,0,,Hello`

  const result = parseASS(ass, { onError: 'collect' })
  expect(result.ok).toBe(false)
  expect(result.errors.length).toBeGreaterThan(0)
  expect(result.errors[0]!.code).toBe('INVALID_TIMESTAMP')
})

test('parseASS with ScaledBorderAndShadow', () => {
  const ass = `[Script Info]
ScaledBorderAndShadow: yes`

  const doc = unwrap(parseASS(ass))
  expect(doc.info.scaleBorderAndShadow).toBe(true)
})

test('parseASS with WrapStyle', () => {
  const ass = `[Script Info]
WrapStyle: 2`

  const doc = unwrap(parseASS(ass))
  expect(doc.info.wrapStyle).toBe(2)
})

// Coverage: parseDialogueLine slow path with non-standard format (lines 311-366)
test('parseASS with non-standard format order', () => {
  const ass = `[Events]
Format: Text, Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect
Dialogue: Hello world,0,0:00:01.00,0:00:05.00,Default,Actor,10,20,30,Effect`

  const doc = unwrap(parseASS(ass))
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.text).toBe('Hello world')
  expect(doc.events[0]!.actor).toBe('Actor')
  expect(doc.events[0]!.effect).toBe('Effect')
})

// Coverage: parseFonts (lines 468-486)
test('parseASS with fonts section', () => {
  const ass = `[Fonts]
fontname: TestFont.ttf
QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5
ejAxMjM0NTY3ODk=
fontname: AnotherFont.ttf
QUJD

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello`

  const doc = unwrap(parseASS(ass))
  expect(doc.fonts).toHaveLength(2)
  expect(doc.fonts![0]!.name).toBe('TestFont.ttf')
  expect(doc.fonts![1]!.name).toBe('AnotherFont.ttf')
})

// Coverage: parseGraphics (lines 490-508)
test('parseASS with graphics section', () => {
  const ass = `[Graphics]
filename: image.png
QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5
ejAxMjM0NTY3ODk=
filename: logo.jpg
QUJD

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello`

  const doc = unwrap(parseASS(ass))
  expect(doc.graphics).toHaveLength(2)
  expect(doc.graphics![0]!.name).toBe('image.png')
  expect(doc.graphics![1]!.name).toBe('logo.jpg')
})

// Coverage: parseTimeInline with 3-digit fraction (line 568)
test('parseASS with 3-digit fraction time', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.123,0:00:05.456,Default,,0,0,0,,Hello`

  const doc = unwrap(parseASS(ass))
  expect(doc.events[0]!.start).toBe(1123)
  expect(doc.events[0]!.end).toBe(5456)
})

// Coverage: V4 Styles section (line 110)
test('parseASS with V4 Styles (legacy)', () => {
  const ass = `[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1`

  const doc = unwrap(parseASS(ass))
  expect(doc.styles.has('Default')).toBe(true)
})

// Coverage: unknown section (line 123)
test('parseASS with unknown section', () => {
  const ass = `[Unknown Section]
SomeKey: SomeValue

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello`

  const doc = unwrap(parseASS(ass))
  expect(doc.events).toHaveLength(1)
})

// Coverage: Original Script vs Original Author (line 154)
test('parseASS with Original Script', () => {
  const ass = `[Script Info]
Original Script: Test Author`

  const doc = unwrap(parseASS(ass))
  expect(doc.info.author).toBe('Test Author')
})

// Coverage: CRLF line endings (line 47)
test('parseASS with CRLF line endings', () => {
  const ass = `[Events]\r\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\r\nDialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello`

  const doc = unwrap(parseASS(ass))
  expect(doc.events).toHaveLength(1)
})

// Coverage: strikethrough style field (line 224)
test('parseASS with style strikethrough', () => {
  const ass = `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Test,Arial,48,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,0,0,-1,-1,100,100,0,0,1,2,2,2,10,10,10,1`

  const doc = unwrap(parseASS(ass))
  const style = doc.styles.get('Test')!
  expect(style.underline).toBe(true)
  expect(style.strikeout).toBe(true)
})

// Coverage: borderStyle 3 (line 229)
test('parseASS with borderStyle 3', () => {
  const ass = `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Test,Arial,48,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,0,0,0,0,100,100,0,0,3,2,2,2,10,10,10,1`

  const doc = unwrap(parseASS(ass))
  const style = doc.styles.get('Test')!
  expect(style.borderStyle).toBe(3)
})

// Coverage: empty/comment lines in sections (line 141, 181)
test('parseASS with comments and empty lines in sections', () => {
  const ass = `[Script Info]
; This is a comment
Title: Test

[V4+ Styles]
; Style comment
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding

Style: Default,Arial,48,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1`

  const doc = unwrap(parseASS(ass))
  expect(doc.info.title).toBe('Test')
  expect(doc.styles.has('Default')).toBe(true)
})

// Coverage: line without colon in script info (line 144)
test('parseASS with malformed script info line', () => {
  const ass = `[Script Info]
Title: Test
InvalidLineWithoutColon
PlayResX: 1920`

  const doc = unwrap(parseASS(ass))
  expect(doc.info.title).toBe('Test')
  expect(doc.info.playResX).toBe(1920)
})

// Coverage: invalid end time (line 412-413)
test('parseASS with invalid end time', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,invalid,Default,,0,0,0,,Hello`

  const result = parseASS(ass, { onError: 'collect' })
  expect(result.ok).toBe(false)
  expect(result.errors.some(e => e.code === 'INVALID_TIMESTAMP')).toBe(true)
})

// Coverage: fewer values than format (line 520-522)
test('parseASS with fewer values than format', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default`

  const doc = unwrap(parseASS(ass))
  expect(doc.events).toHaveLength(1)
})

// Coverage: unreadLine when section follows events (line 54-55, 265)
test('parseASS section after events triggers unreadLine', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello
[Fonts]
fontname: TestFont.ttf
QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5`

  const doc = unwrap(parseASS(ass))
  expect(doc.events).toHaveLength(1)
  expect(doc.fonts).toHaveLength(1)
})
