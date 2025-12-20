import { test, expect } from 'bun:test'
import { convert } from '../../src/core/convert.ts'
import { parseASS } from '../../src/ass/parser.ts'
import { parseSRT } from '../../src/srt/parser.ts'
import { parseVTT } from '../../src/vtt/parser.ts'
import { createDocument, createEvent } from '../../src/core/document.ts'

test('convert ASS to SRT', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Hello world'))

  const result = convert(doc, 'srt')

  expect(result.output).toContain('00:00:01,000 --> 00:00:05,000')
  expect(result.output).toContain('Hello world')
})

test('convert ASS to VTT', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Hello world'))

  const result = convert(doc, 'vtt')

  expect(result.output).toContain('WEBVTT')
  expect(result.output).toContain('00:00:01.000 --> 00:00:05.000')
})

test('convert ASS to ASS', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Hello world'))

  const result = convert(doc, 'ass')

  expect(result.output).toContain('[Script Info]')
  expect(result.output).toContain('[Events]')
})

test('convert reports lost positioning', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '{\\pos(100,200)}Hello')
  event.segments = [{ text: 'Hello', style: { pos: [100, 200] }, effects: [] }]
  event.dirty = true
  doc.events.push(event)

  const result = convert(doc, 'srt', { reportLoss: true })

  expect(result.lostFeatures.length).toBeGreaterThan(0)
})

test('convert preserves basic formatting', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.segments = [{ text: 'bold', style: { bold: true }, effects: [] }]
  event.dirty = true
  doc.events.push(event)

  const result = convert(doc, 'srt')

  expect(result.output).toContain('<b>')
})

test('convert strips unsupported features', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.segments = [{ text: 'blurred', style: null, effects: [{ type: 'blur', params: { strength: 2 } }] }]
  event.dirty = true
  doc.events.push(event)

  const result = convert(doc, 'srt', { unsupported: 'drop', reportLoss: true })

  expect(result.lostFeatures.some(f => f.feature === 'blur')).toBe(true)
})

test('convert SRT roundtrip', () => {
  const srt = `1
00:00:01,000 --> 00:00:05,000
Hello world`

  const doc = parseSRT(srt)
  const result = convert(doc, 'srt')
  const reparsed = parseSRT(result.output)

  expect(reparsed.events[0]!.text).toBe(doc.events[0]!.text)
})

test('convert VTT roundtrip', () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:05.000
Hello world`

  const doc = parseVTT(vtt)
  const result = convert(doc, 'vtt')
  const reparsed = parseVTT(result.output)

  expect(reparsed.events[0]!.text).toBe(doc.events[0]!.text)
})
