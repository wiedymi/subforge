import { test, expect, describe } from 'bun:test'
import { parseEBUSTL, parseEBUSTLResult } from '../../../src/stl/ebu/parser.ts'

describe('EBU-STL Parser', () => {
  test('parse minimal valid EBU-STL file', () => {
    // Create minimal valid EBU-STL file
    const data = new Uint8Array(1024 + 128) // GSI + 1 TTI block
    data.fill(0x20) // Fill with spaces

    // GSI Block
    // CPN (0-2)
    data.set(new TextEncoder().encode('437'), 0)

    // DFC (3-10)
    data.set(new TextEncoder().encode('STL25.01'), 3)

    // DSC (11)
    data[11] = 0x31

    // CCT (12-13)
    data.set(new TextEncoder().encode('00'), 12)

    // LC (14-15)
    data.set(new TextEncoder().encode('0A'), 14)

    // OPT (16-47) - Title
    data.set(new TextEncoder().encode('Test Title'), 16)

    // TNB (238-242) - Total number of TTI blocks
    data.set(new TextEncoder().encode('00001'), 238)

    // TNS (243-247) - Total number of subtitles
    data.set(new TextEncoder().encode('00001'), 243)

    // TTI Block at offset 1024
    const ttiOffset = 1024

    // SGN (0)
    data[ttiOffset + 0] = 0

    // SN (1-2) - Subtitle number
    data[ttiOffset + 1] = 0
    data[ttiOffset + 2] = 1

    // EBN (3)
    data[ttiOffset + 3] = 0

    // CS (4)
    data[ttiOffset + 4] = 0

    // TCI (5-8) - Time Code In: 00:00:01:00 (BCD)
    data[ttiOffset + 5] = 0x00 // HH
    data[ttiOffset + 6] = 0x00 // MM
    data[ttiOffset + 7] = 0x01 // SS
    data[ttiOffset + 8] = 0x00 // FF

    // TCO (9-12) - Time Code Out: 00:00:05:00 (BCD)
    data[ttiOffset + 9] = 0x00  // HH
    data[ttiOffset + 10] = 0x00 // MM
    data[ttiOffset + 11] = 0x05 // SS
    data[ttiOffset + 12] = 0x00 // FF

    // VP (13)
    data[ttiOffset + 13] = 0x14

    // JC (14)
    data[ttiOffset + 14] = 0x02

    // CF (15) - Not a comment
    data[ttiOffset + 15] = 0x00

    // TF (16-127) - Text field
    data.set(new TextEncoder().encode('Hello World'), ttiOffset + 16)
    data[ttiOffset + 16 + 11] = 0x8f // End marker

    const doc = parseEBUSTL(data)

    expect(doc.info.title).toBe('Test Title')
    expect(doc.events.length).toBe(1)
    expect(doc.events[0].text).toBe('Hello World')
    expect(doc.events[0].start).toBe(1000)
    expect(doc.events[0].end).toBe(5000)
  })

  test('parse EBU-STL with line breaks', () => {
    const data = new Uint8Array(1024 + 128)
    data.fill(0x20)

    // GSI Block (minimal)
    data.set(new TextEncoder().encode('437'), 0)
    data.set(new TextEncoder().encode('STL25.01'), 3)
    data[11] = 0x31
    data.set(new TextEncoder().encode('00'), 12)
    data.set(new TextEncoder().encode('0A'), 14)
    data.set(new TextEncoder().encode('00001'), 238)
    data.set(new TextEncoder().encode('00001'), 243)

    // TTI Block
    const ttiOffset = 1024
    data[ttiOffset + 0] = 0 // SGN
    data[ttiOffset + 1] = 0 // SN high byte
    data[ttiOffset + 2] = 1 // SN low byte
    data[ttiOffset + 3] = 0 // EBN
    data[ttiOffset + 4] = 0 // CS
    // TCI (5-8): 00:00:01:00 (BCD)
    data[ttiOffset + 5] = 0x00 // HH
    data[ttiOffset + 6] = 0x00 // MM
    data[ttiOffset + 7] = 0x01 // SS
    data[ttiOffset + 8] = 0x00 // FF
    // TCO (9-12): 00:00:03:00 (BCD)
    data[ttiOffset + 9] = 0x00 // HH
    data[ttiOffset + 10] = 0x00 // MM
    data[ttiOffset + 11] = 0x03 // SS
    data[ttiOffset + 12] = 0x00 // FF
    data[ttiOffset + 15] = 0x00 // CF: not a comment

    // Text with line break (0x8a)
    const text = new Uint8Array([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, // Hello
      0x8a, // Line break
      0x57, 0x6f, 0x72, 0x6c, 0x64, // World
      0x8f // End marker
    ])
    data.set(text, ttiOffset + 16)

    const doc = parseEBUSTL(data)

    expect(doc.events.length).toBe(1)
    expect(doc.events[0].text).toBe('Hello\nWorld')
  })

  test('parse EBU-STL with multiple subtitles', () => {
    const data = new Uint8Array(1024 + 128 * 2)
    data.fill(0x20)

    // GSI Block
    data.set(new TextEncoder().encode('437'), 0)
    data.set(new TextEncoder().encode('STL25.01'), 3)
    data[11] = 0x31
    data.set(new TextEncoder().encode('00'), 12)
    data.set(new TextEncoder().encode('0A'), 14)
    data.set(new TextEncoder().encode('00002'), 238) // 2 blocks
    data.set(new TextEncoder().encode('00002'), 243) // 2 subtitles

    // First TTI Block
    let ttiOffset = 1024
    data[ttiOffset + 0] = 0 // SGN
    data[ttiOffset + 1] = 0 // SN high
    data[ttiOffset + 2] = 1 // SN low = 1
    data[ttiOffset + 3] = 0 // EBN
    data[ttiOffset + 4] = 0 // CS
    // TCI (5-8): 00:00:01:00 (BCD)
    data[ttiOffset + 5] = 0x00 // HH
    data[ttiOffset + 6] = 0x00 // MM
    data[ttiOffset + 7] = 0x01 // SS
    data[ttiOffset + 8] = 0x00 // FF
    // TCO (9-12): 00:00:02:00 (BCD)
    data[ttiOffset + 9] = 0x00 // HH
    data[ttiOffset + 10] = 0x00 // MM
    data[ttiOffset + 11] = 0x02 // SS
    data[ttiOffset + 12] = 0x00 // FF
    data[ttiOffset + 15] = 0x00 // CF: not a comment
    data.set(new TextEncoder().encode('First'), ttiOffset + 16)
    data[ttiOffset + 16 + 5] = 0x8f

    // Second TTI Block
    ttiOffset = 1024 + 128
    data[ttiOffset + 0] = 0 // SGN
    data[ttiOffset + 1] = 0 // SN high
    data[ttiOffset + 2] = 2 // SN low = 2
    data[ttiOffset + 3] = 0 // EBN
    data[ttiOffset + 4] = 0 // CS
    // TCI (5-8): 00:00:03:00 (BCD)
    data[ttiOffset + 5] = 0x00 // HH
    data[ttiOffset + 6] = 0x00 // MM
    data[ttiOffset + 7] = 0x03 // SS
    data[ttiOffset + 8] = 0x00 // FF
    // TCO (9-12): 00:00:04:00 (BCD)
    data[ttiOffset + 9] = 0x00 // HH
    data[ttiOffset + 10] = 0x00 // MM
    data[ttiOffset + 11] = 0x04 // SS
    data[ttiOffset + 12] = 0x00 // FF
    data[ttiOffset + 15] = 0x00 // CF: not a comment
    data.set(new TextEncoder().encode('Second'), ttiOffset + 16)
    data[ttiOffset + 16 + 6] = 0x8f

    const doc = parseEBUSTL(data)

    expect(doc.events.length).toBe(2)
    expect(doc.events[0].text).toBe('First')
    expect(doc.events[0].start).toBe(1000)
    expect(doc.events[1].text).toBe('Second')
    expect(doc.events[1].start).toBe(3000)
  })

  test('skip comment blocks', () => {
    const data = new Uint8Array(1024 + 128 * 2)
    data.fill(0x20)

    // GSI Block
    data.set(new TextEncoder().encode('437'), 0)
    data.set(new TextEncoder().encode('STL25.01'), 3)
    data[11] = 0x31
    data.set(new TextEncoder().encode('00'), 12)
    data.set(new TextEncoder().encode('0A'), 14)
    data.set(new TextEncoder().encode('00002'), 238)
    data.set(new TextEncoder().encode('00001'), 243)

    // First TTI Block (comment)
    let ttiOffset = 1024
    data[ttiOffset + 2] = 1
    data[ttiOffset + 15] = 0x01 // CF = 1 (comment)
    data.set(new TextEncoder().encode('Comment'), ttiOffset + 16)

    // Second TTI Block (subtitle)
    ttiOffset = 1024 + 128
    data[ttiOffset + 2] = 2
    data[ttiOffset + 7] = 0x01
    data[ttiOffset + 11] = 0x02
    data[ttiOffset + 15] = 0x00 // CF = 0 (not comment)
    data.set(new TextEncoder().encode('Subtitle'), ttiOffset + 16)
    data[ttiOffset + 16 + 8] = 0x8f

    const doc = parseEBUSTL(data)

    expect(doc.events.length).toBe(1)
    expect(doc.events[0].text).toBe('Subtitle')
  })

  test('handle invalid file size', () => {
    const data = new Uint8Array(512) // Too small

    const result = parseEBUSTLResult(data, { onError: 'collect' })

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].code).toBe('INVALID_FORMAT')
  })
})
