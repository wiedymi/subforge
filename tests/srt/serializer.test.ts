import { test, expect } from 'bun:test'
import { parseSRT } from '../../src/srt/parser.ts'
import { toSRT } from '../../src/srt/serializer.ts'
import { createDocument, createEvent } from '../../src/core/document.ts'

test('toSRT serializes basic document', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Hello world'))

  const output = toSRT(doc)

  expect(output).toContain('1')
  expect(output).toContain('00:00:01,000 --> 00:00:05,000')
  expect(output).toContain('Hello world')
})

test('toSRT serializes multiple events', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'First'))
  doc.events.push(createEvent(6000, 10000, 'Second'))

  const output = toSRT(doc)

  expect(output).toContain('1')
  expect(output).toContain('2')
  expect(output).toContain('First')
  expect(output).toContain('Second')
})

test('toSRT roundtrip preserves content', () => {
  const original = `1
00:00:01,000 --> 00:00:05,000
Hello world

2
00:00:06,000 --> 00:00:10,000
Goodbye world`

  const doc = parseSRT(original)
  const output = toSRT(doc)
  const reparsed = parseSRT(output)

  expect(reparsed.events.length).toBe(doc.events.length)
  expect(reparsed.events[0]!.text).toBe(doc.events[0]!.text)
  expect(reparsed.events[0]!.start).toBe(doc.events[0]!.start)
})

test('toSRT preserves multiline text', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Line one\nLine two'))

  const output = toSRT(doc)

  expect(output).toContain('Line one')
  expect(output).toContain('Line two')
})

test('toSRT serializes dirty events with segments', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '')
  event.dirty = true
  event.segments = [
    { text: 'bold', style: { bold: true }, effects: [] }
  ]
  doc.events.push(event)

  const output = toSRT(doc)

  expect(output).toContain('<b>bold</b>')
})
