import { test, expect, describe } from 'bun:test'
import { parsePGS, toPGS } from '../../src/pgs/index.ts'
import { createDocument, generateId } from '../../src/core/document.ts'
import type { ImageEffect, PGSEffect } from '../../src/core/types.ts'

describe('PGS Integration', () => {
  test('create PGS from scratch', () => {
    const doc = createDocument()

    // Create a simple 8x8 checkerboard pattern
    const size = 8
    const imageData = new Uint8Array(size * size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        imageData[y * size + x] = ((x + y) % 2 === 0) ? 0 : 1
      }
    }

    const palette = [
      0x000000FF, // Black
      0xFFFFFFFF, // White
    ]

    const imageEffect: ImageEffect = {
      type: 'image',
      params: {
        format: 'indexed',
        width: size,
        height: size,
        x: 540,
        y: 288,
        data: imageData,
        palette,
      },
    }

    const pgsEffect: PGSEffect = {
      type: 'pgs',
      params: {
        compositionNumber: 0,
        windowId: 0,
      },
    }

    doc.events.push({
      id: generateId(),
      start: 500,
      end: 2500,
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
        effects: [imageEffect, pgsEffect],
      }],
      dirty: false,
    })

    // Serialize to PGS
    const pgsData = toPGS(doc)
    expect(pgsData.length).toBeGreaterThan(100)

    // Parse back
    const parsed = parsePGS(pgsData)
    expect(parsed.events).toHaveLength(1)

    const event = parsed.events[0]
    expect(event.start).toBeCloseTo(500, 5)

    const parsedImage = event.segments[0].effects.find(e => e.type === 'image') as ImageEffect | undefined
    expect(parsedImage).toBeDefined()
    expect(parsedImage?.params.width).toBe(size)
    expect(parsedImage?.params.height).toBe(size)
    expect(parsedImage?.params.format).toBe('indexed')
    expect(parsedImage?.params.palette).toBeDefined()
    expect(parsedImage?.params.palette?.length).toBeGreaterThan(0)

    // Verify checkerboard pattern is preserved
    const parsedData = parsedImage!.params.data
    expect(parsedData[0]).toBe(0) // Top-left should be 0
    expect(parsedData[1]).toBe(1) // Next pixel should be 1
    expect(parsedData[size]).toBe(1) // Second row first pixel should be 1
  })

  test('parse PGS and verify timestamp conversion', () => {
    const doc = createDocument()

    const imageData = new Uint8Array(4 * 4)
    imageData.fill(1)

    const imageEffect: ImageEffect = {
      type: 'image',
      params: {
        format: 'indexed',
        width: 4,
        height: 4,
        data: imageData,
        palette: [0x00000000, 0xFFFFFFFF],
      },
    }

    const pgsEffect: PGSEffect = {
      type: 'pgs',
      params: {
        compositionNumber: 0,
        windowId: 0,
      },
    }

    // Test various timestamps
    const timestamps = [
      { start: 0, end: 1000 },      // 0ms
      { start: 1000, end: 2000 },   // 1s
      { start: 60000, end: 61000 }, // 1min
      { start: 90000, end: 91000 }, // 1.5min
    ]

    for (const ts of timestamps) {
      doc.events.push({
        id: generateId(),
        start: ts.start,
        end: ts.end,
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
          effects: [imageEffect, pgsEffect],
        }],
        dirty: false,
      })
    }

    const pgsData = toPGS(doc)
    const parsed = parsePGS(pgsData)

    expect(parsed.events).toHaveLength(timestamps.length)

    for (let i = 0; i < timestamps.length; i++) {
      expect(parsed.events[i].start).toBeCloseTo(timestamps[i].start, 5)
    }
  })

  test('handle empty palette', () => {
    const doc = createDocument()

    const imageData = new Uint8Array(2 * 2)
    imageData.fill(0)

    const imageEffect: ImageEffect = {
      type: 'image',
      params: {
        format: 'indexed',
        width: 2,
        height: 2,
        data: imageData,
        palette: [], // Empty palette
      },
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
        effects: [imageEffect],
      }],
      dirty: false,
    })

    const pgsData = toPGS(doc)
    const parsed = parsePGS(pgsData)

    expect(parsed.events).toHaveLength(1)
  })
})
