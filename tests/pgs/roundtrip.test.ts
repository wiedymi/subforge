import { test, expect, describe } from 'bun:test'
import { parsePGS } from '../../src/formats/binary/pgs/parser.ts'
import { toPGS } from '../../src/formats/binary/pgs/serializer.ts'
import { createDocument, generateId } from '../../src/core/document.ts'
import type { SubtitleDocument, ImageEffect, PGSEffect } from '../../src/core/types.ts'

describe('PGS Roundtrip', () => {
  test('roundtrip - basic subtitle', () => {
    // Create a document with image subtitle
    const doc: SubtitleDocument = createDocument()

    const imageData = new Uint8Array(32 * 16) // 32x16 pixels
    for (let i = 0; i < imageData.length; i++) {
      imageData[i] = i % 2 // Alternating colors
    }

    const palette = [
      0x000000FF, // 0: transparent black
      0xFFFFFFFF, // 1: white
    ]

    const imageEffect: ImageEffect = {
      type: 'image',
      params: {
        format: 'indexed',
        width: 32,
        height: 16,
        x: 100,
        y: 50,
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
      start: 1000,
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
        effects: [imageEffect, pgsEffect],
      }],
      dirty: false,
    })

    // Serialize to PGS
    const pgsData = toPGS(doc)

    // Check that we got valid PGS data
    expect(pgsData.length).toBeGreaterThan(0)
    expect(pgsData[0]).toBe(0x50) // 'P'
    expect(pgsData[1]).toBe(0x47) // 'G'

    // Parse back
    const parsed = parsePGS(pgsData)

    expect(parsed.events).toHaveLength(1)
    expect(parsed.events[0].start).toBeCloseTo(1000, 5)

    const parsedImage = parsed.events[0].segments[0].effects.find(e => e.type === 'image') as ImageEffect | undefined
    expect(parsedImage).toBeDefined()
    expect(parsedImage?.params.width).toBe(32)
    expect(parsedImage?.params.height).toBe(16)
    expect(parsedImage?.params.x).toBe(100)
    expect(parsedImage?.params.y).toBe(50)
  })

  test('roundtrip - multiple subtitles', () => {
    const doc: SubtitleDocument = createDocument()

    for (let i = 0; i < 3; i++) {
      const imageData = new Uint8Array(16 * 16)
      imageData.fill(1) // All white

      const palette = [
        0x00000000, // transparent
        0xFFFFFFFF, // white
      ]

      const imageEffect: ImageEffect = {
        type: 'image',
        params: {
          format: 'indexed',
          width: 16,
          height: 16,
          x: i * 100,
          y: 100,
          data: imageData,
          palette,
        },
      }

      const pgsEffect: PGSEffect = {
        type: 'pgs',
        params: {
          compositionNumber: i,
          windowId: 0,
        },
      }

      doc.events.push({
        id: generateId(),
        start: i * 2000,
        end: (i + 1) * 2000,
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

    expect(parsed.events).toHaveLength(3)
    expect(parsed.events[0].start).toBeCloseTo(0, 5)
    expect(parsed.events[1].start).toBeCloseTo(2000, 5)
    expect(parsed.events[2].start).toBeCloseTo(4000, 5)
  })

  test('roundtrip - empty document', () => {
    const doc = createDocument()
    const pgsData = toPGS(doc)

    expect(pgsData.length).toBe(0)

    const parsed = parsePGS(pgsData)
    expect(parsed.events).toHaveLength(0)
  })
})
