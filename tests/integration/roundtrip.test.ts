import { test, expect } from 'bun:test'
import { parseASS, toASS } from '../../src/formats/text/ass/index.ts'
import { unwrap } from '../../src/core/errors.ts'
import { parseSRT, toSRT } from '../../src/formats/text/srt/index.ts'
import { parseVTT, toVTT } from '../../src/formats/text/vtt/index.ts'
import { convert } from '../../src/core/convert.ts'
import { createDocument, createEvent, createDefaultStyle } from '../../src/core/document.ts'

test('ASS roundtrip preserves events', () => {
  const original = createDocument()
  original.events.push(createEvent(1000, 5000, 'First line'))
  original.events.push(createEvent(6000, 10000, 'Second line'))

  const output = toASS(original)
  const parsed = unwrap(parseASS(output))

  expect(parsed.events.length).toBe(original.events.length)
  expect(parsed.events[0]!.text).toBe(original.events[0]!.text)
  expect(parsed.events[0]!.start).toBe(original.events[0]!.start)
  expect(parsed.events[0]!.end).toBe(original.events[0]!.end)
})

test('ASS roundtrip preserves styles', () => {
  const original = createDocument()
  const style = createDefaultStyle()
  style.name = 'Sign'
  style.fontName = 'Impact'
  style.fontSize = 60
  style.bold = true
  original.styles.set('Sign', style)

  const output = toASS(original)
  const parsed = unwrap(parseASS(output))

  const parsedStyle = parsed.styles.get('Sign')
  expect(parsedStyle).toBeDefined()
  expect(parsedStyle!.fontName).toBe('Impact')
  expect(parsedStyle!.fontSize).toBe(60)
  expect(parsedStyle!.bold).toBe(true)
})

test('SRT roundtrip preserves events', () => {
  const original = createDocument()
  original.events.push(createEvent(1000, 5000, 'First line'))
  original.events.push(createEvent(6000, 10000, 'Second line'))

  const output = toSRT(original)
  const parsed = unwrap(parseSRT(output))

  expect(parsed.events.length).toBe(original.events.length)
  expect(parsed.events[0]!.text).toBe(original.events[0]!.text)
})

test('VTT roundtrip preserves events', () => {
  const original = createDocument()
  original.events.push(createEvent(1000, 5000, 'First line'))
  original.events.push(createEvent(6000, 10000, 'Second line'))

  const output = toVTT(original)
  const parsed = unwrap(parseVTT(output))

  expect(parsed.events.length).toBe(original.events.length)
  expect(parsed.events[0]!.text).toBe(original.events[0]!.text)
})

test('ASS to SRT conversion', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello world`

  const doc = unwrap(parseASS(ass))
  const result = convert(doc, { to: 'srt' })
  const reparsed = unwrap(parseSRT(result.output))

  expect(reparsed.events.length).toBe(1)
  expect(reparsed.events[0]!.text).toBe('Hello world')
  expect(reparsed.events[0]!.start).toBe(1000)
  expect(reparsed.events[0]!.end).toBe(5000)
})

test('ASS to VTT conversion', () => {
  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello world`

  const doc = unwrap(parseASS(ass))
  const result = convert(doc, { to: 'vtt' })
  const reparsed = unwrap(parseVTT(result.output))

  expect(reparsed.events.length).toBe(1)
  expect(reparsed.events[0]!.text).toBe('Hello world')
})

test('SRT to VTT conversion', () => {
  const srt = `1
00:00:01,000 --> 00:00:05,000
Hello world`

  const doc = unwrap(parseSRT(srt))
  const result = convert(doc, { to: 'vtt' })
  const reparsed = unwrap(parseVTT(result.output))

  expect(reparsed.events.length).toBe(1)
  expect(reparsed.events[0]!.text).toBe('Hello world')
})

test('VTT to SRT conversion', () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:05.000
Hello world`

  const doc = unwrap(parseVTT(vtt))
  const result = convert(doc, { to: 'srt' })
  const reparsed = unwrap(parseSRT(result.output))

  expect(reparsed.events.length).toBe(1)
  expect(reparsed.events[0]!.text).toBe('Hello world')
})

test('multiline text preserved across formats', () => {
  const original = createDocument()
  original.events.push(createEvent(1000, 5000, 'Line one\nLine two'))

  for (const format of ['ass', 'srt', 'vtt'] as const) {
    const result = convert(original, { to: format })
    expect(result.output).toContain('Line one')
    expect(result.output).toContain('Line two')
  }
})
