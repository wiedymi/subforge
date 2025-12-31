import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parsePAC } from '../../src/formats/binary/pac/parser.ts'

// Helper to create a simple PAC file in memory
function createSimplePAC(): Uint8Array {
  const buffer = new Uint8Array(100)
  const view = new DataView(buffer.buffer)

  // Header (24 bytes)
  buffer[0] = 0x01  // Format code
  buffer[4] = 0x01  // PAL 25fps

  // First subtitle block
  let pos = 24

  // Timecode in: 00:00:01:00 (25 frames = 1 second at 25fps)
  buffer[pos++] = 0x00  // Hours (BCD)
  buffer[pos++] = 0x00  // Minutes (BCD)
  buffer[pos++] = 0x01  // Seconds (BCD)
  buffer[pos++] = 0x00  // Frames (BCD)

  // Timecode out: 00:00:05:00 (125 frames = 5 seconds at 25fps)
  buffer[pos++] = 0x00  // Hours (BCD)
  buffer[pos++] = 0x00  // Minutes (BCD)
  buffer[pos++] = 0x05  // Seconds (BCD)
  buffer[pos++] = 0x00  // Frames (BCD)

  // Vertical position
  buffer[pos++] = 0x14  // 20

  // Text: "Hello world"
  const text = 'Hello world'
  view.setUint16(pos, text.length, false)  // Big-endian length
  pos += 2

  for (let i = 0; i < text.length; i++) {
    buffer[pos++] = text.charCodeAt(i)
  }

  return buffer.subarray(0, pos)
}

test('parsePAC parses header', () => {
  const data = createSimplePAC()
  const doc = unwrap(parsePAC(data))
  expect(doc).toBeDefined()
  expect(doc.events).toBeDefined()
})

test('parsePAC parses simple subtitle', () => {
  const data = createSimplePAC()
  const doc = unwrap(parsePAC(data))

  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.text).toBe('Hello world')
  expect(doc.events[0]!.start).toBe(1000)  // 1 second
  expect(doc.events[0]!.end).toBe(5000)    // 5 seconds
  expect(doc.events[0]!.marginV).toBe(20)
})

test('parsePAC handles BCD timecodes correctly', () => {
  const buffer = new Uint8Array(100)

  // Header
  buffer[0] = 0x01
  buffer[4] = 0x01  // PAL

  let pos = 24

  // Timecode: 01:30:45:12 (1h 30m 45s 12f at 25fps)
  buffer[pos++] = 0x01  // 1 hour
  buffer[pos++] = 0x30  // 30 minutes
  buffer[pos++] = 0x45  // 45 seconds
  buffer[pos++] = 0x12  // 12 frames

  // Timecode out: 01:30:50:00
  buffer[pos++] = 0x01  // 1 hour
  buffer[pos++] = 0x30  // 30 minutes
  buffer[pos++] = 0x50  // 50 seconds
  buffer[pos++] = 0x00  // 0 frames

  buffer[pos++] = 0x00  // Vertical position

  // Empty text
  buffer[pos++] = 0x00
  buffer[pos++] = 0x04
  buffer[pos++] = 0x54  // 'T'
  buffer[pos++] = 0x65  // 'e'
  buffer[pos++] = 0x73  // 's'
  buffer[pos++] = 0x74  // 't'

  const data = buffer.subarray(0, pos)
  const doc = unwrap(parsePAC(data))

  expect(doc.events).toHaveLength(1)
  // 1:30:45.480 = (1*3600 + 30*60 + 45) * 1000 + (12/25)*1000 = 5445480
  expect(doc.events[0]!.start).toBe(5445480)
  // 1:30:50.000 = (1*3600 + 30*60 + 50) * 1000 = 5450000
  expect(doc.events[0]!.end).toBe(5450000)
})

test('parsePAC handles NTSC frame rate', () => {
  const buffer = new Uint8Array(100)

  // Header
  buffer[0] = 0x01
  buffer[4] = 0x02  // NTSC 29.97fps

  let pos = 24

  // Timecode: 00:00:01:00 at 29.97fps
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x01
  buffer[pos++] = 0x00

  // Timecode out: 00:00:02:00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x00

  buffer[pos++] = 0x00

  // Text
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x48  // 'H'
  buffer[pos++] = 0x69  // 'i'

  const data = buffer.subarray(0, pos)
  const doc = unwrap(parsePAC(data))

  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(2000)
})

