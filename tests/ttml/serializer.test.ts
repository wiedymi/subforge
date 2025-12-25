import { test, expect, describe } from 'bun:test'
import { toTTML } from '../../src/formats/xml/ttml/serializer.ts'
import { createDocument } from '../../src/core/document.ts'
import type { SubtitleEvent, InlineStyle } from '../../src/core/types.ts'

describe('TTML Serializer', () => {
  test('serializes basic document', () => {
    const doc = createDocument()
    doc.events.push({
      id: 1,
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'First subtitle',
      segments: [{ text: 'First subtitle', style: null, effects: [] }],
      dirty: false
    })

    const ttml = toTTML(doc)
    expect(ttml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(ttml).toContain('<tt xmlns="http://www.w3.org/ns/ttml"')
    expect(ttml).toContain('<p begin="00:00:01.000" end="00:00:05.000">First subtitle</p>')
  })

  test('serializes clock time format', () => {
    const doc = createDocument()
    doc.events.push({
      id: 1,
      start: 3661000, // 01:01:01.000
      end: 3665000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Test',
      segments: [],
      dirty: false
    })

    const ttml = toTTML(doc, { format: 'clock' })
    expect(ttml).toContain('begin="01:01:01.000"')
    expect(ttml).toContain('end="01:01:05.000"')
  })

  test('serializes offset time format', () => {
    const doc = createDocument()
    doc.events.push({
      id: 1,
      start: 1500,
      end: 5500,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Test',
      segments: [],
      dirty: false
    })

    const ttml = toTTML(doc, { format: 'offset' })
    expect(ttml).toContain('begin="1.500s"')
    expect(ttml).toContain('end="5.500s"')
  })

  test('serializes styles', () => {
    const doc = createDocument()
    doc.styles.set('CustomStyle', {
      name: 'CustomStyle',
      fontName: 'Arial',
      fontSize: 24,
      primaryColor: 0xffffffff,
      secondaryColor: 0xff000000,
      outlineColor: 0xff000000,
      backColor: 0xff000000,
      bold: true,
      italic: true,
      underline: false,
      strikeout: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 0,
      shadow: 0,
      alignment: 2,
      marginL: 0,
      marginR: 0,
      marginV: 0,
      encoding: 1
    })

    doc.events.push({
      id: 1,
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'CustomStyle',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Test',
      segments: [],
      dirty: false
    })

    const ttml = toTTML(doc)
    expect(ttml).toContain('<styling>')
    expect(ttml).toContain('xml:id="CustomStyle"')
    expect(ttml).toContain('tts:fontFamily="Arial"')
    expect(ttml).toContain('tts:fontSize="24px"')
    expect(ttml).toContain('tts:fontWeight="bold"')
    expect(ttml).toContain('tts:fontStyle="italic"')
    expect(ttml).toContain('style="CustomStyle"')
  })

  test('serializes inline styling', () => {
    const doc = createDocument()

    const inlineStyle: InlineStyle = {
      fontName: 'Arial',
      italic: true
    }

    doc.events.push({
      id: 1,
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Normal italic text',
      segments: [
        { text: 'Normal ', style: null, effects: [] },
        { text: 'italic', style: inlineStyle, effects: [] },
        { text: ' text', style: null, effects: [] }
      ],
      dirty: false
    })

    const ttml = toTTML(doc)
    expect(ttml).toContain('<span')
    expect(ttml).toContain('tts:fontStyle="italic"')
    expect(ttml).toContain('>italic</span>')
  })

  test('serializes regions', () => {
    const doc = createDocument()
    doc.events.push({
      id: 1,
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: 'top',
      text: 'Top text',
      segments: [],
      dirty: false
    })

    const ttml = toTTML(doc)
    expect(ttml).toContain('<layout>')
    expect(ttml).toContain('xml:id="top"')
    expect(ttml).toContain('region="top"')
  })

  test('escapes XML entities', () => {
    const doc = createDocument()
    doc.events.push({
      id: 1,
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Text with <html> & "quotes"',
      segments: [{ text: 'Text with <html> & "quotes"', style: null, effects: [] }],
      dirty: false
    })

    const ttml = toTTML(doc)
    expect(ttml).toContain('&lt;html&gt;')
    expect(ttml).toContain('&amp;')
    expect(ttml).toContain('&quot;')
  })

  test('serializes colors correctly', () => {
    const doc = createDocument()
    doc.styles.set('ColorStyle', {
      name: 'ColorStyle',
      fontName: 'Arial',
      fontSize: 20,
      primaryColor: 0xff0000ff, // Red (ABGR format)
      secondaryColor: 0xff000000,
      outlineColor: 0xff000000,
      backColor: 0xff00ff00, // Green (ABGR format)
      bold: false,
      italic: false,
      underline: false,
      strikeout: false,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      outline: 0,
      shadow: 0,
      alignment: 2,
      marginL: 0,
      marginR: 0,
      marginV: 0,
      encoding: 1
    })

    doc.events.push({
      id: 1,
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'ColorStyle',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Test',
      segments: [],
      dirty: false
    })

    const ttml = toTTML(doc)
    expect(ttml).toContain('tts:color="#ff0000"')
    expect(ttml).toContain('tts:backgroundColor="#00ff00"')
  })

  test('serializes without head section', () => {
    const doc = createDocument()
    doc.events.push({
      id: 1,
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Test',
      segments: [],
      dirty: false
    })

    const ttml = toTTML(doc, { includeHead: false })
    expect(ttml).not.toContain('<head>')
    expect(ttml).toContain('<body>')
  })

  test('serializes without xmlns', () => {
    const doc = createDocument()
    doc.events.push({
      id: 1,
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'Test',
      segments: [],
      dirty: false
    })

    const ttml = toTTML(doc, { xmlns: false })
    expect(ttml).not.toContain('xmlns=')
    expect(ttml).toContain('<tt>')
  })

  test('serializes text decoration', () => {
    const doc = createDocument()

    const underlineStyle: InlineStyle = { underline: true }
    const strikeoutStyle: InlineStyle = { strikeout: true }

    doc.events.push({
      id: 1,
      start: 1000,
      end: 5000,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: 'underlined strikethrough',
      segments: [
        { text: 'underlined', style: underlineStyle, effects: [] },
        { text: ' ', style: null, effects: [] },
        { text: 'strikethrough', style: strikeoutStyle, effects: [] }
      ],
      dirty: false
    })

    const ttml = toTTML(doc)
    expect(ttml).toContain('tts:textDecoration="underline"')
    expect(ttml).toContain('tts:textDecoration="line-through"')
  })
})
