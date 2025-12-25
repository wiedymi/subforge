import { test, expect } from 'bun:test'
import { parseDVB, toDVB } from '../../src/formats/binary/dvb/index.ts'
import { createDocument, generateId } from '../../src/core/document.ts'
import type { ImageEffect } from '../../src/core/types.ts'

// Create a simple DVB subtitle for testing
function createSimpleDVB(): Uint8Array {
  const segments: number[] = []

  // Page composition segment
  segments.push(
    0x0F, 0x10, 0x00, 0x00,
    0x00, 0x02,
    0x05, 0x00
  )

  // CLUT definition
  segments.push(
    0x0F, 0x12, 0x00, 0x00,
    0x00, 0x0E,
    0x00, 0x00,
    0x00, 0x01, 0x00, 0x80, 0x80, 0xFF,
    0x01, 0x01, 0xFF, 0x80, 0x80, 0x00
  )

  // Object data - record position before pushing
  const objSegmentStart = segments.length
  const pixelData = [0x00, 0x04, 0x01, 0x00, 0x00]
  segments.push(
    0x0F, 0x13, 0x00, 0x00,
    0x00, 0x00, // length placeholder
    0x00, 0x00, // object ID
    0x00, // version/coding
    0x00, 0x00, // top field length placeholder
    0x00, 0x00, // bottom field length
    ...pixelData
  )

  const objDataLen = 7 + pixelData.length
  segments[objSegmentStart + 4] = (objDataLen >> 8) & 0xFF
  segments[objSegmentStart + 5] = objDataLen & 0xFF
  segments[objSegmentStart + 9] = (pixelData.length >> 8) & 0xFF
  segments[objSegmentStart + 10] = pixelData.length & 0xFF

  // End of display set
  segments.push(0x0F, 0x80, 0x00, 0x00, 0x00, 0x00)

  return new Uint8Array(segments)
}

test('roundtrip preserves basic structure', () => {
  const original = createSimpleDVB()
  const doc = parseDVB(original)
  const serialized = toDVB(doc)

  expect(serialized).toBeInstanceOf(Uint8Array)
  expect(serialized.length).toBeGreaterThan(0)
})

test('roundtrip preserves image effects', () => {
  const original = createSimpleDVB()
  const doc = parseDVB(original)
  const serialized = toDVB(doc)
  const reparsed = parseDVB(serialized)

  const originalImages = doc.events.flatMap(e =>
    e.segments.flatMap(s =>
      s.effects.filter(eff => eff.type === 'image')
    )
  )

  const reparsedImages = reparsed.events.flatMap(e =>
    e.segments.flatMap(s =>
      s.effects.filter(eff => eff.type === 'image')
    )
  )

  expect(reparsedImages.length).toBe(originalImages.length)
})

test('toDVB creates valid sync bytes', () => {
  const doc = createDocument()
  const imageEffect: ImageEffect = {
    type: 'image',
    params: {
      format: 'indexed',
      width: 4,
      height: 4,
      data: new Uint8Array([1, 1, 1, 1, 2, 2, 2, 2]),
      palette: [0x000000FF, 0xFFFFFFFF, 0xFF0000FF]
    }
  }

  doc.events.push({
    id: generateId(),
    start: 0,
    end: 5000,
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

  // Check that all segments start with sync byte 0x0F
  let pos = 0
  while (pos < data.length) {
    if (pos + 6 > data.length) break
    expect(data[pos]).toBe(0x0F)

    const length = (data[pos + 4] << 8) | data[pos + 5]
    pos += 6 + length
  }
})

test('toDVB handles empty document', () => {
  const doc = createDocument()
  const data = toDVB(doc)
  expect(data).toBeInstanceOf(Uint8Array)
  expect(data.length).toBe(0)
})

test('toDVB creates CLUT from palette', () => {
  const doc = createDocument()
  const imageEffect: ImageEffect = {
    type: 'image',
    params: {
      format: 'indexed',
      width: 2,
      height: 2,
      data: new Uint8Array([0, 1, 2, 3]),
      palette: [0x000000FF, 0xFFFFFFFF, 0xFF0000FF, 0x0000FFFF]
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

  // Find CLUT segment (type 0x12)
  let hasCLUT = false
  let pos = 0
  while (pos + 6 <= data.length) {
    if (data[pos] === 0x0F && data[pos + 1] === 0x12) {
      hasCLUT = true
      break
    }
    const length = (data[pos + 4] << 8) | data[pos + 5]
    pos += 6 + length
  }

  expect(hasCLUT).toBe(true)
})
