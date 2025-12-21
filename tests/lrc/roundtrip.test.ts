import { test, expect } from 'bun:test'
import { parseLRC } from '../../src/lrc/parser.ts'
import { toLRC } from '../../src/lrc/serializer.ts'

test('roundtrip simple LRC', () => {
  const original = `[ar:Artist Name]
[ti:Song Title]
[00:12.34]First line
[00:15.67]Second line
[00:18.00]Third line`

  const doc = parseLRC(original)
  const serialized = toLRC(doc)

  expect(serialized).toContain('[ti:Song Title]')
  expect(serialized).toContain('[ar:Artist Name]')
  expect(serialized).toContain('[00:12.34]First line')
  expect(serialized).toContain('[00:15.67]Second line')
  expect(serialized).toContain('[00:18.00]Third line')
})

test('roundtrip enhanced LRC', () => {
  const original = `[00:12.00]<00:12.50>Word<00:13.00>by<00:13.50>word`

  const doc = parseLRC(original)
  const serialized = toLRC(doc, { includeMetadata: false })

  expect(serialized).toContain('[00:12.00]')
  expect(serialized).toContain('Word')
  expect(serialized).toContain('by')
  expect(serialized).toContain('word')
})

test('roundtrip preserves timing', () => {
  const original = `[00:12.34]Test line`

  const doc = parseLRC(original)
  expect(doc.events[0]!.start).toBe(12340)

  const serialized = toLRC(doc, { includeMetadata: false })
  const doc2 = parseLRC(serialized)
  expect(doc2.events[0]!.start).toBe(12340)
})

test('roundtrip with offset', () => {
  const original = `[offset:500]
[00:10.00]Test`

  const doc = parseLRC(original)
  const serialized = toLRC(doc, { offset: 500 })

  expect(serialized).toContain('[offset:500]')
  // With offset 500, the time shifts by 500ms
  expect(serialized).toContain('[00:10.50]')
})

test('roundtrip preserves karaoke effects', () => {
  const original = `[00:12.00]<00:12.50>One<00:13.00>Two`

  const doc = parseLRC(original)
  expect(doc.events[0]!.segments).toHaveLength(2)
  expect(doc.events[0]!.segments[0]!.effects[0]!.type).toBe('karaoke')

  const serialized = toLRC(doc, { includeMetadata: false })
  const doc2 = parseLRC(serialized)

  expect(doc2.events[0]!.segments).toHaveLength(2)
  expect(doc2.events[0]!.segments[0]!.effects[0]!.type).toBe('karaoke')
})
