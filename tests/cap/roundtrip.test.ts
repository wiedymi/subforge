import { test, expect } from 'bun:test'
import { parseCAP } from '../../src/formats/broadcast/cap/parser.ts'
import { toCAP } from '../../src/formats/broadcast/cap/serializer.ts'

const simpleCAP = `$CaptionMAX 2.0
$VideoStandard PAL
$CharacterSet ISO_8859_1

00:00:01:00	00:00:05:00
Hello world

00:00:06:00	00:00:10:00
Goodbye world`

test('roundtrip preserves basic structure', () => {
  const doc1 = parseCAP(simpleCAP)
  const cap = toCAP(doc1)
  const doc2 = parseCAP(cap)

  expect(doc2.events).toHaveLength(2)
  expect(doc2.events[0]!.text).toBe('Hello world')
  expect(doc2.events[1]!.text).toBe('Goodbye world')
})

test('roundtrip preserves timecodes', () => {
  const doc1 = parseCAP(simpleCAP)
  const cap = toCAP(doc1)
  const doc2 = parseCAP(cap)

  expect(doc2.events[0]!.start).toBe(doc1.events[0]!.start)
  expect(doc2.events[0]!.end).toBe(doc1.events[0]!.end)
  expect(doc2.events[1]!.start).toBe(doc1.events[1]!.start)
  expect(doc2.events[1]!.end).toBe(doc1.events[1]!.end)
})

test('roundtrip preserves multiline text', () => {
  const cap1 = `$VideoStandard PAL

00:00:01:00	00:00:05:00
Line one
Line two
Line three`

  const doc1 = parseCAP(cap1)
  const cap2 = toCAP(doc1)
  const doc2 = parseCAP(cap2)

  expect(doc2.events[0]!.text).toBe('Line one\nLine two\nLine three')
})

test('roundtrip with NTSC framerate', () => {
  const cap1 = `$VideoStandard NTSC

00:00:01:15	00:00:02:10
Test`

  const doc1 = parseCAP(cap1)
  const cap2 = toCAP(doc1, { fps: 29.97, videoStandard: 'NTSC' })
  const doc2 = parseCAP(cap2)

  // Should be within 1ms due to floating point
  expect(Math.abs(doc2.events[0]!.start - doc1.events[0]!.start)).toBeLessThan(1)
  expect(Math.abs(doc2.events[0]!.end - doc1.events[0]!.end)).toBeLessThan(1)
})

test('roundtrip handles large timecodes', () => {
  const cap1 = `$VideoStandard PAL

01:23:45:12	02:34:56:18
Long duration`

  const doc1 = parseCAP(cap1)
  const cap2 = toCAP(doc1)
  const doc2 = parseCAP(cap2)

  expect(doc2.events[0]!.start).toBe(doc1.events[0]!.start)
  expect(doc2.events[0]!.end).toBe(doc1.events[0]!.end)
})

test('roundtrip with multiple subtitles', () => {
  const cap1 = `$VideoStandard PAL

00:00:01:00	00:00:02:00
First

00:00:03:00	00:00:04:00
Second

00:00:05:00	00:00:06:00
Third`

  const doc1 = parseCAP(cap1)
  const cap2 = toCAP(doc1)
  const doc2 = parseCAP(cap2)

  expect(doc2.events).toHaveLength(3)
  expect(doc2.events[0]!.text).toBe('First')
  expect(doc2.events[1]!.text).toBe('Second')
  expect(doc2.events[2]!.text).toBe('Third')
})

test('roundtrip with zero start time', () => {
  const cap1 = `$VideoStandard PAL

00:00:00:00	00:00:01:00
Start from zero`

  const doc1 = parseCAP(cap1)
  const cap2 = toCAP(doc1)
  const doc2 = parseCAP(cap2)

  expect(doc2.events[0]!.start).toBe(0)
  expect(doc2.events[0]!.end).toBe(1000)
})
