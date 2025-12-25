import { test, expect } from 'bun:test'
import { toCAP } from '../../src/formats/broadcast/cap/serializer.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../src/core/document.ts'
import type { SubtitleDocument } from '../../src/core/types.ts'

function createTestDoc(): SubtitleDocument {
  const doc = createDocument()
  doc.events = [
    {
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
    },
    {
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
      text: 'Goodbye world',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
  ]
  return doc
}

test('toCAP generates basic file', () => {
  const doc = createTestDoc()
  const cap = toCAP(doc)

  expect(cap).toContain('$CaptionMAX 2.0')
  expect(cap).toContain('$VideoStandard PAL')
  expect(cap).toContain('$CharacterSet ISO_8859_1')
  expect(cap).toContain('00:00:01:00\t00:00:05:00')
  expect(cap).toContain('Hello world')
})

test('toCAP uses PAL by default', () => {
  const doc = createDocument()
  doc.events = [
    {
      id: generateId(),
      start: 1480, // 1 second + 12 frames at 25fps
      end: 2000,
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
  ]

  const cap = toCAP(doc)
  expect(cap).toContain('00:00:01:12\t00:00:02:00')
})

test('toCAP uses NTSC when specified', () => {
  const doc = createDocument()
  doc.events = [
    {
      id: generateId(),
      start: 1000,
      end: 2000,
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
  ]

  const cap = toCAP(doc, { fps: 29.97, videoStandard: 'NTSC' })
  expect(cap).toContain('$VideoStandard NTSC')
})

test('toCAP handles multiline text', () => {
  const doc = createDocument()
  doc.events = [
    {
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
      text: 'Line one\nLine two',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
  ]

  const cap = toCAP(doc)
  expect(cap).toContain('Line one\nLine two')
})

test('toCAP separates subtitles with empty lines', () => {
  const doc = createTestDoc()
  const cap = toCAP(doc)

  const lines = cap.split('\n')
  const firstTextIdx = lines.findIndex(l => l === 'Hello world')
  expect(lines[firstTextIdx + 1]).toBe('')
  expect(lines[firstTextIdx + 2]).toContain('00:00:06:00')
})

test('toCAP handles empty document', () => {
  const doc = createDocument()
  const cap = toCAP(doc)

  expect(cap).toContain('$CaptionMAX 2.0')
  expect(cap).toContain('$VideoStandard PAL')
  expect(cap).toContain('$CharacterSet ISO_8859_1')
})

test('toCAP formats timecodes with leading zeros', () => {
  const doc = createDocument()
  doc.events = [
    {
      id: generateId(),
      start: 100, // Less than 1 second
      end: 500,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Short',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
  ]

  const cap = toCAP(doc)
  expect(cap).toContain('00:00:00:')
})

test('toCAP handles large timecodes', () => {
  const doc = createDocument()
  doc.events = [
    {
      id: generateId(),
      start: 5025480, // 1:23:45:12 at 25fps
      end: 9296720,   // 2:34:56:18 at 25fps
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Long duration',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
  ]

  const cap = toCAP(doc)
  expect(cap).toContain('01:23:45:12\t02:34:56:18')
})

test('toCAP custom character set', () => {
  const doc = createTestDoc()
  const cap = toCAP(doc, { characterSet: 'UTF-8' })

  expect(cap).toContain('$CharacterSet UTF-8')
})

test('toCAP handles zero timecode', () => {
  const doc = createDocument()
  doc.events = [
    {
      id: generateId(),
      start: 0,
      end: 1000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Start from zero',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
  ]

  const cap = toCAP(doc)
  expect(cap).toContain('00:00:00:00\t00:00:01:00')
})
