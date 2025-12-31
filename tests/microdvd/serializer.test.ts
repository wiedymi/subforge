import { test, expect } from 'bun:test'
import { toMicroDVD } from '../../src/formats/text/microdvd/index.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../src/core/document.ts'

test('toMicroDVD - basic subtitle', () => {
  const doc = createDocument()
  doc.events.push({
    id: generateId(),
    start: 0,
    end: 4000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'First subtitle',
    segments: EMPTY_SEGMENTS,
    dirty: false
  })

  const output = toMicroDVD(doc, { fps: 25 })
  expect(output).toBe('{0}{100}First subtitle\n')
})

test('toMicroDVD - multiple subtitles', () => {
  const doc = createDocument()
  doc.events.push(
    {
      id: generateId(),
      start: 0,
      end: 4000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'First subtitle',
      segments: EMPTY_SEGMENTS,
      dirty: false
    },
    {
      id: generateId(),
      start: 6000,
      end: 12000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Second subtitle',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
  )

  const output = toMicroDVD(doc, { fps: 25 })
  expect(output).toBe('{0}{100}First subtitle\n{150}{300}Second subtitle\n')
})

test('toMicroDVD - line break to pipe', () => {
  const doc = createDocument()
  doc.events.push({
    id: generateId(),
    start: 0,
    end: 4000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'First line\nSecond line',
    segments: EMPTY_SEGMENTS,
    dirty: false
  })

  const output = toMicroDVD(doc, { fps: 25 })
  expect(output).toBe('{0}{100}First line|Second line\n')
})

test('toMicroDVD - millisecond to frame conversion', () => {
  const doc = createDocument()
  doc.events.push({
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
    text: 'One second',
    segments: EMPTY_SEGMENTS,
    dirty: false
  })

  const output25 = toMicroDVD(doc, { fps: 25 })
  expect(output25).toBe('{0}{25}One second\n')

  const output30 = toMicroDVD(doc, { fps: 30 })
  expect(output30).toBe('{0}{30}One second\n')
})

test('toMicroDVD - with segments', () => {
  const doc = createDocument()
  doc.events.push({
    id: generateId(),
    start: 0,
    end: 4000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Original text',
    segments: [
      { text: 'Modified ', style: { italic: true }, effects: [] },
      { text: 'text', style: null, effects: [] }
    ],
    dirty: true
  })

  const output = toMicroDVD(doc, { fps: 25 })
  expect(output).toContain('{y:i}Modified text')
})
