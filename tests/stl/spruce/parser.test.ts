import { test, expect, describe } from 'bun:test'
import { parseSpruceSTL, parseSpruceSTLResult } from '../../../src/formats/binary/stl/spruce/parser.ts'

describe('Spruce STL Parser', () => {
  test('parse single subtitle', () => {
    const input = '00:00:01:00 , 00:00:05:00 , Hello World\n'
    const doc = parseSpruceSTL(input)

    expect(doc.events.length).toBe(1)
    expect(doc.events[0].text).toBe('Hello World')
    expect(doc.events[0].start).toBe(1000)
    expect(doc.events[0].end).toBe(5000)
  })

  test('parse multiple subtitles', () => {
    const input = `00:00:01:00 , 00:00:03:00 , First subtitle
00:00:05:00 , 00:00:08:00 , Second subtitle
00:00:10:00 , 00:00:15:00 , Third subtitle
`
    const doc = parseSpruceSTL(input)

    expect(doc.events.length).toBe(3)
    expect(doc.events[0].text).toBe('First subtitle')
    expect(doc.events[1].text).toBe('Second subtitle')
    expect(doc.events[2].text).toBe('Third subtitle')
  })

  test('parse with different timecodes', () => {
    const input = '01:23:45:12 , 01:23:50:20 , Test\n'
    const doc = parseSpruceSTL(input)

    expect(doc.events.length).toBe(1)
    const expectedStart = (1 * 3600 + 23 * 60 + 45) * 1000 + Math.floor(12 * 40)
    const expectedEnd = (1 * 3600 + 23 * 60 + 50) * 1000 + Math.floor(20 * 40)
    expect(doc.events[0].start).toBe(expectedStart)
    expect(doc.events[0].end).toBe(expectedEnd)
  })

  test('parse with text containing commas', () => {
    const input = '00:00:01:00 , 00:00:05:00 , Hello, World, Test\n'
    const doc = parseSpruceSTL(input)

    expect(doc.events.length).toBe(1)
    expect(doc.events[0].text).toBe('Hello, World, Test')
  })

  test('skip empty lines', () => {
    const input = `00:00:01:00 , 00:00:03:00 , First

00:00:05:00 , 00:00:08:00 , Second

`
    const doc = parseSpruceSTL(input)

    expect(doc.events.length).toBe(2)
    expect(doc.events[0].text).toBe('First')
    expect(doc.events[1].text).toBe('Second')
  })

  test('handle BOM', () => {
    const input = '\uFEFF00:00:01:00 , 00:00:05:00 , Test\n'
    const doc = parseSpruceSTL(input)

    expect(doc.events.length).toBe(1)
    expect(doc.events[0].text).toBe('Test')
  })

  test('handle invalid format', () => {
    const input = 'This is not a valid STL file\n'
    const result = parseSpruceSTLResult(input, { onError: 'collect' })

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].code).toBe('INVALID_FORMAT')
  })

  test('handle invalid timecode', () => {
    const input = 'XX:XX:XX:XX , 00:00:05:00 , Test\n'
    const result = parseSpruceSTLResult(input, { onError: 'collect' })

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].code).toBe('INVALID_TIMESTAMP')
  })

  test('parse with whitespace variations', () => {
    const input = '00:00:01:00,00:00:05:00,Test\n' // No spaces around commas
    const doc = parseSpruceSTL(input)

    expect(doc.events.length).toBe(1)
    expect(doc.events[0].text).toBe('Test')
  })
})
