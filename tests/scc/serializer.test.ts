import { test, expect } from 'bun:test'
import { toSCC } from '../../src/scc/serializer.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../src/core/document.ts'
import type { SubtitleDocument, SubtitleEvent } from '../../src/core/types.ts'

test('toSCC produces valid header', () => {
  const doc = createDocument()
  const scc = toSCC(doc)
  expect(scc).toContain('Scenarist_SCC V1.0')
})

test('toSCC serializes single caption', () => {
  const doc = createDocument()
  const event: SubtitleEvent = {
    id: generateId(),
    start: 1000,
    end: 5000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Hello world',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }
  doc.events.push(event)

  const scc = toSCC(doc)
  expect(scc).toContain('00:00:01;00')
  expect(scc).toContain('00:00:05;00')
  expect(scc).toContain('9420') // RCL
  expect(scc).toContain('942f') // EOC
})

test('toSCC formats timecode correctly', () => {
  const doc = createDocument()
  const event: SubtitleEvent = {
    id: generateId(),
    start: 3661000, // 01:01:01;00
    end: 3662000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Test',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }
  doc.events.push(event)

  const scc = toSCC(doc)
  expect(scc).toContain('01:01:01;')
})

test('toSCC serializes multiple captions', () => {
  const doc = createDocument()

  const event1: SubtitleEvent = {
    id: generateId(),
    start: 1000,
    end: 5000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'First',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }

  const event2: SubtitleEvent = {
    id: generateId(),
    start: 6000,
    end: 10000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Second',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }

  doc.events.push(event1, event2)

  const scc = toSCC(doc)
  expect(scc).toContain('00:00:01;00')
  expect(scc).toContain('00:00:06;00')
})

test('toSCC encodes text as hex pairs', () => {
  const doc = createDocument()
  const event: SubtitleEvent = {
    id: generateId(),
    start: 1000,
    end: 5000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Hi',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }
  doc.events.push(event)

  const scc = toSCC(doc)
  // 'Hi' should be encoded as 0x4869
  expect(scc).toContain('4869')
})

test('toSCC handles empty document', () => {
  const doc = createDocument()
  const scc = toSCC(doc)
  expect(scc).toBe('Scenarist_SCC V1.0\n\n')
})

test('toSCC duplicates control codes', () => {
  const doc = createDocument()
  const event: SubtitleEvent = {
    id: generateId(),
    start: 1000,
    end: 5000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Test',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }
  doc.events.push(event)

  const scc = toSCC(doc)
  // RCL should appear twice at start
  const lines = scc.split('\n').filter(l => l.includes('00:00:01;00'))
  expect(lines[0]).toContain('9420 9420')
})

test('toSCC adds EOC at end time', () => {
  const doc = createDocument()
  const event: SubtitleEvent = {
    id: generateId(),
    start: 1000,
    end: 5000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Test',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }
  doc.events.push(event)

  const scc = toSCC(doc)
  expect(scc).toContain('00:00:05;00')
  // EOC (942f) should appear at end time
  const lines = scc.split('\n').filter(l => l.includes('00:00:05;00'))
  expect(lines[0]).toContain('942f')
})

test('toSCC handles special characters', () => {
  const doc = createDocument()
  const event: SubtitleEvent = {
    id: generateId(),
    start: 1000,
    end: 5000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: '®',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }
  doc.events.push(event)

  const scc = toSCC(doc)
  // ® should be encoded as 0x9130
  expect(scc).toContain('9130')
})
