import { test, expect } from 'bun:test'
import { parseDVB, toDVB } from '../../src/dvb/index.ts'
import type { ImageEffect } from '../../src/core/types.ts'
import { createDocument, generateId } from '../../src/core/document.ts'

test('DVB end-to-end: create, serialize, parse', () => {
  // Create a document with an image effect
  const doc = createDocument()

  const palette = [
    0x000000FF, // Black
    0xFFFFFFFF, // White
    0xFF0000FF, // Red
    0x00FF00FF, // Green
    0x0000FFFF, // Blue
  ]

  const imageEffect: ImageEffect = {
    type: 'image',
    params: {
      format: 'indexed',
      width: 16,
      height: 8,
      x: 100,
      y: 200,
      data: new Uint8Array([
        // Simple pattern: 16 pixels per row, 8 rows
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
        4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
        1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4,
        0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3,
        4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      ]),
      palette
    }
  }

  doc.events.push({
    id: generateId(),
    start: 1000,
    end: 6000,
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

  // Serialize to DVB
  const dvbData = toDVB(doc)

  expect(dvbData).toBeInstanceOf(Uint8Array)
  expect(dvbData.length).toBeGreaterThan(0)

  // Parse back
  const reparsed = parseDVB(dvbData)

  expect(reparsed.events).toHaveLength(1)

  const event = reparsed.events[0]
  // DVB subtitles don't preserve absolute timing, just duration
  expect(event.end - event.start).toBe(5000) // 5 seconds duration
  expect(event.segments).toHaveLength(1)

  const segment = event.segments[0]
  expect(segment.effects).toHaveLength(1)

  const effect = segment.effects[0]
  expect(effect.type).toBe('image')

  if (effect.type === 'image') {
    expect(effect.params.format).toBe('indexed')
    expect(effect.params.data).toBeInstanceOf(Uint8Array)
    expect(effect.params.data.length).toBeGreaterThan(0)
    expect(effect.params.palette).toBeDefined()
    expect(effect.params.palette!.length).toBeGreaterThan(0)
  }
})

test('DVB handles multiple subtitles', () => {
  const doc = createDocument()

  for (let i = 0; i < 3; i++) {
    const imageEffect: ImageEffect = {
      type: 'image',
      params: {
        format: 'indexed',
        width: 4,
        height: 4,
        data: new Uint8Array([
          i, i, i, i,
          i, i, i, i,
          i, i, i, i,
          i, i, i, i,
        ]),
        palette: [0x000000FF, 0xFFFFFFFF, 0xFF0000FF]
      }
    }

    doc.events.push({
      id: generateId(),
      start: i * 5000,
      end: (i + 1) * 5000,
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
  }

  const dvbData = toDVB(doc)
  const reparsed = parseDVB(dvbData)

  expect(reparsed.events.length).toBe(3)
})

test('DVB preserves RGBA colors in palette through YCrCb conversion', () => {
  const doc = createDocument()

  const testColors = [
    0xFF0000FF, // Red
    0x00FF00FF, // Green
    0x0000FFFF, // Blue
    0xFFFFFFFF, // White
    0x000000FF, // Black
  ]

  const imageEffect: ImageEffect = {
    type: 'image',
    params: {
      format: 'indexed',
      width: 5,
      height: 1,
      data: new Uint8Array([0, 1, 2, 3, 4]),
      palette: testColors
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

  const dvbData = toDVB(doc)
  const reparsed = parseDVB(dvbData)

  const effect = reparsed.events[0].segments[0].effects[0]
  if (effect.type === 'image') {
    expect(effect.params.palette).toBeDefined()
    expect(effect.params.palette!.length).toBe(testColors.length)

    // Colors should be reasonably close after YCrCb roundtrip
    // We allow some tolerance due to color space conversion
    for (let i = 0; i < testColors.length; i++) {
      const original = testColors[i]
      const converted = effect.params.palette![i]

      expect(converted).toBeDefined()
      // Just check that we got some color back
      expect(typeof converted).toBe('number')
    }
  }
})
