import { test, expect, describe } from 'bun:test'
import { toSpruceSTL } from '../../../src/formats/binary/stl/spruce/serializer.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../src/core/document.ts'
import type { SubtitleEvent } from '../../../src/core/types.ts'

describe('Spruce STL Serializer', () => {
  test('serialize single subtitle', () => {
    const doc = createDocument()

    const event: SubtitleEvent = {
      id: generateId(),
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Hello World',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
    doc.events.push(event)

    const output = toSpruceSTL(doc)

    expect(output).toBe('00:00:01:00 , 00:00:05:00 , Hello World\n')
  })

  test('serialize multiple subtitles', () => {
    const doc = createDocument()

    const events = [
      { start: 1000, end: 3000, text: 'First' },
      { start: 5000, end: 8000, text: 'Second' },
      { start: 10000, end: 15000, text: 'Third' }
    ]

    for (const e of events) {
      const event: SubtitleEvent = {
        id: generateId(),
        start: e.start,
        end: e.end,
        layer: 0,
        style: 'Default',
        actor: '',
        marginL: 0,
        marginR: 0,
        marginV: 0,
        effect: '',
        text: e.text,
        segments: EMPTY_SEGMENTS,
        dirty: false
      }
      doc.events.push(event)
    }

    const output = toSpruceSTL(doc)

    expect(output).toContain('00:00:01:00 , 00:00:03:00 , First')
    expect(output).toContain('00:00:05:00 , 00:00:08:00 , Second')
    expect(output).toContain('00:00:10:00 , 00:00:15:00 , Third')
  })

  test('serialize with newlines converted to spaces', () => {
    const doc = createDocument()

    const event: SubtitleEvent = {
      id: generateId(),
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Line 1\nLine 2',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
    doc.events.push(event)

    const output = toSpruceSTL(doc)

    expect(output).toBe('00:00:01:00 , 00:00:05:00 , Line 1 Line 2\n')
  })

  test('serialize with custom frame rate', () => {
    const doc = createDocument()

    const event: SubtitleEvent = {
      id: generateId(),
      start: 1000,
      end: 2000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Test',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
    doc.events.push(event)

    const output = toSpruceSTL(doc, { frameRate: 30 })

    expect(output).toContain('00:00:01:00 , 00:00:02:00')
  })

  test('serialize empty document', () => {
    const doc = createDocument()
    const output = toSpruceSTL(doc)

    expect(output).toBe('\n')
  })

  test('serialize with large timecode', () => {
    const doc = createDocument()

    const event: SubtitleEvent = {
      id: generateId(),
      start: (1 * 3600 + 23 * 60 + 45) * 1000 + 480, // 01:23:45 + 12 frames @ 25fps
      end: (1 * 3600 + 23 * 60 + 50) * 1000 + 800,   // 01:23:50 + 20 frames @ 25fps
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Test',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
    doc.events.push(event)

    const output = toSpruceSTL(doc)

    expect(output).toContain('01:23:45:12')
    expect(output).toContain('01:23:50:20')
  })
})
