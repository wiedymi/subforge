import { test, expect } from 'bun:test'
import { parseSRT, parseSRTResult } from '../../src/formats/text/srt/parser.ts'

const simpleSRT = `1
00:00:01,000 --> 00:00:05,000
Hello world

2
00:00:06,000 --> 00:00:10,000
Goodbye world`

test('parseSRT parses basic file', () => {
  const doc = parseSRT(simpleSRT)
  expect(doc.events).toHaveLength(2)
})

test('parseSRT parses first subtitle', () => {
  const doc = parseSRT(simpleSRT)
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(5000)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseSRT parses second subtitle', () => {
  const doc = parseSRT(simpleSRT)
  expect(doc.events[1]!.start).toBe(6000)
  expect(doc.events[1]!.end).toBe(10000)
  expect(doc.events[1]!.text).toBe('Goodbye world')
})

test('parseSRT handles multiline text', () => {
  const srt = `1
00:00:01,000 --> 00:00:05,000
Line one
Line two`

  const doc = parseSRT(srt)
  expect(doc.events[0]!.text).toBe('Line one\nLine two')
})

test('parseSRT handles styling tags', () => {
  const srt = `1
00:00:01,000 --> 00:00:05,000
<b>Bold</b> text`

  const doc = parseSRT(srt)
  expect(doc.events[0]!.text).toBe('<b>Bold</b> text')
})

test('parseSRT handles empty lines between subtitles', () => {
  const srt = `1
00:00:01,000 --> 00:00:05,000
First


2
00:00:06,000 --> 00:00:10,000
Second`

  const doc = parseSRT(srt)
  expect(doc.events).toHaveLength(2)
})

test('parseSRT handles Windows line endings', () => {
  const srt = "1\r\n00:00:01,000 --> 00:00:05,000\r\nHello world\r\n"
  const doc = parseSRT(srt)
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseSRT creates unique IDs', () => {
  const doc = parseSRT(simpleSRT)
  expect(doc.events[0]!.id).not.toBe(doc.events[1]!.id)
})

test('parseSRT sets default style', () => {
  const doc = parseSRT(simpleSRT)
  expect(doc.events[0]!.style).toBe('Default')
})

test('parseSRTResult collects errors', () => {
  const srt = `1
invalid --> 00:00:05,000
Hello`

  const result = parseSRTResult(srt, { onError: 'collect' })
  expect(result.errors.length).toBeGreaterThan(0)
})

test('parseSRT handles BOM', () => {
  const srt = "\uFEFF1\n00:00:01,000 --> 00:00:05,000\nHello"
  const doc = parseSRT(srt)
  expect(doc.events).toHaveLength(1)
})

test('parseSRT handles trailing whitespace', () => {
  const srt = `1
00:00:01,000 --> 00:00:05,000
Hello world   `

  const doc = parseSRT(srt)
  expect(doc.events[0]!.text).toBe('Hello world')
})
