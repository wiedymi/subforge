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
