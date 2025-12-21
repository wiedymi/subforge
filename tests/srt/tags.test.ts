import { test, expect } from 'bun:test'
import { parseTags, serializeTags, stripTags } from '../../src/srt/tags.ts'

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

test('parseTags strikethrough', () => {
  const segments = parseTags('<s>strike</s>')
  expect(segments[0]!.style?.strikeout).toBe(true)
})

test('parseTags font color', () => {
  const segments = parseTags('<font color="#FF0000">red</font>')
  expect(segments[0]!.style?.primaryColor).toBeDefined()
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

test('stripTags preserves plain text', () => {
  expect(stripTags('Hello World')).toBe('Hello World')
})

test('stripTags handles font tags', () => {
  expect(stripTags('<font color="red">text</font>')).toBe('text')
})

// Additional SRT tag tests
test('parseTags font with hex color', () => {
  const segments = parseTags('<font color="#00FF00">green</font>')
  expect(segments[0]!.style?.primaryColor).toBeDefined()
})

test('parseTags font with named color', () => {
  const segments = parseTags('<font color="red">red</font>')
  expect(segments[0]!.text).toBe('red')
})

test('parseTags deeply nested', () => {
  const segments = parseTags('<b><i><u>all styles</u></i></b>')
  expect(segments[0]!.style?.bold).toBe(true)
  expect(segments[0]!.style?.italic).toBe(true)
  expect(segments[0]!.style?.underline).toBe(true)
})

test('parseTags multiple segments', () => {
  const segments = parseTags('normal <b>bold</b> <i>italic</i> normal')
  expect(segments.length).toBeGreaterThan(1)
})

test('parseTags empty tags', () => {
  const segments = parseTags('<b></b>text')
  expect(segments.some(s => s.text === 'text')).toBe(true)
})

test('parseTags unclosed tag', () => {
  const segments = parseTags('<b>unclosed')
  expect(segments[0]!.text).toBe('unclosed')
})

test('parseTags adjacent tags', () => {
  const segments = parseTags('<b>bold</b><i>italic</i>')
  expect(segments[0]!.style?.bold).toBe(true)
  expect(segments[1]!.style?.italic).toBe(true)
})

test('serializeTags underline', () => {
  const segments = [{ text: 'underlined', style: { underline: true }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toBe('<u>underlined</u>')
})

test('serializeTags strikethrough', () => {
  const segments = [{ text: 'struck', style: { strikeout: true }, effects: [] }]
  const result = serializeTags(segments)
  expect(result).toBe('<s>struck</s>')
})

test('serializeTags combined styles', () => {
  const segments = [{
    text: 'styled',
    style: { bold: true, italic: true, underline: true },
    effects: []
  }]
  const result = serializeTags(segments)
  expect(result).toContain('<b>')
  expect(result).toContain('<i>')
  expect(result).toContain('<u>')
})

test('serializeTags with color', () => {
  const segments = [{
    text: 'colored',
    style: { primaryColor: 0xFF0000 },
    effects: []
  }]
  const result = serializeTags(segments)
  expect(result).toContain('<font')
})

test('stripTags complex nested', () => {
  expect(stripTags('<b><i><u><s>text</s></u></i></b>')).toBe('text')
})

test('stripTags preserves whitespace', () => {
  expect(stripTags('<b>hello</b> <i>world</i>')).toBe('hello world')
})

// Coverage: unclosed angle bracket (lines 22-23)
test('parseTags unclosed angle bracket', () => {
  const segments = parseTags('text<b')
  expect(segments[0]!.text).toBe('text<b')
})

// Coverage: font tag without color attribute (line 87-88)
test('parseTags font tag without color', () => {
  const segments = parseTags('<font>text</font>')
  expect(segments[0]!.text).toBe('text')
})

// Coverage: font tag with invalid color format (line 87)
test('parseTags font tag with name-only color', () => {
  const segments = parseTags('<font color="blue">text</font>')
  expect(segments[0]!.text).toBe('text')
  // color doesn't match hex pattern, so should not have color
})

// Coverage: closing font tag (line 90-91)
test('parseTags font close tag pops stack', () => {
  const segments = parseTags('<font color="#FF0000">red</font> normal')
  expect(segments.length).toBeGreaterThan(1)
  expect(segments[1]!.text).toBe(' normal')
  expect(segments[1]!.style).toBeNull()
})
