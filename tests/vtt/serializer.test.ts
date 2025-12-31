import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseVTT } from '../../src/formats/text/vtt/parser.ts'
import { toVTT } from '../../src/formats/text/vtt/serializer.ts'
import { createDocument, createEvent } from '../../src/core/document.ts'

test('toVTT serializes basic document', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Hello world'))

  const output = toVTT(doc)

  expect(output).toContain('WEBVTT')
  expect(output).toContain('00:00:01.000 --> 00:00:05.000')
  expect(output).toContain('Hello world')
})

test('toVTT serializes multiple cues', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'First'))
  doc.events.push(createEvent(6000, 10000, 'Second'))

  const output = toVTT(doc)

  expect(output).toContain('First')
  expect(output).toContain('Second')
})

test('toVTT roundtrip preserves content', () => {
  const original = `WEBVTT

00:00:01.000 --> 00:00:05.000
Hello world

00:00:06.000 --> 00:00:10.000
Goodbye world`

  const doc = unwrap(parseVTT(original))
  const output = toVTT(doc)
  const reparsed = unwrap(parseVTT(output))

  expect(reparsed.events.length).toBe(doc.events.length)
  expect(reparsed.events[0]!.text).toBe(doc.events[0]!.text)
  expect(reparsed.events[0]!.start).toBe(doc.events[0]!.start)
})

test('toVTT preserves multiline text', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Line one\nLine two'))

  const output = toVTT(doc)

  expect(output).toContain('Line one')
  expect(output).toContain('Line two')
})

test('toVTT serializes dirty events with segments', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.dirty = true
  event.segments = [
    { text: 'bold', style: { bold: true }, effects: [] }
  ]
  doc.events.push(event)

  const output = toVTT(doc)

  expect(output).toContain('<b>bold</b>')
})

test('toVTT serializes regions', () => {
  const doc = createDocument()
  doc.regions = [
    { id: 'region1', width: '40%', lines: 3, regionAnchor: '0%,100%', viewportAnchor: '0%,100%', scroll: 'none' }
  ]
  doc.events.push(createEvent(1000, 5000, 'Hello'))

  const output = toVTT(doc)

  expect(output).toContain('REGION')
  expect(output).toContain('id:region1')
})

// Coverage: region with scroll (line 19-20)
test('toVTT serializes regions with scroll', () => {
  const doc = createDocument()
  doc.regions = [
    { id: 'region1', width: '40%', lines: 3, regionAnchor: '0%,100%', viewportAnchor: '0%,100%', scroll: 'up' }
  ]
  doc.events.push(createEvent(1000, 5000, 'Hello'))

  const output = toVTT(doc)

  expect(output).toContain('scroll:up')
})
