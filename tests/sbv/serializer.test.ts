import { test, expect } from 'bun:test'
import { parseSBV } from '../../src/formats/text/sbv/parser.ts'
import { toSBV } from '../../src/formats/text/sbv/serializer.ts'
import { createDocument, createEvent } from '../../src/core/document.ts'

test('toSBV serializes basic document', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Hello world'))

  const output = toSBV(doc)

  expect(output).toContain('0:00:01.000,0:00:05.000')
  expect(output).toContain('Hello world')
})

test('toSBV serializes multiple events', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'First'))
  doc.events.push(createEvent(6000, 10000, 'Second'))

  const output = toSBV(doc)

  expect(output).toContain('First')
  expect(output).toContain('Second')
})

test('toSBV roundtrip preserves content', () => {
  const original = `0:00:01.000,0:00:05.000
Hello world

0:00:06.000,0:00:10.000
Goodbye world`

  const doc = parseSBV(original)
  const output = toSBV(doc)
  const reparsed = parseSBV(output)

  expect(reparsed.events.length).toBe(doc.events.length)
  expect(reparsed.events[0]!.text).toBe(doc.events[0]!.text)
  expect(reparsed.events[0]!.start).toBe(doc.events[0]!.start)
})

test('toSBV preserves multiline text', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Line one\nLine two'))

  const output = toSBV(doc)

  expect(output).toContain('Line one')
  expect(output).toContain('Line two')
})

test('toSBV uses period separator', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1500, 5500, 'Test'))

  const output = toSBV(doc)

  expect(output).toContain('0:00:01.500')
  expect(output).not.toContain('0:00:01,500')
})

test('toSBV uses comma between timestamps', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Test'))

  const output = toSBV(doc)

  expect(output).toContain('0:00:01.000,0:00:05.000')
})

test('toSBV separates entries with blank line', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'First'))
  doc.events.push(createEvent(6000, 10000, 'Second'))

  const output = toSBV(doc)

  expect(output).toMatch(/First\n\n/)
})

test('toSBV handles large hour values', () => {
  const doc = createDocument()
  doc.events.push(createEvent(445506789, 449777890, 'Long duration'))

  const output = toSBV(doc)

  expect(output).toContain('123:45:06.789')
})

test('toSBV strips styling from dirty events', () => {
  const doc = createDocument()
  const event = createEvent(1000, 5000, '<b>Bold</b> text')
  doc.events.push(event)

  const output = toSBV(doc)

  expect(output).toContain('<b>Bold</b> text')
})
