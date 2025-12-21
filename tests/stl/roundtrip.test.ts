import { test, expect, describe } from 'bun:test'
import { parseEBUSTL } from '../../src/stl/ebu/parser.ts'
import { toEBUSTL } from '../../src/stl/ebu/serializer.ts'
import { parseSpruceSTL } from '../../src/stl/spruce/parser.ts'
import { toSpruceSTL } from '../../src/stl/spruce/serializer.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../src/core/document.ts'
import type { SubtitleEvent } from '../../src/core/types.ts'

describe('EBU-STL Roundtrip', () => {
  test('roundtrip simple subtitle', () => {
    const doc1 = createDocument()
    doc1.info.title = 'Test'

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
    doc1.events.push(event)

    const binary = toEBUSTL(doc1)
    const doc2 = parseEBUSTL(binary)

    expect(doc2.events.length).toBe(1)
    expect(doc2.events[0].text).toBe('Hello World')
    expect(doc2.events[0].start).toBe(1000)
    expect(doc2.events[0].end).toBe(5000)
  })

  test('roundtrip multiple subtitles', () => {
    const doc1 = createDocument()

    for (let i = 0; i < 5; i++) {
      const event: SubtitleEvent = {
        id: generateId(),
        start: i * 1000,
        end: (i + 1) * 1000,
        layer: 0,
        style: 'Default',
        actor: '',
        marginL: 0,
        marginR: 0,
        marginV: 0,
        effect: '',
        text: `Subtitle ${i + 1}`,
        segments: EMPTY_SEGMENTS,
        dirty: false
      }
      doc1.events.push(event)
    }

    const binary = toEBUSTL(doc1)
    const doc2 = parseEBUSTL(binary)

    expect(doc2.events.length).toBe(5)
    for (let i = 0; i < 5; i++) {
      expect(doc2.events[i].text).toBe(`Subtitle ${i + 1}`)
      expect(doc2.events[i].start).toBe(i * 1000)
    }
  })

  test('roundtrip with line breaks', () => {
    const doc1 = createDocument()

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
      text: 'Line 1\nLine 2\nLine 3',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
    doc1.events.push(event)

    const binary = toEBUSTL(doc1)
    const doc2 = parseEBUSTL(binary)

    expect(doc2.events.length).toBe(1)
    expect(doc2.events[0].text).toBe('Line 1\nLine 2\nLine 3')
  })
})

describe('Spruce STL Roundtrip', () => {
  test('roundtrip simple subtitle', () => {
    const doc1 = createDocument()

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
    doc1.events.push(event)

    const text = toSpruceSTL(doc1)
    const doc2 = parseSpruceSTL(text)

    expect(doc2.events.length).toBe(1)
    expect(doc2.events[0].text).toBe('Hello World')
    expect(doc2.events[0].start).toBe(1000)
    expect(doc2.events[0].end).toBe(5000)
  })

  test('roundtrip multiple subtitles', () => {
    const doc1 = createDocument()

    for (let i = 0; i < 5; i++) {
      const event: SubtitleEvent = {
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
        text: `Subtitle ${i + 1}`,
        segments: EMPTY_SEGMENTS,
        dirty: false
      }
      doc1.events.push(event)
    }

    const text = toSpruceSTL(doc1)
    const doc2 = parseSpruceSTL(text)

    expect(doc2.events.length).toBe(5)
    for (let i = 0; i < 5; i++) {
      expect(doc2.events[i].text).toBe(`Subtitle ${i + 1}`)
    }
  })

  test('roundtrip with special characters', () => {
    const doc1 = createDocument()

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
      text: 'Hello, World!',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
    doc1.events.push(event)

    const text = toSpruceSTL(doc1)
    const doc2 = parseSpruceSTL(text)

    expect(doc2.events.length).toBe(1)
    expect(doc2.events[0].text).toBe('Hello, World!')
  })
})
