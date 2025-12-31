import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseDVB } from '../../src/formats/binary/dvb/parser.ts'

// Create a simple DVB subtitle with minimal segments
function createSimpleDVB(): Uint8Array {
  const segments: number[] = []

  // Page composition segment
  segments.push(
    0x0F, // sync byte
    0x10, // page composition
    0x00, 0x00, // page ID
    0x00, 0x02, // length
    0x05, // timeout (5 seconds)
    0x00  // version/state
  )

  // CLUT definition segment (4 colors)
  const clutData = [
    0x0F, 0x12, 0x00, 0x00, // sync, type, page ID
    0x00, 0x1A, // length (26 bytes)
    0x00, 0x00, // CLUT ID 0, version 0
    // Entry 0: black transparent
    0x00, 0x01, 0x00, 0x80, 0x80, 0xFF,
    // Entry 1: white opaque
    0x01, 0x01, 0xFF, 0x80, 0x80, 0x00,
    // Entry 2: red opaque
    0x02, 0x01, 0x51, 0xFF, 0x6A, 0x00,
    // Entry 3: blue opaque
    0x03, 0x01, 0x29, 0xF0, 0xFF, 0x00
  ]
  segments.push(...clutData)

  // Object data segment (simple 4x4 pixel block)
  const pixelData = [
    // 4x4 pixels using palette indices
    0x00, 0x04, 0x01, // Run of 4 pixels of color 1
    0x00, 0x00, // end of line
    0x00, 0x04, 0x02, // Run of 4 pixels of color 2
    0x00, 0x00, // end of line
    0x00, 0x04, 0x03, // Run of 4 pixels of color 3
    0x00, 0x00, // end of line
    0x00, 0x04, 0x01, // Run of 4 pixels of color 1
    0x00, 0x00  // end of line
  ]

  segments.push(
    0x0F, 0x13, 0x00, 0x00, // sync, object data, page ID
    0x00, 0x00, // length placeholder
    0x00, 0x00, // object ID
    0x00, // version/coding method
    0x00, 0x00, // top field length placeholder
    0x00, 0x00, // bottom field length
    ...pixelData
  )

  // Fix length fields
  const objDataLen = 7 + pixelData.length
  const objSegmentStart = clutData.length + 8
  segments[objSegmentStart + 4] = (objDataLen >> 8) & 0xFF
  segments[objSegmentStart + 5] = objDataLen & 0xFF
  segments[objSegmentStart + 9] = (pixelData.length >> 8) & 0xFF
  segments[objSegmentStart + 10] = pixelData.length & 0xFF

  // End of display set
  segments.push(
    0x0F, 0x80, 0x00, 0x00, // sync, end of display set, page ID
    0x00, 0x00 // length
  )

  return new Uint8Array(segments)
}

test('parseDVB parses basic file', () => {
  const data = createSimpleDVB()
  const doc = unwrap(parseDVB(data))
  expect(doc.events.length).toBeGreaterThan(0)
})

test('parseDVB creates events with image effects', () => {
  const data = createSimpleDVB()
  const doc = unwrap(parseDVB(data))

  const hasImage = doc.events.some(event => event.image)

  expect(hasImage).toBe(true)
})

test('parseDVB handles empty data', () => {
  const data = new Uint8Array(0)
  const result = parseDVB(data, { onError: 'collect' })
  expect(result.ok).toBe(true)
  expect(result.document.events).toHaveLength(0)
})

test('parseDVB handles invalid sync byte', () => {
  const data = new Uint8Array([0xFF, 0x10, 0x00, 0x00, 0x00, 0x00])
  const result = parseDVB(data, { onError: 'collect' })
  expect(result.ok).toBe(false)
  expect(result.errors.length).toBeGreaterThan(0)
})

test('parseDVB extracts palette from CLUT', () => {
  const data = createSimpleDVB()
  const doc = unwrap(parseDVB(data))

  for (const event of doc.events) {
    const image = event.image
    if (image?.palette) {
      expect(image.palette.length).toBeGreaterThan(0)
    }
  }
})

test('parseDVB parses RLE compressed pixel data', () => {
  const data = createSimpleDVB()
  const doc = unwrap(parseDVB(data))

  for (const event of doc.events) {
    if (event.image) {
      expect(event.image.data).toBeInstanceOf(Uint8Array)
      expect(event.image.data.length).toBeGreaterThan(0)
    }
  }
})

test('parseDVB collects errors without throwing', () => {
  const invalidData = new Uint8Array([0x0F, 0x10, 0x00, 0x00, 0xFF, 0xFF]) // Length exceeds bounds
  const result = parseDVB(invalidData, { onError: 'collect' })
  expect(result.ok).toBe(false)
})
