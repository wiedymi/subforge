import { test, expect } from 'bun:test'
import { parseTags, serializeTags, stripTags } from '../../src/microdvd/index.ts'

test('parseTags - plain text', () => {
  const segments = parseTags('Plain text')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Plain text')
  expect(segments[0]!.style).toBeNull()
})

test('parseTags - bold', () => {
  const segments = parseTags('{y:b}Bold text')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Bold text')
  expect(segments[0]!.style?.bold).toBe(true)
})

test('parseTags - italic', () => {
  const segments = parseTags('{y:i}Italic text')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Italic text')
  expect(segments[0]!.style?.italic).toBe(true)
})

test('parseTags - underline', () => {
  const segments = parseTags('{y:u}Underlined text')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Underlined text')
  expect(segments[0]!.style?.underline).toBe(true)
})

test('parseTags - strikeout', () => {
  const segments = parseTags('{y:s}Strikeout text')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Strikeout text')
  expect(segments[0]!.style?.strikeout).toBe(true)
})

test('parseTags - multiple formatting', () => {
  const segments = parseTags('{y:bi}Bold and italic')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Bold and italic')
  expect(segments[0]!.style?.bold).toBe(true)
  expect(segments[0]!.style?.italic).toBe(true)
})

test('parseTags - color (uppercase C)', () => {
  const segments = parseTags('{C:$ff0000}Red text')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Red text')
  expect(segments[0]!.style?.primaryColor).toBe(0xff0000)
})

test('parseTags - color (lowercase c)', () => {
  const segments = parseTags('{c:$00ff00}Green text')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Green text')
  expect(segments[0]!.style?.primaryColor).toBe(0x00ff00)
})

test('parseTags - font name', () => {
  const segments = parseTags('{f:Arial}Arial font')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Arial font')
  expect(segments[0]!.style?.fontName).toBe('Arial')
})

test('parseTags - font size', () => {
  const segments = parseTags('{s:24}Large text')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Large text')
  expect(segments[0]!.style?.fontSize).toBe(24)
})

test('parseTags - mixed tags', () => {
  const segments = parseTags('Plain {y:b}bold {y:i}italic')
  expect(segments.length).toBe(3)
  expect(segments[0]!.text).toBe('Plain ')
  expect(segments[0]!.style).toBeNull()
  expect(segments[1]!.text).toBe('bold ')
  expect(segments[1]!.style?.bold).toBe(true)
  expect(segments[2]!.text).toBe('italic')
  expect(segments[2]!.style?.italic).toBe(true)
})

test('parseTags - incomplete tag ignored', () => {
  const segments = parseTags('Text {incomplete')
  expect(segments.length).toBe(1)
  expect(segments[0]!.text).toBe('Text {incomplete')
})

test('serializeTags - plain text', () => {
  const segments = [{ text: 'Plain text', style: null, effects: [] }]
  const output = serializeTags(segments)
  expect(output).toBe('Plain text')
})

test('serializeTags - bold', () => {
  const segments = [{ text: 'Bold text', style: { bold: true }, effects: [] }]
  const output = serializeTags(segments)
  expect(output).toBe('{y:b}Bold text')
})

test('serializeTags - italic', () => {
  const segments = [{ text: 'Italic text', style: { italic: true }, effects: [] }]
  const output = serializeTags(segments)
  expect(output).toBe('{y:i}Italic text')
})

test('serializeTags - multiple formatting', () => {
  const segments = [{ text: 'Bold and italic', style: { bold: true, italic: true }, effects: [] }]
  const output = serializeTags(segments)
  expect(output).toBe('{y:bi}Bold and italic')
})

test('serializeTags - color', () => {
  const segments = [{ text: 'Red text', style: { primaryColor: 0xff0000 }, effects: [] }]
  const output = serializeTags(segments)
  expect(output).toBe('{C:$ff0000}Red text')
})

test('serializeTags - font name', () => {
  const segments = [{ text: 'Arial font', style: { fontName: 'Arial' }, effects: [] }]
  const output = serializeTags(segments)
  expect(output).toBe('{f:Arial}Arial font')
})

test('serializeTags - font size', () => {
  const segments = [{ text: 'Large text', style: { fontSize: 24 }, effects: [] }]
  const output = serializeTags(segments)
  expect(output).toBe('{s:24}Large text')
})

test('serializeTags - all styles', () => {
  const segments = [{
    text: 'Styled text',
    style: {
      bold: true,
      italic: true,
      primaryColor: 0xff0000,
      fontName: 'Arial',
      fontSize: 24
    },
    effects: []
  }]
  const output = serializeTags(segments)
  expect(output).toContain('{y:bi}')
  expect(output).toContain('{C:$ff0000}')
  expect(output).toContain('{f:Arial}')
  expect(output).toContain('{s:24}')
  expect(output).toContain('Styled text')
})

test('serializeTags - multiple segments', () => {
  const segments = [
    { text: 'Plain ', style: null, effects: [] },
    { text: 'bold ', style: { bold: true }, effects: [] },
    { text: 'italic', style: { italic: true }, effects: [] }
  ]
  const output = serializeTags(segments)
  expect(output).toBe('Plain {y:b}bold {y:i}italic')
})

test('stripTags - removes all tags', () => {
  const text = '{y:b}Bold {C:$ff0000}red {f:Arial}text'
  const stripped = stripTags(text)
  expect(stripped).toBe('Bold red text')
})

test('stripTags - plain text unchanged', () => {
  const text = 'Plain text'
  const stripped = stripTags(text)
  expect(stripped).toBe('Plain text')
})
