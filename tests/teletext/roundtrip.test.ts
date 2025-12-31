import { test, expect, describe } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseTeletext, toTeletext } from '../../src/formats/broadcast/teletext/index.ts'
import { createDocument } from '../../src/core/document.ts'

describe('Teletext Roundtrip', () => {
  test('roundtrip simple subtitle', () => {
    const doc = createDocument()

    doc.events.push({
      id: 1,
      start: 0,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Hello World',
      segments: [],
      dirty: false
    })

    const encoded = toTeletext(doc)
    expect(encoded).toBeInstanceOf(Uint8Array)
    expect(encoded.length).toBeGreaterThan(0)

    // Parse back
    const parsed = unwrap(parseTeletext(encoded))
    expect(parsed.events.length).toBeGreaterThan(0)
  })

  test('roundtrip multiple line subtitle', () => {
    const doc = createDocument()

    doc.events.push({
      id: 1,
      start: 0,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'First line\nSecond line\nThird line',
      segments: [],
      dirty: false
    })

    const encoded = toTeletext(doc)
    expect(encoded).toBeInstanceOf(Uint8Array)

    const parsed = unwrap(parseTeletext(encoded))
    expect(parsed.events.length).toBeGreaterThan(0)
    if (parsed.events.length > 0) {
      expect(parsed.events[0].text).toBeDefined()
    }
  })

  test('roundtrip preserves packet structure', () => {
    const doc = createDocument()

    doc.events.push({
      id: 1,
      start: 1000,
      end: 6000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Test subtitle',
      segments: [],
      dirty: false
    })

    const encoded = toTeletext(doc)

    // Check packet size (45 bytes per packet)
    expect(encoded.length % 45).toBe(0)

    const parsed = unwrap(parseTeletext(encoded))
    expect(parsed).toBeDefined()
  })

  test('handles empty document', () => {
    const doc = createDocument()

    const encoded = toTeletext(doc)
    expect(encoded).toBeInstanceOf(Uint8Array)

    const parsed = unwrap(parseTeletext(encoded))
    expect(parsed.events).toHaveLength(0)
  })

  test('handles long text truncation', () => {
    const doc = createDocument()

    const longText = 'A'.repeat(100)
    doc.events.push({
      id: 1,
      start: 0,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: longText,
      segments: [],
      dirty: false
    })

    const encoded = toTeletext(doc)
    expect(encoded).toBeInstanceOf(Uint8Array)

    const parsed = unwrap(parseTeletext(encoded))
    expect(parsed.events.length).toBeGreaterThan(0)
  })
})
