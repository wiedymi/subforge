import { test, expect, describe } from 'bun:test'
import { convert } from '../../src/core/convert.ts'
import { parseASS } from '../../src/ass/parser.ts'
import { parseSRT } from '../../src/srt/parser.ts'
import { parseVTT } from '../../src/vtt/parser.ts'
import { createDocument, createEvent } from '../../src/core/document.ts'

const railgunOP = parseASS(await Bun.file('./tests/fixtures/ass/railgun_op.ass').text())
const aot3p2OP = parseASS(await Bun.file('./tests/fixtures/ass/aot3p2_op.ass').text())

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

describe('real file: railgun_op.ass conversion', () => {
  test('convert to SRT preserves event count', () => {
    const result = convert(railgunOP, 'srt')
    const reparsed = parseSRT(result.output)
    expect(reparsed.events.length).toBe(railgunOP.events.length)
  })

  test('convert to SRT produces valid timestamps', () => {
    const result = convert(railgunOP, 'srt')
    const reparsed = parseSRT(result.output)
    for (const event of reparsed.events) {
      expect(event.start).toBeGreaterThanOrEqual(0)
      expect(event.end).toBeGreaterThanOrEqual(event.start)
    }
  })

  test('convert to VTT preserves event count', () => {
    const result = convert(railgunOP, 'vtt')
    const reparsed = parseVTT(result.output)
    expect(reparsed.events.length).toBe(railgunOP.events.length)
  })

  test('convert to VTT produces valid timestamps', () => {
    const result = convert(railgunOP, 'vtt')
    const reparsed = parseVTT(result.output)
    for (const event of reparsed.events) {
      expect(event.start).toBeGreaterThanOrEqual(0)
      expect(event.end).toBeGreaterThanOrEqual(event.start)
    }
  })

  test('convert to ASS roundtrip preserves event count', () => {
    const result = convert(railgunOP, 'ass')
    const reparsed = parseASS(result.output)
    expect(reparsed.events.length).toBe(railgunOP.events.length)
  })
})

describe('real file: aot3p2_op.ass conversion', () => {
  test('convert to SRT preserves event count', () => {
    const result = convert(aot3p2OP, 'srt')
    const reparsed = parseSRT(result.output)
    expect(reparsed.events.length).toBe(aot3p2OP.events.length)
  })

  test('convert to VTT preserves event count', () => {
    const result = convert(aot3p2OP, 'vtt')
    const reparsed = parseVTT(result.output)
    expect(reparsed.events.length).toBe(aot3p2OP.events.length)
  })

  test('convert to ASS roundtrip preserves event count', () => {
    const result = convert(aot3p2OP, 'ass')
    const reparsed = parseASS(result.output)
    expect(reparsed.events.length).toBe(aot3p2OP.events.length)
  })
})

// Coverage: alignment loss reporting (lines 108-115)
test('convert reports lost alignment', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.segments = [{ text: 'centered', style: { alignment: 5 }, effects: [] }]
  event.dirty = true
  doc.events.push(event)

  const result = convert(doc, 'srt', { reportLoss: true })

  expect(result.lostFeatures.some(f => f.feature === 'alignment')).toBe(true)
})

// Coverage: fontName loss reporting (lines 119-126)
test('convert reports lost fontName', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.segments = [{ text: 'styled', style: { fontName: 'Arial' }, effects: [] }]
  event.dirty = true
  doc.events.push(event)

  const result = convert(doc, 'vtt', { reportLoss: true })

  expect(result.lostFeatures.some(f => f.feature === 'fontName')).toBe(true)
})

// Coverage: fontSize loss reporting (lines 130-137)
test('convert reports lost fontSize', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.segments = [{ text: 'sized', style: { fontSize: 24 }, effects: [] }]
  event.dirty = true
  doc.events.push(event)

  const result = convert(doc, 'vtt', { reportLoss: true })

  expect(result.lostFeatures.some(f => f.feature === 'fontSize')).toBe(true)
})

// Coverage: karaoke loss reporting (lines 143-152)
test('convert reports lost karaoke', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.segments = [{ text: 'kar', style: null, effects: [{ type: 'karaoke', params: { duration: 500, mode: 'fill' } }] }]
  event.dirty = true
  doc.events.push(event)

  const result = convert(doc, 'srt', { karaoke: 'strip', reportLoss: true })

  expect(result.lostFeatures.some(f => f.feature === 'karaoke')).toBe(true)
})

// Coverage: unsupported effect not dropped in comment mode (lines 163-166)
test('convert keeps unsupported effects in comment mode', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.segments = [{ text: 'blurred', style: null, effects: [{ type: 'blur', params: { strength: 2 } }] }]
  event.dirty = true
  doc.events.push(event)

  const result = convert(doc, 'srt', { unsupported: 'comment', reportLoss: true })

  expect(result.lostFeatures.some(f => f.feature === 'blur')).toBe(true)
})

// Coverage: event without segments and not dirty (line 66-67)
test('convert passes through clean events without segments', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, 'Hello')
  event.dirty = false
  event.segments = []
  doc.events.push(event)

  const result = convert(doc, 'srt')

  expect(result.output).toContain('Hello')
})

// Coverage: effect preserved with comment mode (line 168)
test('convert preserves karaoke effect with preserve and comment mode', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.segments = [{ text: 'kar', style: null, effects: [{ type: 'karaoke', params: { duration: 500, mode: 'fill' } }] }]
  event.dirty = true
  doc.events.push(event)

  const result = convert(doc, 'srt', { karaoke: 'preserve', unsupported: 'comment' })
  const reparsed = parseSRT(result.output)

  expect(reparsed.events).toHaveLength(1)
})
