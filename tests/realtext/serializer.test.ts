import { test, expect } from 'bun:test'
import { toRealText } from '../../src/realtext/serializer.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../src/core/document.ts'
import type { SubtitleDocument, SubtitleEvent } from '../../src/core/types.ts'

function createEvent(start: number, end: number, text: string): SubtitleEvent {
  return {
    id: generateId(),
    start,
    end,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text,
    segments: EMPTY_SEGMENTS,
    dirty: false
  }
}

test('toRealText generates basic format', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'First subtitle'))
  doc.events.push(createEvent(5000, 10000, 'Second subtitle'))

  const rt = toRealText(doc)
  expect(rt).toContain('<window')
  expect(rt).toContain('</window>')
  expect(rt).toContain('<time begin="00:00:01.00"/>')
  expect(rt).toContain('<time begin="00:00:05.00"/>')
})

test('toRealText includes window attributes', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 10000, 'Text'))

  const rt = toRealText(doc)
  expect(rt).toContain('duration="00:00:10.00"')
  expect(rt).toContain('wordwrap="true"')
  expect(rt).toContain('bgcolor="black"')
})

test('toRealText includes clear tags', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'First'))

  const rt = toRealText(doc)
  expect(rt).toContain('<clear/>')
})

test('toRealText handles empty document', () => {
  const doc = createDocument()

  const rt = toRealText(doc)
  expect(rt).toContain('<window')
  expect(rt).toContain('duration="00:00:00.00"')
})

test('toRealText escapes text properly', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Text with & ampersand'))

  const rt = toRealText(doc)
  expect(rt).toContain('&amp;')
})

test('toRealText converts newlines to br tags', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Line one\nLine two'))

  const rt = toRealText(doc)
  expect(rt).toContain('<br/>')
})

test('toRealText preserves formatting tags', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, '<b>Bold</b> text'))

  const rt = toRealText(doc)
  expect(rt).toContain('<b>Bold</b>')
})

test('toRealText handles multiple events', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'First'))
  doc.events.push(createEvent(5000, 10000, 'Second'))
  doc.events.push(createEvent(10000, 15000, 'Third'))

  const rt = toRealText(doc)
  const timeMatches = rt.match(/<time begin="/g)
  expect(timeMatches).toHaveLength(3)
})

test('toRealText formats timestamps correctly', () => {
  const doc = createDocument()
  doc.events.push(createEvent(3661500, 3665000, 'Text')) // 01:01:01.50

  const rt = toRealText(doc)
  expect(rt).toContain('begin="01:01:01.50"')
})

test('toRealText calculates duration from last event', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'First'))
  doc.events.push(createEvent(5000, 30000, 'Last'))

  const rt = toRealText(doc)
  expect(rt).toContain('duration="00:00:30.00"')
})
