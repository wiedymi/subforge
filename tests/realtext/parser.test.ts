import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseRealText } from '../../src/formats/xml/realtext/parser.ts'

const simpleRealText = `<window duration="00:00:30.00" wordwrap="true" bgcolor="black">
<time begin="00:00:01.00"/>
<clear/>First subtitle text
<time begin="00:00:05.00"/>
<clear/>Second subtitle text
</window>`

test('parseRealText parses basic file', () => {
  const doc = unwrap(parseRealText(simpleRealText))
  expect(doc.events).toHaveLength(2)
})

test('parseRealText parses first subtitle', () => {
  const doc = unwrap(parseRealText(simpleRealText))
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(5000)
  expect(doc.events[0]!.text).toBe('First subtitle text')
})

test('parseRealText parses second subtitle', () => {
  const doc = unwrap(parseRealText(simpleRealText))
  expect(doc.events[1]!.start).toBe(5000)
  expect(doc.events[1]!.text).toBe('Second subtitle text')
})

test('parseRealText handles formatting tags', () => {
  const rt = `<window duration="00:00:10.00">
<time begin="00:00:01.00"/>
<clear/><b>Bold</b> and <i>italic</i> text
</window>`

  const doc = unwrap(parseRealText(rt))
  expect(doc.events[0]!.text).toBe('<b>Bold</b> and <i>italic</i> text')
})

test('parseRealText handles font tags', () => {
  const rt = `<window duration="00:00:10.00">
<time begin="00:00:01.00"/>
<clear/><font color="red">Red text</font>
</window>`

  const doc = unwrap(parseRealText(rt))
  expect(doc.events[0]!.text).toContain('Red text')
})

test('parseRealText handles br tags', () => {
  const rt = `<window duration="00:00:10.00">
<time begin="00:00:01.00"/>
<clear/>Line one<br/>Line two
</window>`

  const doc = unwrap(parseRealText(rt))
  expect(doc.events[0]!.text).toBe('Line one\nLine two')
})

test('parseRealText handles center tags', () => {
  const rt = `<window duration="00:00:10.00">
<time begin="00:00:01.00"/>
<clear/><center>Centered text</center>
</window>`

  const doc = unwrap(parseRealText(rt))
  expect(doc.events[0]!.text).toBe('Centered text')
})

test('parseRealText handles BOM', () => {
  const rt = "\uFEFF" + simpleRealText
  const doc = unwrap(parseRealText(rt))
  expect(doc.events).toHaveLength(2)
})

test('parseRealText creates unique IDs', () => {
  const doc = unwrap(parseRealText(simpleRealText))
  expect(doc.events[0]!.id).not.toBe(doc.events[1]!.id)
})

test('parseRealText sets default style', () => {
  const doc = unwrap(parseRealText(simpleRealText))
  expect(doc.events[0]!.style).toBe('Default')
})

test('parseRealText collects errors for invalid XML', () => {
  const rt = `<notwindow>
<time begin="00:00:01.00"/>
</notwindow>`

  const result = parseRealText(rt, { onError: 'collect' })
  expect(result.ok).toBe(false)
  expect(result.errors.length).toBeGreaterThan(0)
})

test('parseRealText reports missing window element', () => {
  const rt = `<root>
<time begin="00:00:01.00"/>
</root>`

  const result = parseRealText(rt, { onError: 'collect' })
  expect(result.ok).toBe(false)
  expect(result.errors.length).toBeGreaterThan(0)
  expect(result.errors[0]!.message).toContain('window')
})

test('parseRealText trims whitespace', () => {
  const rt = `<window duration="00:00:10.00">
<time begin="00:00:01.00"/>
<clear/>   Text with spaces
</window>`

  const doc = unwrap(parseRealText(rt))
  expect(doc.events[0]!.text).toBe('Text with spaces')
})

test('parseRealText handles nested formatting', () => {
  const rt = `<window duration="00:00:10.00">
<time begin="00:00:01.00"/>
<clear/><b>Bold <i>and italic</i></b>
</window>`

  const doc = unwrap(parseRealText(rt))
  expect(doc.events[0]!.text).toBe('<b>Bold <i>and italic</i></b>')
})

test('parseRealText handles underline tags', () => {
  const rt = `<window duration="00:00:10.00">
<time begin="00:00:01.00"/>
<clear/><u>Underlined text</u>
</window>`

  const doc = unwrap(parseRealText(rt))
  expect(doc.events[0]!.text).toBe('<u>Underlined text</u>')
})
