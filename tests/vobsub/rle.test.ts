import { test, expect } from 'bun:test'
import { decodeRLE, encodeRLE } from '../../src/vobsub/rle.ts'

test('decodeRLE handles simple bitmap', () => {
  // Create a simple 4x4 bitmap with RLE encoding
  // Color pattern: all pixels are color 1
  const rleData = new Uint8Array([
    0x00, 0xC5,  // Run of 5 pixels with color 1 (0xC0 | (5 << 2) | 1)
    0x00, 0x00,  // End of line
    0x00, 0xC5,  // Run of 5 pixels with color 1
    0x00, 0x00,  // End of line
    0x00, 0xC5,  // Run of 5 pixels with color 1
    0x00, 0x00,  // End of line
    0x00, 0xC5,  // Run of 5 pixels with color 1
    0x00, 0x00,  // End of line
  ])

  const result = decodeRLE(rleData, 4, 4)

  expect(result.width).toBe(4)
  expect(result.height).toBe(4)
  expect(result.data.length).toBe(16)
})

test('decodeRLE handles mixed colors', () => {
  // 2x2 bitmap with different colors
  const rleData = new Uint8Array([
    0x55,  // Four pixels: 01 01 01 01 (all color 1)
    0x00, 0x00,  // End of line
    0xAA,  // Four pixels: 10 10 10 10 (all color 2)
    0x00, 0x00,  // End of line
  ])

  const result = decodeRLE(rleData, 4, 2)

  expect(result.data[0]).toBe(1)
  expect(result.data[1]).toBe(1)
  expect(result.data[4]).toBe(2)
  expect(result.data[5]).toBe(2)
})

test('encodeRLE creates valid RLE data', () => {
  // Create a simple 4x4 bitmap
  const bitmap = new Uint8Array([
    1, 1, 1, 1,
    2, 2, 2, 2,
    0, 0, 0, 0,
    3, 3, 3, 3,
  ])

  const rleData = encodeRLE(bitmap, 4, 4)

  expect(rleData.length).toBeGreaterThan(0)

  // Decode to verify
  const decoded = decodeRLE(rleData, 4, 4)

  expect(decoded.data[0]).toBe(1)
  expect(decoded.data[4]).toBe(2)
  expect(decoded.data[8]).toBe(0)
  expect(decoded.data[12]).toBe(3)
})

test('encodeRLE and decodeRLE roundtrip', () => {
  const original = new Uint8Array([
    0, 1, 2, 3,
    3, 2, 1, 0,
    1, 1, 1, 1,
    2, 2, 2, 2,
  ])

  const encoded = encodeRLE(original, 4, 4)
  const decoded = decodeRLE(encoded, 4, 4)

  expect(decoded.data.length).toBe(original.length)
  for (let i = 0; i < original.length; i++) {
    expect(decoded.data[i]).toBe(original[i])
  }
})

test('decodeRLE handles long runs', () => {
  // Create RLE data for a long run of pixels
  const rleData = new Uint8Array([
    0x00, 0x85,  // Medium run of 8 pixels with color 1
    0x00, 0x00,  // End of line
  ])

  const result = decodeRLE(rleData, 8, 1)

  expect(result.data.length).toBe(8)
  for (let i = 0; i < 8; i++) {
    expect(result.data[i]).toBe(1)
  }
})
