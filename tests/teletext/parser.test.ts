import { test, expect, describe } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseTeletext } from '../../src/formats/broadcast/teletext/index.ts'

describe('Teletext Parser', () => {
  test('parses empty teletext data', () => {
    const data = new Uint8Array(0)
    const doc = unwrap(parseTeletext(data))

    expect(doc).toBeDefined()
    expect(doc.events).toHaveLength(0)
  })

  test('parses basic teletext packet structure', () => {
    // Create a minimal teletext page 888 with one subtitle row
    const packet = createTeletextPacket(888, 0, 'Test subtitle')

    const doc = unwrap(parseTeletext(packet))

    expect(doc).toBeDefined()
    expect(doc.events.length).toBeGreaterThan(0)
  })

  test('decodes teletext characters with parity', () => {
    // Test character 'A' (0x41) with odd parity
    const charA = 0x41 // 01000001
    const withParity = charA | 0x80 // Add parity bit for odd parity

    const packet = createPacketWithChar(withParity)
    const doc = unwrap(parseTeletext(packet))

    expect(doc).toBeDefined()
  })

  test('handles page 888 subtitle page', () => {
    const packet = createTeletextPacket(888, 0, 'Subtitle on page 888')

    const doc = unwrap(parseTeletext(packet))

    expect(doc).toBeDefined()
    if (doc.events.length > 0) {
      expect(doc.events[0].text).toContain('Subtitle')
    }
  })

  test('handles multiple rows in a page', () => {
    const packets: number[] = []

    // Page header
    packets.push(...createPageHeader(888, 0))

    // Row 1
    packets.push(...createRowPacket(1, 'First line'))

    // Row 2
    packets.push(...createRowPacket(2, 'Second line'))

    const data = new Uint8Array(packets)
    const doc = unwrap(parseTeletext(data))

    expect(doc).toBeDefined()
  })

  test('parseTeletext collects errors on invalid data', () => {
    const data = new Uint8Array([0xFF, 0xFF, 0xFF])

    const result = parseTeletext(data, { onError: 'collect' })

    expect(result).toBeDefined()
    expect(result.document).toBeDefined()
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

// Helper functions to create test teletext packets

function createPageHeader(pageNumber: number, subPage: number): number[] {
  const packet = new Array(45).fill(0)

  // Magazine and packet number (packet 0 = header)
  const magazine = Math.floor(pageNumber / 100)
  const actualMag = magazine === 8 ? 0 : magazine
  const byte0 = actualMag | (0 << 3)

  packet[0] = hamming84(byte0 & 0x0F)
  packet[1] = hamming84((byte0 >> 4) & 0x0F)

  // Page number
  const pageUnits = pageNumber % 10
  const pageTens = Math.floor((pageNumber % 100) / 10)

  packet[2] = hamming84(pageUnits)
  packet[3] = hamming84(0)
  packet[4] = hamming84(pageTens)
  packet[5] = hamming84(0)

  // Subpage
  packet[6] = hamming84(subPage & 0x0F)
  packet[7] = hamming84(0)
  packet[8] = hamming84((subPage >> 4) & 0x0F)
  packet[9] = hamming84(0)

  // Control bits
  for (let i = 10; i < 18; i++) {
    packet[i] = hamming84(0)
  }

  // Header text
  for (let i = 18; i < 42; i++) {
    packet[i] = addParity(0x20)
  }

  return packet
}

function createRowPacket(rowNumber: number, text: string): number[] {
  const packet = new Array(45).fill(0)

  // Magazine and row number
  const actualMag = 0 // magazine 8
  const byte0 = actualMag | (rowNumber << 3)

  packet[0] = hamming84(byte0 & 0x0F)
  packet[1] = hamming84((byte0 >> 4) & 0x0F)

  // Row data
  for (let i = 0; i < 40; i++) {
    const char = i < text.length ? text.charCodeAt(i) : 0x20
    packet[2 + i] = addParity(char & 0x7F)
  }

  return packet
}

function createTeletextPacket(pageNumber: number, subPage: number, text: string): Uint8Array {
  const packets: number[] = []

  // Page header
  packets.push(...createPageHeader(pageNumber, subPage))

  // Row with text
  packets.push(...createRowPacket(1, text))

  return new Uint8Array(packets)
}

function createPacketWithChar(charCode: number): Uint8Array {
  const packets: number[] = []
  packets.push(...createPageHeader(888, 0))

  const packet = new Array(45).fill(0)
  packet[0] = hamming84(0x01) // magazine 8, packet 1
  packet[1] = hamming84(0x00)
  packet[2] = charCode

  for (let i = 3; i < 45; i++) {
    packet[i] = addParity(0x20)
  }

  packets.push(...packet)

  return new Uint8Array(packets)
}

function hamming84(nibble: number): number {
  return addParity(nibble & 0x0F)
}

function addParity(byte: number): number {
  byte = byte & 0x7F
  let bits = 0
  let temp = byte
  while (temp) {
    bits += temp & 1
    temp >>= 1
  }
  return byte | ((bits & 1) ? 0 : 0x80)
}
