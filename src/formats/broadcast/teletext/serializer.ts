import type { SubtitleDocument, SubtitleEvent } from '../../../core/types.ts'

// Teletext control codes
const ALPHA_WHITE = 0x07
const NORMAL_HEIGHT = 0x0C

class TeletextSerializer {
  private doc: SubtitleDocument
  private output: number[] = []

  constructor(doc: SubtitleDocument) {
    this.doc = doc
  }

  serialize(): Uint8Array {
    for (const event of this.doc.events) {
      this.writeEvent(event)
    }
    return new Uint8Array(this.output)
  }

  private writeEvent(event: SubtitleEvent): void {
    // Write page header for page 888 (subtitle page)
    this.writePageHeader(888, 0)

    // Split text into lines (max 40 chars per line)
    const lines = event.text.split('\n')
    let rowNumber = 1

    for (const line of lines) {
      if (rowNumber > 24) break // Max 24 rows

      // Write row data
      this.writeRow(rowNumber, line)
      rowNumber++
    }
  }

  private writePageHeader(pageNumber: number, subPage: number): void {
    const packet = new Array(45).fill(0)

    // Magazine and packet number (packet 0 = header)
    const magazine = Math.floor(pageNumber / 100)
    const actualMag = magazine === 8 ? 0 : magazine
    const byte0 = actualMag | (0 << 3) // packet 0

    packet[0] = this.ham84(byte0 & 0x0F)
    packet[1] = this.ham84((byte0 >> 4) & 0x0F)

    // Page number
    const pageUnits = pageNumber % 10
    const pageTens = Math.floor((pageNumber % 100) / 10)

    packet[2] = this.ham84(pageUnits)
    packet[3] = this.ham84(0)
    packet[4] = this.ham84(pageTens)
    packet[5] = this.ham84(0)

    // Subpage
    packet[6] = this.ham84(subPage & 0x0F)
    packet[7] = this.ham84(0)
    packet[8] = this.ham84((subPage >> 4) & 0x0F)
    packet[9] = this.ham84(0)

    // Control bits (bytes 10-17)
    for (let i = 10; i < 18; i++) {
      packet[i] = this.ham84(0)
    }

    // Header text (bytes 18-41) - 24 characters
    const headerText = `Page ${pageNumber}`.padEnd(24, ' ')
    for (let i = 0; i < 24; i++) {
      packet[18 + i] = this.addParity(headerText.charCodeAt(i))
    }

    // Padding
    for (let i = 42; i < 45; i++) {
      packet[i] = this.addParity(0x20)
    }

    this.output.push(...packet)
  }

  private writeRow(rowNumber: number, text: string): void {
    const packet = new Array(45).fill(0)

    // Magazine and row number
    const magazine = 8
    const actualMag = 0 // magazine 8 = 0
    const byte0 = actualMag | (rowNumber << 3)

    packet[0] = this.ham84(byte0 & 0x0F)
    packet[1] = this.ham84((byte0 >> 4) & 0x0F)

    // Row data (40 characters)
    // Start with white text, normal height
    const rowData = new Array(40)
    rowData[0] = ALPHA_WHITE
    rowData[1] = NORMAL_HEIGHT

    // Fill with text (max 38 chars after control codes)
    const maxLen = Math.min(text.length, 38)
    for (let i = 0; i < maxLen; i++) {
      rowData[2 + i] = text.charCodeAt(i) & 0x7F
    }

    // Pad remaining with spaces
    for (let i = maxLen + 2; i < 40; i++) {
      rowData[i] = 0x20
    }

    // Add parity to row data
    for (let i = 0; i < 40; i++) {
      packet[2 + i] = this.addParity(rowData[i])
    }

    // Padding
    for (let i = 42; i < 45; i++) {
      packet[i] = this.addParity(0x20)
    }

    this.output.push(...packet)
  }

  // Hamming 8/4 encode (encode 4 bits into 2 bytes with error correction)
  private ham84(nibble: number): number {
    // Simplified: just return the nibble with odd parity
    // Full implementation would use proper Hamming code
    return this.addParity(nibble & 0x0F)
  }

  // Add odd parity bit
  private addParity(byte: number): number {
    byte = byte & 0x7F
    let bits = 0
    let temp = byte
    while (temp) {
      bits += temp & 1
      temp >>= 1
    }
    // Set bit 7 for odd parity
    return byte | ((bits & 1) ? 0 : 0x80)
  }
}

/**
 * Convert subtitle document to Teletext format
 * @param doc - Subtitle document to serialize
 * @returns Binary Teletext data
 * @example
 * const teletextData = toTeletext(document)
 * Bun.write('output.teletext', teletextData)
 */
export function toTeletext(doc: SubtitleDocument): Uint8Array {
  const serializer = new TeletextSerializer(doc)
  return serializer.serialize()
}
