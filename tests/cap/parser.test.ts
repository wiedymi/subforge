import { test, expect } from 'bun:test'
import { parseCAP, parseCAPResult } from '../../src/formats/broadcast/cap/parser.ts'

const simpleCAP = `$CaptionMAX 2.0
$VideoStandard PAL
$CharacterSet ISO_8859_1

00:00:01:00	00:00:05:00
Hello world

00:00:06:00	00:00:10:00
Goodbye world`

test('parseCAP parses basic file', () => {
  const doc = parseCAP(simpleCAP)
  expect(doc.events).toHaveLength(2)
})

test('parseCAP parses first subtitle', () => {
  const doc = parseCAP(simpleCAP)
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(5000)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseCAP parses second subtitle', () => {
  const doc = parseCAP(simpleCAP)
  expect(doc.events[1]!.start).toBe(6000)
  expect(doc.events[1]!.end).toBe(10000)
  expect(doc.events[1]!.text).toBe('Goodbye world')
})

test('parseCAP handles PAL framerate (25fps)', () => {
  const cap = `$VideoStandard PAL

00:00:01:12	00:00:02:00
Test`
  const doc = parseCAP(cap)
  // 1 second + 12 frames at 25fps = 1000 + (12/25)*1000 = 1480ms
  expect(doc.events[0]!.start).toBe(1480)
  // 2 seconds exactly
  expect(doc.events[0]!.end).toBe(2000)
})

test('parseCAP handles NTSC framerate (29.97fps)', () => {
  const cap = `$VideoStandard NTSC

00:00:01:15	00:00:02:00
Test`
  const doc = parseCAP(cap)
  // 1 second + 15 frames at 29.97fps = 1000 + (15/29.97)*1000 ≈ 1500.5ms
  expect(Math.round(doc.events[0]!.start)).toBe(1501)
  // 2 seconds exactly
  expect(doc.events[0]!.end).toBe(2000)
})

test('parseCAP handles multiline text', () => {
  const cap = `$VideoStandard PAL

00:00:01:00	00:00:05:00
Line one
Line two`

  const doc = parseCAP(cap)
  expect(doc.events[0]!.text).toBe('Line one\nLine two')
})

test('parseCAP handles empty lines between subtitles', () => {
  const cap = `$VideoStandard PAL

00:00:01:00	00:00:05:00
First


00:00:06:00	00:00:10:00
Second`

  const doc = parseCAP(cap)
  expect(doc.events).toHaveLength(2)
})

test('parseCAP handles Windows line endings', () => {
  const cap = "$VideoStandard PAL\r\n\r\n00:00:01:00\t00:00:05:00\r\nHello world\r\n"
  const doc = parseCAP(cap)
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseCAP creates unique IDs', () => {
  const doc = parseCAP(simpleCAP)
  expect(doc.events[0]!.id).not.toBe(doc.events[1]!.id)
})

test('parseCAP sets default style', () => {
  const doc = parseCAP(simpleCAP)
  expect(doc.events[0]!.style).toBe('Default')
})

test('parseCAPResult collects errors', () => {
  const cap = `$VideoStandard PAL

invalid:00:05:00
Hello`

  const result = parseCAPResult(cap, { onError: 'collect' })
  expect(result.errors.length).toBeGreaterThan(0)
})

test('parseCAP handles BOM', () => {
  const cap = "\uFEFF$VideoStandard PAL\n\n00:00:01:00\t00:00:05:00\nHello"
  const doc = parseCAP(cap)
  expect(doc.events).toHaveLength(1)
})

test('parseCAP handles trailing whitespace', () => {
  const cap = `$VideoStandard PAL

00:00:01:00	00:00:05:00
Hello world   `

  const doc = parseCAP(cap)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseCAP defaults to PAL when no video standard specified', () => {
  const cap = `00:00:01:12	00:00:02:00
Test`
  const doc = parseCAP(cap)
  // Should use PAL default (25fps)
  expect(doc.events[0]!.start).toBe(1480)
})

test('parseCAP rejects missing tab separator', () => {
  const cap = `$VideoStandard PAL

00:00:01:00 00:00:05:00
Hello`

  expect(() => parseCAP(cap)).toThrow()
})

test('parseCAP handles no trailing newline', () => {
  const cap = `$VideoStandard PAL

00:00:01:00	00:00:05:00
Hello world`

  const doc = parseCAP(cap)
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseCAP handles multiple header fields', () => {
  const cap = `$CaptionMAX 2.0
$VideoStandard PAL
$CharacterSet UTF-8
$Font Arial
$Color White

00:00:01:00	00:00:05:00
Test`

  const doc = parseCAP(cap)
  expect(doc.events).toHaveLength(1)
})

test('parseCAP handles timecodes with large values', () => {
  const cap = `$VideoStandard PAL

01:23:45:12	02:34:56:18
Long duration`

  const doc = parseCAP(cap)
  // 1:23:45:12 = 1*3600000 + 23*60000 + 45*1000 + (12/25)*1000
  expect(doc.events[0]!.start).toBe(5025480)
  // 2:34:56:18 = 2*3600000 + 34*60000 + 56*1000 + (18/25)*1000
  expect(doc.events[0]!.end).toBe(9296720)
})

test('parseCAP handles zero timecode', () => {
  const cap = `$VideoStandard PAL

00:00:00:00	00:00:01:00
Start from zero`

  const doc = parseCAP(cap)
  expect(doc.events[0]!.start).toBe(0)
  expect(doc.events[0]!.end).toBe(1000)
})
