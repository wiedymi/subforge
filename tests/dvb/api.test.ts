import { test, expect } from 'bun:test'
import { parseDVB, parseDVBResult, toDVB } from '../../src/dvb/index.ts'
import type { SubtitleDocument, ImageEffect } from '../../src/core/types.ts'
import { createDocument, generateId } from '../../src/core/document.ts'

test('parseDVB API throws on invalid sync byte by default', () => {
  const invalidData = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF])

  expect(() => parseDVB(invalidData)).toThrow()
})

test('parseDVBResult API collects errors on invalid data', () => {
  const invalidData = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF])

  const result = parseDVBResult(invalidData, { onError: 'collect' })

  expect(result.document).toBeDefined()
  expect(result.errors.length).toBeGreaterThan(0)
  expect(result.warnings).toBeDefined()
  expect(result.document.events).toHaveLength(0)
})

test('parseDVBResult API can ignore errors', () => {
  const invalidData = new Uint8Array([0xFF, 0xFF, 0xFF])

  const result = parseDVBResult(invalidData, { onError: 'ignore' })

  expect(result.document).toBeDefined()
  expect(result.errors).toHaveLength(0)
})

test('toDVB API creates valid binary output', () => {
  const doc = createDocument()

  const imageEffect: ImageEffect = {
    type: 'image',
    params: {
      format: 'indexed',
      width: 8,
      height: 8,
      data: new Uint8Array(64).fill(1),
      palette: [0x000000FF, 0xFFFFFFFF]
    }
  }

  doc.events.push({
    id: generateId(),
    start: 0,
    end: 3000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: '',
    segments: [{
      text: '',
      style: null,
      effects: [imageEffect]
    }],
    dirty: false
  })

  const data = toDVB(doc)

  expect(data).toBeInstanceOf(Uint8Array)
  expect(data.length).toBeGreaterThan(0)

  // First byte should be sync byte
  expect(data[0]).toBe(0x0F)
})

test('toDVB API handles empty document', () => {
  const doc = createDocument()
  const data = toDVB(doc)

  expect(data).toBeInstanceOf(Uint8Array)
  expect(data.length).toBe(0)
})

test('toDVB API handles document without image effects', () => {
  const doc = createDocument()

  doc.events.push({
    id: generateId(),
    start: 0,
    end: 3000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Hello world',
    segments: [{
      text: 'Hello world',
      style: null,
      effects: []
    }],
    dirty: false
  })

  const data = toDVB(doc)

  expect(data).toBeInstanceOf(Uint8Array)
  expect(data.length).toBe(0) // No image effects = no output
})

test('parseDVB creates SubtitleDocument', () => {
  const data = new Uint8Array([
    0x0F, 0x10, 0x00, 0x00, 0x00, 0x02, 0x05, 0x00,
    0x0F, 0x80, 0x00, 0x00, 0x00, 0x00
  ])

  const doc = parseDVB(data)

  expect(doc).toBeDefined()
  expect(doc.info).toBeDefined()
  expect(doc.styles).toBeDefined()
  expect(doc.events).toBeDefined()
  expect(doc.comments).toBeDefined()
  expect(Array.isArray(doc.events)).toBe(true)
})

test('ImageEffect format is "indexed"', () => {
  const doc = createDocument()

  const imageEffect: ImageEffect = {
    type: 'image',
    params: {
      format: 'indexed',
      width: 4,
      height: 4,
      data: new Uint8Array(16).fill(0),
      palette: [0xFF0000FF]
    }
  }

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
    text: '',
    segments: [{
      text: '',
      style: null,
      effects: [imageEffect]
    }],
    dirty: false
  })

  const data = toDVB(doc)
  const reparsed = parseDVB(data)

  const effect = reparsed.events[0].segments[0].effects[0]
  if (effect.type === 'image') {
    expect(effect.params.format).toBe('indexed')
  }
})
