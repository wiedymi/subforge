import { test, expect, describe } from 'bun:test'
import { parseASS } from '../../src/ass/parser.ts'
import { toASS } from '../../src/ass/serializer.ts'

const railgunOP = await Bun.file('./tests/fixtures/ass/railgun_op.ass').text()
const aot3p2OP = await Bun.file('./tests/fixtures/ass/aot3p2_op.ass').text()

describe('real file: railgun_op.ass', () => {
  const doc = parseASS(railgunOP)

  test('parses script info', () => {
    expect(doc.info.title).toBe('Default Aegisub file')
    expect(doc.info.playResX).toBe(1280)
    expect(doc.info.playResY).toBe(720)
    expect(doc.info.wrapStyle).toBe(0)
    expect(doc.info.scaleBorderAndShadow).toBe(true)
  })

  test('parses multiple styles', () => {
    expect(doc.styles.size).toBeGreaterThan(1)
    expect(doc.styles.has('Default')).toBe(true)
    expect(doc.styles.has('OPRomaji')).toBe(true)
    expect(doc.styles.has('OPRomaji 2')).toBe(true)
    expect(doc.styles.has('OPTL')).toBe(true)
  })

  test('parses style properties correctly', () => {
    const style = doc.styles.get('Default')!
    expect(style.fontName).toBe('Source Sans Pro Semibold')
    expect(style.fontSize).toBe(56)
    expect(style.bold).toBe(true)
    expect(style.alignment).toBe(2)
  })

  test('parses events', () => {
    expect(doc.events.length).toBeGreaterThan(100)
  })

  test('parses events with complex tags', () => {
    const eventsWithTags = doc.events.filter(e => e.text.includes('\\'))
    expect(eventsWithTags.length).toBeGreaterThan(0)
  })

  test('parses events with drawing commands', () => {
    const drawingEvents = doc.events.filter(e => e.text.includes('\\p1}'))
    expect(drawingEvents.length).toBeGreaterThan(0)
  })

  test('parses events with move/pos tags', () => {
    const moveEvents = doc.events.filter(e => e.text.includes('\\move(') || e.text.includes('\\pos('))
    expect(moveEvents.length).toBeGreaterThan(0)
  })

  test('parses events with transforms', () => {
    const transformEvents = doc.events.filter(e => e.text.includes('\\t('))
    expect(transformEvents.length).toBeGreaterThan(0)
  })

  test('parses high layer numbers', () => {
    const highLayerEvents = doc.events.filter(e => e.layer >= 10)
    expect(highLayerEvents.length).toBeGreaterThan(0)
  })

  test('preserves text with commas in dialogue', () => {
    const commaEvents = doc.events.filter(e => e.text.includes(','))
    expect(commaEvents.length).toBeGreaterThan(0)
    for (const event of commaEvents) {
      expect(event.text).toBeTruthy()
    }
  })

  test('roundtrip serialization preserves event count', () => {
    const serialized = toASS(doc)
    const reparsed = parseASS(serialized)
    expect(reparsed.events.length).toBe(doc.events.length)
  })
})

describe('real file: aot3p2_op.ass', () => {
  const doc = parseASS(aot3p2OP)

  test('parses large file', () => {
    expect(doc.events.length).toBeGreaterThan(1000)
  })

  test('parses script info', () => {
    expect(doc.info.playResX).toBeGreaterThan(0)
    expect(doc.info.playResY).toBeGreaterThan(0)
  })

  test('parses styles', () => {
    expect(doc.styles.size).toBeGreaterThan(0)
  })

  test('all events have valid timestamps', () => {
    for (const event of doc.events) {
      expect(event.start).toBeGreaterThanOrEqual(0)
      expect(event.end).toBeGreaterThanOrEqual(event.start)
    }
  })

  test('all events have valid layers', () => {
    for (const event of doc.events) {
      expect(event.layer).toBeGreaterThanOrEqual(0)
    }
  })

  test('roundtrip serialization preserves event count', () => {
    const serialized = toASS(doc)
    const reparsed = parseASS(serialized)
    expect(reparsed.events.length).toBe(doc.events.length)
  })
})

describe('stress test', () => {
  test('parses 10k events from generated content', () => {
    const lines = [
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ]
    for (let i = 0; i < 10000; i++) {
      lines.push(`Dialogue: 0,0:00:${String(i % 60).padStart(2, '0')}.00,0:00:${String((i % 60) + 1).padStart(2, '0')}.00,Default,,0,0,0,,Line ${i}`)
    }
    const ass = lines.join('\n')

    const doc = parseASS(ass)
    expect(doc.events.length).toBe(10000)
  })

  test('parses events with very long text', () => {
    const longText = 'A'.repeat(10000)
    const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,${longText}`

    const doc = parseASS(ass)
    expect(doc.events[0]!.text).toBe(longText)
  })

  test('parses events with many commas in text', () => {
    const commaText = Array(100).fill('a').join(',')
    const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,${commaText}`

    const doc = parseASS(ass)
    expect(doc.events[0]!.text).toBe(commaText)
  })
})
