import type { SubtitleDocument, SubtitleEvent } from '../core/types.ts'

/**
 * Converts a subtitle document to PAC (Screen Electronics/Cavena) binary format.
 *
 * Generates a binary PAC file with a 24-byte header followed by subtitle blocks.
 * Each block contains BCD-encoded timecodes, vertical positioning, and text data
 * with control codes for styling (italic, underline).
 *
 * @param doc - Subtitle document to convert
 * @param frameRate - Frame rate for timecode encoding (25 for PAL, 29.97 for NTSC, defaults to 25)
 * @returns Binary PAC data as Uint8Array
 *
 * @example
 * ```ts
 * const doc = createDocument();
 * doc.events.push({
 *   start: 1000,
 *   end: 4000,
 *   text: 'Hello, World!',
 *   marginV: 10, // Vertical position
 *   // ... other event properties
 * });
 * const pacData = toPAC(doc, 25);
 * await Bun.write('output.pac', pacData);
 * ```
 */
export function toPAC(doc: SubtitleDocument, frameRate: number = 25): Uint8Array {
  // Calculate required buffer size
  // Header: 24 bytes
  // Each event: 11 bytes + text length
  let totalSize = 24
  for (const event of doc.events) {
    const textBytes = encodeText(event.text)
    totalSize += 11 + textBytes.length
  }

  const buffer = new Uint8Array(totalSize)
  const view = new DataView(buffer.buffer)
  let pos = 0

  // Write PAC header (24 bytes)
  buffer[0] = 0x01  // Format code
  buffer[1] = 0x00
  buffer[2] = 0x00
  buffer[3] = 0x00

  // Display standard (byte 4)
  buffer[4] = frameRate === 29.97 ? 0x02 : 0x01  // 0x01 = PAL, 0x02 = NTSC

  // Fill remaining header bytes with zeros
  for (let i = 5; i < 24; i++) {
    buffer[i] = 0x00
  }

  pos = 24

  // Write subtitle blocks
  for (const event of doc.events) {
    const textBytes = encodeText(event.text)

    // Timecode in (4 bytes BCD)
    const tcIn = msToFrames(event.start, frameRate)
    writeBCDTimecode(buffer, pos, tcIn, frameRate)
    pos += 4

    // Timecode out (4 bytes BCD)
    const tcOut = msToFrames(event.end, frameRate)
    writeBCDTimecode(buffer, pos, tcOut, frameRate)
    pos += 4

    // Vertical position (1 byte)
    buffer[pos++] = event.marginV & 0xFF

    // Text length (2 bytes, big-endian)
    view.setUint16(pos, textBytes.length, false)
    pos += 2

    // Text data
    buffer.set(textBytes, pos)
    pos += textBytes.length
  }

  return buffer
}

/**
 * Converts milliseconds to frame count.
 *
 * @param ms - Time in milliseconds
 * @param frameRate - Frames per second
 * @returns Total number of frames
 */
function msToFrames(ms: number, frameRate: number): number {
  return Math.round((ms / 1000) * frameRate)
}

/**
 * Writes BCD-encoded timecode to buffer.
 *
 * Converts frame count to HH:MM:SS:FF format and encodes each component as BCD (Binary Coded Decimal)
 * where each byte represents two decimal digits.
 *
 * @param buffer - Target buffer to write to
 * @param pos - Position in buffer to start writing
 * @param frames - Total frame count
 * @param frameRate - Frames per second for conversion
 */
function writeBCDTimecode(buffer: Uint8Array, pos: number, frames: number, frameRate: number): void {
  // Convert frames to HH:MM:SS:FF
  const fps = Math.round(frameRate)
  const totalSeconds = Math.floor(frames / frameRate)
  const f = Math.floor(frames % fps)
  const s = totalSeconds % 60
  const m = Math.floor(totalSeconds / 60) % 60
  const h = Math.floor(totalSeconds / 3600)

  // Write as BCD
  buffer[pos] = decToBCD(h)
  buffer[pos + 1] = decToBCD(m)
  buffer[pos + 2] = decToBCD(s)
  buffer[pos + 3] = decToBCD(f)
}