test('parsePAC decodes italic formatting', () => {
  const buffer = new Uint8Array(100)

  // Header
  buffer[0] = 0x01
  buffer[4] = 0x01

  let pos = 24

  // Timecodes
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x01
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x00

  buffer[pos++] = 0x00

  // Text with italic: 0x0A (italic on) + "Hi" + 0x0B (italic off)
  buffer[pos++] = 0x00
  buffer[pos++] = 0x04  // Length: 4 bytes
  buffer[pos++] = 0x0A  // Italic on
  buffer[pos++] = 0x48  // 'H'
  buffer[pos++] = 0x69  // 'i'
  buffer[pos++] = 0x0B  // Italic off

  const data = buffer.subarray(0, pos)
  const doc = unwrap(parsePAC(data))

  expect(doc.events[0]!.text).toBe('{\\i1}Hi{\\i0}')
})

test('parsePAC decodes line breaks', () => {
  const buffer = new Uint8Array(100)

  buffer[0] = 0x01
  buffer[4] = 0x01

  let pos = 24

  // Timecodes
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x01
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x00

  buffer[pos++] = 0x00

  // Text: "Line 1" + 0x0E (line break) + "Line 2"
  buffer[pos++] = 0x00
  buffer[pos++] = 0x0D
  buffer[pos++] = 0x4C  // 'L'
  buffer[pos++] = 0x69  // 'i'
  buffer[pos++] = 0x6E  // 'n'
  buffer[pos++] = 0x65  // 'e'
  buffer[pos++] = 0x20  // ' '
  buffer[pos++] = 0x31  // '1'
  buffer[pos++] = 0x0E  // Line break
  buffer[pos++] = 0x4C  // 'L'
  buffer[pos++] = 0x69  // 'i'
  buffer[pos++] = 0x6E  // 'n'
  buffer[pos++] = 0x65  // 'e'
  buffer[pos++] = 0x20  // ' '
  buffer[pos++] = 0x32  // '2'

  const data = buffer.subarray(0, pos)
  const doc = unwrap(parsePAC(data))

  expect(doc.events[0]!.text).toBe('Line 1\\NLine 2')
})

test('parsePAC handles special characters', () => {
  const buffer = new Uint8Array(100)

  buffer[0] = 0x01
  buffer[4] = 0x01

  let pos = 24

  // Timecodes
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x01
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x00

  buffer[pos++] = 0x00

  // Text with special char: 0x1F 0x29 = ©
  buffer[pos++] = 0x00
  buffer[pos++] = 0x02
  buffer[pos++] = 0x1F  // Escape
  buffer[pos++] = 0x29  // Copyright symbol

  const data = buffer.subarray(0, pos)
  const doc = unwrap(parsePAC(data))

  expect(doc.events[0]!.text).toBe('©')
})

test('parsePAC handles multiple subtitle blocks', () => {
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
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x05
  buffer[pos++] = 0x46  // 'F'
  buffer[pos++] = 0x69  // 'i'
  buffer[pos++] = 0x72  // 'r'
  buffer[pos++] = 0x73  // 's'
  buffer[pos++] = 0x74  // 't'

  // Second subtitle
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x03
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x04
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x06
  buffer[pos++] = 0x53  // 'S'
  buffer[pos++] = 0x65  // 'e'
  buffer[pos++] = 0x63  // 'c'
  buffer[pos++] = 0x6F  // 'o'
  buffer[pos++] = 0x6E  // 'n'
  buffer[pos++] = 0x64  // 'd'

  const data = buffer.subarray(0, pos)
  const doc = unwrap(parsePAC(data))

  expect(doc.events).toHaveLength(2)
  expect(doc.events[0]!.text).toBe('First')
  expect(doc.events[1]!.text).toBe('Second')
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[1]!.start).toBe(3000)
})

test('parsePAC collects errors for invalid data', () => {
  const data = new Uint8Array(10)  // Too small
  const result = parsePAC(data, { onError: 'collect' })

  expect(result.ok).toBe(false)
  expect(result.errors.length).toBeGreaterThan(0)
})
