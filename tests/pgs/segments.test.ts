import { test, expect, describe } from 'bun:test'
import {
  parseSegmentHeader,
  parsePaletteSegment,
  parseObjectSegment,
  parseCompositionSegment,
  parseWindowSegment,
  decompressRLE,
  compressRLE,
  ycbcrToRgba,
  rgbaToYcbcr,
  buildPalette,
  SegmentType,
} from '../../src/pgs/segments.ts'

describe('PGS Segments', () => {
  test('parseSegmentHeader - valid header', () => {
    const data = new Uint8Array([
      0x50, 0x47, // Magic "PG"
      0x00, 0x00, 0x0E, 0x10, // PTS
      0x00, 0x00, 0x0E, 0x10, // DTS
      0x16, // Type (PCS)
      0x00, 0x13, // Size
    ])
    const view = new DataView(data.buffer)
    const header = parseSegmentHeader(view, 0)

    expect(header).not.toBeNull()
    expect(header?.pts).toBe(3600)
    expect(header?.dts).toBe(3600)
    expect(header?.type).toBe(SegmentType.PCS)
    expect(header?.size).toBe(19)
  })

  test('parseSegmentHeader - invalid magic', () => {
    const data = new Uint8Array([0x50, 0x48, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00])
    const view = new DataView(data.buffer)
    const header = parseSegmentHeader(view, 0)

    expect(header).toBeNull()
  })

  test('parsePaletteSegment - single entry', () => {
    const data = new Uint8Array([
      0x00, // Palette ID
      0x00, // Version
      0x01, 0xEB, 0x80, 0x80, 0xFF, // Entry: id=1, Y=235, Cr=128, Cb=128, A=255
    ])
    const view = new DataView(data.buffer)
    const palette = parsePaletteSegment(view, 0, data.length)

    expect(palette).not.toBeNull()
    expect(palette?.paletteId).toBe(0)
    expect(palette?.version).toBe(0)
    expect(palette?.entries).toHaveLength(1)
    expect(palette?.entries[0]).toEqual({
      id: 1,
      y: 235,
      cr: 128,
      cb: 128,
      alpha: 255,
    })
  })

  test('parseObjectSegment - first in sequence', () => {
    const imageData = new Uint8Array([0xFF, 0x00, 0x00])
    const data = new Uint8Array([
      0x00, 0x01, // Object ID
      0x00, // Version
      0xC0, // Flags (first and last)
      0x00, 0x00, 0x07, // Data length (24-bit)
      0x00, 0x10, // Width
      0x00, 0x08, // Height
      ...imageData,
    ])
    const view = new DataView(data.buffer)
    const obj = parseObjectSegment(view, 0, data.length)

    expect(obj).not.toBeNull()
    expect(obj?.objectId).toBe(1)
    expect(obj?.version).toBe(0)
    expect(obj?.firstInSequence).toBe(true)
    expect(obj?.lastInSequence).toBe(true)
    expect(obj?.width).toBe(16)
    expect(obj?.height).toBe(8)
    expect(obj?.data).toEqual(imageData)
  })

  test('parseCompositionSegment - basic', () => {
    const data = new Uint8Array([
      0x04, 0x38, // Width (1080)
      0x02, 0x40, // Height (576)
      0x10, // Frame rate
      0x00, 0x01, // Composition number
      0x80, // Composition state
      0x00, // Palette update flag
      0x00, // Palette ID
      0x01, // Object count
      0x00, 0x00, // Object ID
      0x00, // Window ID
      0x00, // Flags
      0x01, 0x00, // X
      0x00, 0x50, // Y
    ])
    const view = new DataView(data.buffer)
    const comp = parseCompositionSegment(view, 0, data.length)

    expect(comp).not.toBeNull()
    expect(comp?.width).toBe(1080)
    expect(comp?.height).toBe(576)
    expect(comp?.compositionNumber).toBe(1)
    expect(comp?.objects).toHaveLength(1)
    expect(comp?.objects[0]?.x).toBe(256)
    expect(comp?.objects[0]?.y).toBe(80)
  })

  test('parseWindowSegment - basic', () => {
    const data = new Uint8Array([
      0x01, // Window count
      0x00, // Window ID
      0x00, 0x00, // X
      0x00, 0x00, // Y
      0x04, 0x38, // Width
      0x02, 0x40, // Height
    ])
    const view = new DataView(data.buffer)
    const window = parseWindowSegment(view, 0, data.length)

    expect(window).not.toBeNull()
    expect(window?.windowId).toBe(0)
    expect(window?.x).toBe(0)
    expect(window?.y).toBe(0)
    expect(window?.width).toBe(1080)
    expect(window?.height).toBe(576)
  })

  test('decompressRLE - simple run', () => {
    // Run of 3 pixels with color 1
    const compressed = new Uint8Array([0x01, 0x01, 0x01, 0x00, 0x00])
    const result = decompressRLE(compressed, 3, 1)

    expect(result).toEqual(new Uint8Array([1, 1, 1]))
  })

  test('decompressRLE - transparent run', () => {
    // Run of 4 transparent pixels
    const compressed = new Uint8Array([0x00, 0x04, 0x00, 0x00])
    const result = decompressRLE(compressed, 4, 1)

    expect(result).toEqual(new Uint8Array([0, 0, 0, 0]))
  })

  test('compressRLE - simple run', () => {
    const data = new Uint8Array([1, 1, 1])
    const result = compressRLE(data, 3)

    // Should be: 0, 0x40|0, 3, 1, 0, 0 (end of line)
    expect(result.length).toBeGreaterThan(0)
  })

  test('compressRLE - transparent run', () => {
    const data = new Uint8Array([0, 0, 0, 0])
    const result = compressRLE(data, 4)

    // Should be: 0, 4, 0, 0 (end of line)
    expect(result.length).toBeGreaterThan(0)
  })

  test('ycbcrToRgba - white', () => {
    const rgba = ycbcrToRgba(235, 128, 128, 255)
    const r = (rgba >>> 24) & 0xFF
    const g = (rgba >>> 16) & 0xFF
    const b = (rgba >>> 8) & 0xFF
    const a = rgba & 0xFF

    expect(r).toBeCloseTo(235, 5)
    expect(g).toBeCloseTo(235, 5)
    expect(b).toBeCloseTo(235, 5)
    expect(a).toBe(255)
  })

  test('ycbcrToRgba - black', () => {
    const rgba = ycbcrToRgba(16, 128, 128, 255)
    const r = (rgba >>> 24) & 0xFF
    const g = (rgba >>> 16) & 0xFF
    const b = (rgba >>> 8) & 0xFF
    const a = rgba & 0xFF

    expect(r).toBeCloseTo(16, 5)
    expect(g).toBeCloseTo(16, 5)
    expect(b).toBeCloseTo(16, 5)
    expect(a).toBe(255)
  })

  test('rgbaToYcbcr - white', () => {
    const rgba = (255 << 24) | (255 << 16) | (255 << 8) | 255
    const ycbcr = rgbaToYcbcr(rgba)

    expect(ycbcr.y).toBeCloseTo(255, 5)
    expect(ycbcr.cb).toBeCloseTo(128, 10)
    expect(ycbcr.cr).toBeCloseTo(128, 10)
    expect(ycbcr.alpha).toBe(255)
  })

  test('rgbaToYcbcr - black', () => {
    const rgba = (0 << 24) | (0 << 16) | (0 << 8) | 255
    const ycbcr = rgbaToYcbcr(rgba)

    expect(ycbcr.y).toBeCloseTo(0, 5)
    expect(ycbcr.cb).toBeCloseTo(128, 10)
    expect(ycbcr.cr).toBeCloseTo(128, 10)
    expect(ycbcr.alpha).toBe(255)
  })

  test('buildPalette - basic', () => {
    const entries = [
      { id: 0, y: 16, cr: 128, cb: 128, alpha: 255 },
      { id: 1, y: 235, cr: 128, cb: 128, alpha: 255 },
    ]
    const palette = buildPalette(entries)

    expect(palette).toHaveLength(256)
    expect(palette[0]).toBeDefined()
    expect(palette[1]).toBeDefined()
  })
})