/**
 * Converts decimal number to BCD (Binary Coded Decimal) byte.
 *
 * BCD encoding stores each decimal digit in a 4-bit nibble.
 * For example, 47 becomes 0x47 (0100 0111).
 *
 * @param dec - Decimal number (0-99)
 * @returns BCD-encoded byte
 */
function decToBCD(dec: number): number {
  // Convert decimal to BCD byte
  const tens = Math.floor(dec / 10)
  const ones = dec % 10
  return (tens << 4) | ones
}

/**
 * Encodes text string to PAC format with control codes.
 *
 * Converts ASS-style tags to PAC control codes:
 * - \\N → 0x0E (line break)
 * - {\\i1} → 0x0A (italic on)
 * - {\\i0} → 0x0B (italic off)
 * - {\\u1} → 0x0C (underline on)
 * - {\\u0} → 0x0D (underline off)
 *
 * Special characters (Latin-1 extended) are encoded with 0x1F escape sequence.
 *
 * @param text - Text string with optional ASS-style formatting tags
 * @returns Encoded byte array
 */
function encodeText(text: string): Uint8Array {
  // Encode text to PAC format
  // Convert ASS-style tags to PAC control codes
  // \N -> 0x0E (line break)
  // {\i1} -> 0x0A (italic on)
  // {\i0} -> 0x0B (italic off)
  // {\u1} -> 0x0C (underline on)
  // {\u0} -> 0x0D (underline off)

  const bytes: number[] = []
  let i = 0

  while (i < text.length) {
    // Check for ASS tags
    if (text[i] === '{' && text[i + 1] === '\\') {
      const tagEnd = text.indexOf('}', i)
      if (tagEnd !== -1) {
        const tag = text.substring(i + 2, tagEnd)

        if (tag === 'i1') {
          bytes.push(0x0A)  // Italic on
        } else if (tag === 'i0') {
          bytes.push(0x0B)  // Italic off
        } else if (tag === 'u1') {
          bytes.push(0x0C)  // Underline on
        } else if (tag === 'u0') {
          bytes.push(0x0D)  // Underline off
        }

        i = tagEnd + 1
        continue
      }
    }

    // Check for line break
    if (text[i] === '\\' && i + 1 < text.length && text[i + 1] === 'N') {
      bytes.push(0x0E)
      i += 2
      continue
    }

    // Regular character
    const char = text[i]!
    const code = char.charCodeAt(0)

    // Encode special characters with 0x1F escape
    if (code >= 0xA0 && code <= 0xFF) {
      const specialCode = encodeSpecialChar(char)
      if (specialCode !== null) {
        bytes.push(0x1F)
        bytes.push(specialCode)
      } else {
        bytes.push(code)
      }
    } else if (code >= 0x20 && code < 0x7F) {
      // Regular ASCII
      bytes.push(code)
    }
    // Skip control characters except those already handled

    i++
  }

  return new Uint8Array(bytes)
}

/**
 * Encodes special Latin-1 characters to PAC escape codes.
 *
 * Special characters in the range 0xA0-0xFF are encoded with a 0x1F prefix
 * followed by the specific character code.
 *
 * @param char - Special character to encode
 * @returns PAC escape code, or null if character is not in the special set
 */
function encodeSpecialChar(char: string): number | null {
  // Encode special characters to PAC escape codes
  switch (char) {
    case '¡': return 0x21
    case '¢': return 0x22
    case '£': return 0x23
    case '¤': return 0x24
    case '¥': return 0x25
    case '¦': return 0x26
    case '§': return 0x27
    case '¨': return 0x28
    case '©': return 0x29
    case 'ª': return 0x2A
    case '«': return 0x2B
    case '¬': return 0x2C
    case '®': return 0x2E
    case '¯': return 0x2F
    case '°': return 0x30
    case '±': return 0x31
    case '²': return 0x32
    case '³': return 0x33
    case '´': return 0x34
    case 'µ': return 0x35
    case '¶': return 0x36
    case '·': return 0x37
    case '¸': return 0x38
    case '¹': return 0x39
    case 'º': return 0x3A
    case '»': return 0x3B
    case '¼': return 0x3C
    case '½': return 0x3D
    case '¾': return 0x3E
    case '¿': return 0x3F
    default: return null
  }
}
