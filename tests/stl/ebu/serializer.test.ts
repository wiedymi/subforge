import { test, expect, describe } from 'bun:test'
import { toEBUSTL } from '../../../src/formats/binary/stl/ebu/serializer.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../../src/core/document.ts'
import type { SubtitleEvent } from '../../../src/core/types.ts'

describe('EBU-STL Serializer', () => {
  test('serialize minimal subtitle', () => {
    const doc = createDocument()
    doc.info.title = 'Test Subtitle'

    const event: SubtitleEvent = {
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
      text: 'Hello World',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
    doc.events.push(event)

    const data = toEBUSTL(doc)

    expect(data.length).toBeGreaterThanOrEqual(1024 + 128)

    // Check GSI block
    const cpn = new TextDecoder().decode(data.slice(0, 3))
    expect(cpn).toBe('437')

    const dfc = new TextDecoder().decode(data.slice(3, 11))
    expect(dfc).toBe('STL25.01')

    // Check title
    const title = new TextDecoder().decode(data.slice(16, 48)).trim()
    expect(title).toContain('Test Subtitle')

    // Check TNB (Total Number of TTI blocks)
    const tnb = new TextDecoder().decode(data.slice(238, 243))
    expect(tnb).toBe('00001')

    // Check TTI block
    const ttiOffset = 1024

    // Check subtitle number
    const sn = (data[ttiOffset + 1] << 8) | data[ttiOffset + 2]
    expect(sn).toBe(1)

    // Check text field
    const textField = new TextDecoder().decode(data.slice(ttiOffset + 16, ttiOffset + 128))
    expect(textField).toContain('Hello World')
  })

  test('serialize multiple subtitles', () => {
    const doc = createDocument()

    for (let i = 0; i < 3; i++) {
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
      doc.events.push(event)
    }

    const data = toEBUSTL(doc)

    expect(data.length).toBe(1024 + 128 * 3)

    // Check TNB
    const tnb = new TextDecoder().decode(data.slice(238, 243))
    expect(tnb).toBe('00003')

    // Check TNS
    const tns = new TextDecoder().decode(data.slice(243, 248))
    expect(tns).toBe('00003')
  })

  test('serialize with line breaks', () => {
    const doc = createDocument()

    const event: SubtitleEvent = {
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
      text: 'Line 1\nLine 2',
      segments: EMPTY_SEGMENTS,
      dirty: false
    }
    doc.events.push(event)

    const data = toEBUSTL(doc)

    const ttiOffset = 1024
    const textField = data.slice(ttiOffset + 16, ttiOffset + 128)

    // Should contain 0x8a (line break control code)
    expect(textField).toContain(0x8a)
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

    const data = toEBUSTL(doc, { frameRate: 30 })

    const dfc = new TextDecoder().decode(data.slice(3, 11))
    expect(dfc).toBe('STL30.01')
  })

  test('serialize empty document', () => {
    const doc = createDocument()
    const data = toEBUSTL(doc)

    expect(data.length).toBe(1024)

    const tnb = new TextDecoder().decode(data.slice(238, 243))
    expect(tnb).toBe('00000')
  })
})
