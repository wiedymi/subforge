import { test, expect } from 'bun:test'
import { parsePAC } from '../../src/formats/binary/pac/parser.ts'
import { toPAC } from '../../src/formats/binary/pac/serializer.ts'

test('roundtrip: simple subtitle', () => {
  const buffer = new Uint8Array(100)

  // Header
  buffer[0] = 0x01
  buffer[4] = 0x01  // PAL 25fps

  let pos = 24

  // Timecode in: 00:00:01:00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x01
  buffer[pos++] = 0x00

  // Timecode out: 00:00:05:00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x05
  buffer[pos++] = 0x00

  buffer[pos++] = 0x14  // Vertical position

  // Text
  const text = 'Hello world'
  buffer[pos++] = 0x00
  buffer[pos++] = text.length
  for (let i = 0; i < text.length; i++) {
    buffer[pos++] = text.charCodeAt(i)
  }

  const original = buffer.subarray(0, pos)
  const doc = parsePAC(original)
  const output = toPAC(doc, 25)

  // Parse both and compare
  const doc1 = parsePAC(original)
  const doc2 = parsePAC(output)

  expect(doc2.events).toHaveLength(doc1.events.length)
  expect(doc2.events[0]!.text).toBe(doc1.events[0]!.text)
  expect(doc2.events[0]!.start).toBe(doc1.events[0]!.start)
  expect(doc2.events[0]!.end).toBe(doc1.events[0]!.end)
})

test('roundtrip: multiple subtitles', () => {
  const buffer = new Uint8Array(200)

  buffer[0] = 0x01
  buffer[4] = 0x01

  let pos = 24

  // First subtitle
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x01
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x00
  buffer[pos++] = 0x10
  buffer[pos++] = 0x00
  buffer[pos++] = 0x05
  for (const c of 'First') {
    buffer[pos++] = c.charCodeAt(0)
  }

  // Second subtitle
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x03
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x04
  buffer[pos++] = 0x00
  buffer[pos++] = 0x20
  buffer[pos++] = 0x00
  buffer[pos++] = 0x06
  for (const c of 'Second') {
    buffer[pos++] = c.charCodeAt(0)
  }

  const original = buffer.subarray(0, pos)
  const doc = parsePAC(original)
  const output = toPAC(doc, 25)

  const doc1 = parsePAC(original)
  const doc2 = parsePAC(output)

  expect(doc2.events).toHaveLength(2)
  expect(doc2.events[0]!.text).toBe('First')
  expect(doc2.events[1]!.text).toBe('Second')
})

test('roundtrip: italic formatting', () => {
  const buffer = new Uint8Array(100)

  buffer[0] = 0x01
  buffer[4] = 0x01

  let pos = 24

  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x01
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x04  // Length: 4 bytes
  buffer[pos++] = 0x0A  // Italic on
  buffer[pos++] = 0x48  // 'H'
  buffer[pos++] = 0x69  // 'i'
  buffer[pos++] = 0x0B  // Italic off

  const original = buffer.subarray(0, pos)
  const doc = parsePAC(original)
  const output = toPAC(doc, 25)

  const doc1 = parsePAC(original)
  const doc2 = parsePAC(output)

  expect(doc2.events[0]!.text).toBe(doc1.events[0]!.text)
  expect(doc2.events[0]!.text).toContain('\\i1')
  expect(doc2.events[0]!.text).toContain('\\i0')
})

test('roundtrip: line breaks', () => {
  const buffer = new Uint8Array(100)

  buffer[0] = 0x01
  buffer[4] = 0x01

  let pos = 24

  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x01
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x03  // Length: 3 bytes
  buffer[pos++] = 0x48  // 'H'
  buffer[pos++] = 0x69  // 'i'
  buffer[pos++] = 0x0E  // Line break

  const original = buffer.subarray(0, pos)
  const doc = parsePAC(original)
  const output = toPAC(doc, 25)

  const doc1 = parsePAC(original)
  const doc2 = parsePAC(output)

  expect(doc2.events[0]!.text).toBe(doc1.events[0]!.text)
  expect(doc2.events[0]!.text).toContain('\\N')
})

test('roundtrip: NTSC frame rate', () => {
  const buffer = new Uint8Array(100)

  buffer[0] = 0x01
  buffer[4] = 0x02  // NTSC

  let pos = 24

  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x01
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x04
  buffer[pos++] = 0x54  // 'T'
  buffer[pos++] = 0x65  // 'e'
  buffer[pos++] = 0x73  // 's'
  buffer[pos++] = 0x74  // 't'

  const original = buffer.subarray(0, pos)
  const doc = parsePAC(original)
  const output = toPAC(doc, 29.97)

  const doc1 = parsePAC(original)
  const doc2 = parsePAC(output)

  expect(doc2.events[0]!.text).toBe('Test')
  expect(Math.abs(doc2.events[0]!.start - doc1.events[0]!.start)).toBeLessThan(50)
  expect(Math.abs(doc2.events[0]!.end - doc1.events[0]!.end)).toBeLessThan(50)
})
