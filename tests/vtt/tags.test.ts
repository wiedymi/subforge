import { test, expect } from 'bun:test'
import { parseTags, serializeTags, stripTags } from '../../src/formats/text/vtt/tags.ts'

test('parseTags plain text', () => {
  const segments = parseTags('Hello World')
  expect(segments).toHaveLength(1)
  expect(segments[0]!.text).toBe('Hello World')
  expect(segments[0]!.style).toBeNull()
})

test('parseTags bold', () => {
  const segments = parseTags('<b>bold</b> normal')
  expect(segments).toHaveLength(2)
  expect(segments[0]!.text).toBe('bold')
  expect(segments[0]!.style?.bold).toBe(true)
  expect(segments[1]!.text).toBe(' normal')
})

test('parseTags italic', () => {
  const segments = parseTags('<i>italic</i>')
  expect(segments[0]!.style?.italic).toBe(true)
})

test('parseTags underline', () => {
  const segments = parseTags('<u>underline</u>')
  expect(segments[0]!.style?.underline).toBe(true)
})

test('parseTags voice tag', () => {
  const segments = parseTags('<v Alice>Hello</v>')
  expect(segments[0]!.text).toBe('Hello')
})

test('parseTags class tag', () => {
  const segments = parseTags('<c.yellow>text</c>')
  expect(segments[0]!.text).toBe('text')
})

test('parseTags nested tags', () => {
  const segments = parseTags('<b><i>bold italic</i></b>')
  expect(segments[0]!.style?.bold).toBe(true)
  expect(segments[0]!.style?.italic).toBe(true)
})

test('serializeTags bold', () => {
  const segments = [{ text: 'bold', style: { bold: true }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toBe('<b>bold</b>')
})

test('serializeTags italic', () => {
  const segments = [{ text: 'italic', style: { italic: true }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toBe('<i>italic</i>')
})

test('serializeTags mixed', () => {
  const segments = [
    { text: 'bold', style: { bold: true }, effects: [] },
    { text: ' normal', style: null, effects: [] }
  ]
  const result = serializeTags(segments)
  expect(result).toBe('<b>bold</b> normal')
})

test('stripTags removes all tags', () => {
  expect(stripTags('<b>Hello</b> <i>World</i>')).toBe('Hello World')
})

test('stripTags removes voice tags', () => {
  expect(stripTags('<v Alice>Hello</v>')).toBe('Hello')
})

test('stripTags preserves plain text', () => {
  expect(stripTags('Hello World')).toBe('Hello World')
})

// Additional VTT tag tests
test('parseTags lang tag', () => {
  const segments = parseTags('<lang en>English</lang>')
  expect(segments[0]!.text).toBe('English')
})

test('parseTags ruby annotation', () => {
  const segments = parseTags('<ruby>漢字<rt>かんじ</rt></ruby>')
  expect(segments.some(s => s.text.includes('漢字'))).toBe(true)
})

test('parseTags timestamp tag', () => {
  const segments = parseTags('Hello <00:00:01.000>world')
  expect(segments.some(s => s.text === 'world')).toBe(true)
})

test('parseTags deeply nested', () => {
  const segments = parseTags('<b><i><u>styled</u></i></b>')
  expect(segments[0]!.style?.bold).toBe(true)
  expect(segments[0]!.style?.italic).toBe(true)
  expect(segments[0]!.style?.underline).toBe(true)
})

test('parseTags multiple classes', () => {
  const segments = parseTags('<c.yellow.bg_blue>text</c>')
  expect(segments[0]!.text).toBe('text')
})

test('parseTags voice with annotation', () => {
  const segments = parseTags('<v Bob Smith>dialogue</v>')
  expect(segments[0]!.text).toBe('dialogue')
})

test('parseTags adjacent tags', () => {
  const segments = parseTags('<b>bold</b><i>italic</i>')
  expect(segments[0]!.style?.bold).toBe(true)
  expect(segments[1]!.style?.italic).toBe(true)
})

test('parseTags unclosed tag', () => {
  const segments = parseTags('<b>unclosed')
  expect(segments[0]!.text).toBe('unclosed')
})

test('serializeTags underline', () => {
  const segments = [{ text: 'underlined', style: { underline: true }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toBe('<u>underlined</u>')
})

test('serializeTags combined styles', () => {
  const segments = [{
    text: 'styled',
    style: { bold: true, italic: true },
    effects: []
  }]
  const result = serializeTags(segments)
  expect(result).toContain('<b>')
  expect(result).toContain('<i>')
})

test('serializeTags multiple segments', () => {
  const segments = [
    { text: 'normal ', style: null, effects: [] },
    { text: 'bold', style: { bold: true }, effects: [] },
    { text: ' normal', style: null, effects: [] }
  ]
  const result = serializeTags(segments)
  expect(result).toBe('normal <b>bold</b> normal')
})

test('stripTags removes class tags', () => {
  expect(stripTags('<c.red.bg_white>text</c>')).toBe('text')
})

test('stripTags removes lang tags', () => {
  expect(stripTags('<lang ja>日本語</lang>')).toBe('日本語')
})

test('stripTags removes timestamp tags', () => {
  expect(stripTags('hello <00:00:05.000>world')).toBe('hello world')
})

test('stripTags preserves whitespace', () => {
  expect(stripTags('<b>hello</b> <i>world</i>')).toBe('hello world')
})

// Coverage: unclosed angle bracket (lines 20-21)
test('parseTags unclosed angle bracket', () => {
  const segments = parseTags('text<b')
  expect(segments[0]!.text).toBe('text<b')
})

// Coverage: /lang closing tag (lines 83-84)
test('parseTags lang close tag pops stack', () => {
  const segments = parseTags('<lang en>English</lang> normal')
  expect(segments.length).toBeGreaterThan(1)
  expect(segments[1]!.text).toBe(' normal')
})

// Coverage: /c closing tag (lines 79-80)
test('parseTags class close tag pops stack', () => {
  const segments = parseTags('<c.red>colored</c> normal')
  expect(segments.length).toBeGreaterThan(1)
  expect(segments[1]!.text).toBe(' normal')
})

// Coverage: /v closing tag (lines 75-76)
test('parseTags voice close tag pops stack', () => {
  const segments = parseTags('<v Alice>dialogue</v> normal')
  expect(segments.length).toBeGreaterThan(1)
  expect(segments[1]!.text).toBe(' normal')
})

// Coverage: v. notation (line 73)
test('parseTags voice with dot notation', () => {
  const segments = parseTags('<v.Alice>dialogue</v>')
  expect(segments[0]!.text).toBe('dialogue')
})

// Coverage: serialization underline (lines 117-119)
test('serializeTags underline', () => {
  const segments = [{ text: 'underlined', style: { underline: true }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toBe('<u>underlined</u>')
})
