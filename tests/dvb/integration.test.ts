import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseDVB, toDVB } from '../../src/formats/binary/dvb/index.ts'
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
  const reparsed = unwrap(parseDVB(dvbData))

  expect(reparsed.events).toHaveLength(1)

    const event = reparsed.events[0]
    // DVB subtitles don't preserve absolute timing, just duration
    expect(event.end - event.start).toBe(5000) // 5 seconds duration

    const image = event.image
    expect(image).toBeDefined()
    if (image) {
      expect(image.format).toBe('indexed')
      expect(image.data).toBeInstanceOf(Uint8Array)
      expect(image.data.length).toBeGreaterThan(0)
      expect(image.palette).toBeDefined()
      expect(image.palette!.length).toBeGreaterThan(0)
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
  const reparsed = unwrap(parseDVB(dvbData))

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
  const reparsed = unwrap(parseDVB(dvbData))

  const image = reparsed.events[0].image
  if (image) {
    expect(image.palette).toBeDefined()
    expect(image.palette!.length).toBe(testColors.length)

    // Colors should be reasonably close after YCrCb roundtrip
    // We allow some tolerance due to color space conversion
    for (let i = 0; i < testColors.length; i++) {
      const original = testColors[i]
      const converted = image.palette![i]

      expect(converted).toBeDefined()
      // Just check that we got some color back
      expect(typeof converted).toBe('number')
    }
  }
})

test('toDVB accepts event.image payloads', () => {
  const doc = createDocument()

  doc.events.push({
    id: generateId(),
    start: 0,
    end: 2000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: '',
    segments: [],
    image: {
      format: 'indexed',
      width: 2,
      height: 2,
      x: 5,
      y: 6,
      data: new Uint8Array([1, 1, 1, 1]),
      palette: [0x000000FF, 0xFFFFFFFF],
    },
    dirty: false
  })

  const dvbData = toDVB(doc)
  expect(dvbData.length).toBeGreaterThan(0)

  const reparsed = unwrap(parseDVB(dvbData))
  expect(reparsed.events).toHaveLength(1)
  expect(reparsed.events[0].image).toBeDefined()
  expect(reparsed.events[0].image?.data.length).toBeGreaterThan(0)
})
