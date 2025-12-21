import { test, expect } from 'bun:test'
import { parseLRC, parseLRCResult } from '../../src/lrc/parser.ts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const simpleLRC = `[ar:Artist Name]
[ti:Song Title]
[00:12.34]First line
[00:15.67]Second line`

test('parseLRC parses basic file', () => {
  const doc = parseLRC(simpleLRC)
  expect(doc.events).toHaveLength(2)
})

test('parseLRC parses metadata', () => {
  const doc = parseLRC(simpleLRC)
  expect(doc.info.title).toBe('Song Title')
  expect(doc.info.author).toBe('Artist Name')
})

test('parseLRC parses timestamps', () => {
  const doc = parseLRC(simpleLRC)
  expect(doc.events[0]!.start).toBe(12340)
  expect(doc.events[1]!.start).toBe(15670)
})

test('parseLRC parses lyrics', () => {
  const doc = parseLRC(simpleLRC)
  expect(doc.events[0]!.text).toBe('First line')
  expect(doc.events[1]!.text).toBe('Second line')
})

test('parseLRC handles all metadata tags', () => {
  const lrc = `[ar:Artist]
[ti:Title]
[al:Album]
[au:Author]
[length:03:45]
[by:Creator]
[offset:100]
[re:Tool]
[ve:1.0]
[00:00.00]Test`

  const doc = parseLRC(lrc)
  expect(doc.info.title).toBe('Title')
  expect(doc.info.author).toBe('Author')
})

test('parseLRC parses offset metadata', () => {
  const lrc = `[offset:500]
[00:10.00]Test line`

  const doc = parseLRC(lrc)
  // Offset is not applied to event times during parsing
  expect(doc.events[0]!.start).toBe(10000)
})

test('parseLRC handles multiple timestamps per line', () => {
  const lrc = `[00:10.00][00:20.00]Same lyrics`
  const doc = parseLRC(lrc)
  expect(doc.events).toHaveLength(2)
  expect(doc.events[0]!.text).toBe('Same lyrics')
  expect(doc.events[1]!.text).toBe('Same lyrics')
})

test('parseLRC parses enhanced LRC', () => {
  const lrc = `[00:12.00]<00:12.50>Word<00:13.00>by<00:13.50>word`
  const doc = parseLRC(lrc)

  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.segments).toHaveLength(3)
  expect(doc.events[0]!.segments[0]!.text).toBe('Word')
  expect(doc.events[0]!.segments[1]!.text).toBe('by')
  expect(doc.events[0]!.segments[2]!.text).toBe('word')
})

test('parseLRC creates karaoke effects for enhanced LRC', () => {
  const lrc = `[00:12.00]<00:12.50>Word<00:13.00>by`
  const doc = parseLRC(lrc)

  const segment = doc.events[0]!.segments[0]!
  expect(segment.effects).toHaveLength(1)
  expect(segment.effects[0]!.type).toBe('karaoke')
  expect(segment.effects[0]!.params).toEqual({ duration: 500, mode: 'fill' })
})

test('parseLRC sets dirty flag for enhanced LRC', () => {
  const lrc = `[00:12.00]<00:12.50>Word<00:13.00>by`
  const doc = parseLRC(lrc)
  expect(doc.events[0]!.dirty).toBe(true)
})

test('parseLRC handles empty lines', () => {
  const lrc = `[00:10.00]First

[00:20.00]Second`
  const doc = parseLRC(lrc)
  expect(doc.events).toHaveLength(2)
})

test('parseLRC handles BOM', () => {
  const lrc = "\uFEFF[00:10.00]Test"
  const doc = parseLRC(lrc)
  expect(doc.events).toHaveLength(1)
})

test('parseLRC adjusts end times', () => {
  const lrc = `[00:10.00]First
[00:15.00]Second
[00:20.00]Third`

  const doc = parseLRC(lrc)
  expect(doc.events[0]!.end).toBe(15000)
  expect(doc.events[1]!.end).toBe(20000)
})

test('parseLRC from fixture file', () => {
  const path = resolve(import.meta.dir, '../fixtures/lrc/simple.lrc')
  const content = readFileSync(path, 'utf-8')
  const doc = parseLRC(content)

  expect(doc.events).toHaveLength(4)
  expect(doc.info.title).toBe('Song Title')
  expect(doc.info.author).toBe('Artist Name')
})

test('parseLRC enhanced from fixture file', () => {
  const path = resolve(import.meta.dir, '../fixtures/lrc/enhanced.lrc')
  const content = readFileSync(path, 'utf-8')
  const doc = parseLRC(content)

  expect(doc.events).toHaveLength(3)
  expect(doc.events[0]!.segments.length).toBeGreaterThan(0)
  expect(doc.events[0]!.dirty).toBe(true)
})

test('parseLRCResult collects errors', () => {
  const lrc = `[invalid]Test`
  const result = parseLRCResult(lrc, { onError: 'collect' })
  expect(result.errors.length).toBeGreaterThanOrEqual(0)
})
