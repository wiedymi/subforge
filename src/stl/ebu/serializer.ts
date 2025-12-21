import type { SubtitleDocument } from '../../core/types.ts'

const GSI_BLOCK_SIZE = 1024
const TTI_BLOCK_SIZE = 128
const MAX_TEXT_FIELD_SIZE = 112

/**
 * Options for serializing to EBU-STL format
 */
interface SerializeOptions {
  /** Frame rate for timecode conversion (default: 25) */
  frameRate?: 25 | 30
  /** Character Code Table for text encoding (default: 0x00 for Latin) */
  cct?: number
  /** Two-character language code (default: '0A') */
  languageCode?: string
}

/**
 * Serializes a subtitle document to EBU-STL binary format
 *
 * Creates a binary file following the EBU-STL specification with GSI and TTI blocks.
 * Automatically splits long subtitles across multiple TTI extension blocks if needed.
 *
 * @param doc - Subtitle document to serialize
 * @param opts - Serialization options for frame rate, encoding, and language
 * @returns Binary EBU-STL file data as Uint8Array
 *
 * @example
 * ```ts
 * const stlData = toEBUSTL(doc, {
 *   frameRate: 25,
 *   cct: 0x00,
 *   languageCode: '0A'
 * })
 * await Bun.write('output.stl', stlData)
 * ```
 */
export function toEBUSTL(doc: SubtitleDocument, opts: SerializeOptions = {}): Uint8Array {
  const frameRate = opts.frameRate ?? 25
  const cct = opts.cct ?? 0x00 // Default to Latin
  const languageCode = opts.languageCode ?? '0A'

  // Calculate total number of TTI blocks needed
  let totalTTIBlocks = 0
  const eventBlocks: Uint8Array[][] = []

  for (const event of doc.events) {
    const blocks = createTTIBlocks(event, totalTTIBlocks, frameRate, cct)
    eventBlocks.push(blocks)
    totalTTIBlocks += blocks.length
  }

  // Create output buffer
  const totalSize = GSI_BLOCK_SIZE + (totalTTIBlocks * TTI_BLOCK_SIZE)
  const output = new Uint8Array(totalSize)
  output.fill(0x20) // Fill with spaces (default for many fields)

  // Write GSI block
  writeGSI(output, doc, totalTTIBlocks, frameRate, cct, languageCode)

  // Write TTI blocks
  let pos = GSI_BLOCK_SIZE
  for (const blocks of eventBlocks) {
    for (const block of blocks) {
      output.set(block, pos)
      pos += TTI_BLOCK_SIZE
    }
  }

  return output
}

function writeGSI(
  output: Uint8Array,
  doc: SubtitleDocument,
  tnb: number,
  frameRate: number,
  cct: number,
  languageCode: string
): void {
  const encoder = new TextEncoder()

  // CPN (0-2) - Code Page Number
  writeField(output, 0, '437', 3)

  // DFC (3-10) - Disk Format Code
  const dfc = `STL${frameRate === 30 ? '30' : '25'}.01`
  writeField(output, 3, dfc, 8)

  // DSC (11) - Display Standard Code
  output[11] = 0x31 // '1' = Open subtitling

  // CCT (12-13) - Character Code Table
  const cctStr = cct.toString(16).padStart(2, '0').toUpperCase()
  writeField(output, 12, cctStr, 2)

  // LC (14-15) - Language Code
  writeField(output, 14, languageCode, 2)

  // OPT (16-47) - Original Programme Title
  const title = doc.info.title || 'Untitled'
  writeField(output, 16, title, 32)

  // OET (48-79) - Original Episode Title
  writeField(output, 48, '', 32)

  // TPT (80-111) - Translated Programme Title
  writeField(output, 80, '', 32)

  // TET (112-143) - Translated Episode Title
  writeField(output, 112, '', 32)

  // TN (144-175) - Translator's Name
  const author = doc.info.author || ''
  writeField(output, 144, author, 32)

  // TCD (176-207) - Translator's Contact Details
  writeField(output, 176, '', 32)

  // SLR (208-223) - Subtitle List Reference Code
  writeField(output, 208, '', 16)

  // CD (224-229) - Creation Date (YYMMDD)
  const now = new Date()
  const cd = now.toISOString().slice(2, 10).replace(/-/g, '')
  writeField(output, 224, cd, 6)

  // RD (230-235) - Revision Date (YYMMDD)
  writeField(output, 230, cd, 6)

  // RN (236-237) - Revision Number
  writeField(output, 236, '01', 2)

  // TNB (238-242) - Total Number of TTI blocks (5 digits)
  writeField(output, 238, tnb.toString().padStart(5, '0'), 5)

  // TNS (243-247) - Total Number of Subtitles
  writeField(output, 243, doc.events.length.toString().padStart(5, '0'), 5)

  // TNG (248-250) - Total Number of Subtitle Groups
  writeField(output, 248, '001', 3)

  // MNC (251-252) - Maximum Number of Displayable Characters
  writeField(output, 251, '40', 2)

  // MNR (253-254) - Maximum Number of Displayable Rows
  writeField(output, 252, '23', 2)

  // TCS (255) - Time Code: Status
  output[255] = 0x31 // '1' = Intended for use

  // TCP (256-263) - Time Code: Start-of-Programme
  writeField(output, 256, '00000000', 8)

  // TCF (264-271) - Time Code: First In-Cue
  writeField(output, 264, '00000000', 8)

  // TND (272) - Total Number of Disks
  output[272] = 0x31 // '1'

  // DSN (273) - Disk Sequence Number
  output[273] = 0x31 // '1'

  // CO (274-276) - Country of Origin
  writeField(output, 274, 'USA', 3)

  // PUB (277-308) - Publisher
  writeField(output, 277, '', 32)

  // EN (309-340) - Editor's Name
  writeField(output, 309, '', 32)

  // ECD (341-372) - Editor's Contact Details
  writeField(output, 341, '', 32)

  // Spare bytes (373-447) already filled with spaces

  // UDA (448-1023) - User-Defined Area
  // Left as spaces
}

function createTTIBlocks(
  event: SubtitleDocument['events'][0],
  startIndex: number,
  frameRate: number,
  cct: number
): Uint8Array[] {
  const encoder = getEncoder(cct)

  // Encode text with control codes
  const textParts = event.text.split('\n')
  const encoded: number[] = []
  for (let i = 0; i < textParts.length; i++) {
    if (i > 0) {
      encoded.push(0x8a) // Line break control code
    }
    const bytes = encoder.encode(textParts[i])
    for (let j = 0; j < bytes.length; j++) {
      encoded.push(bytes[j])
    }
  }
  const encodedArray = new Uint8Array(encoded)

  // Split into blocks if needed (max 112 bytes per block)
  const blocks: Uint8Array[] = []
  let offset = 0
  let ebn = 0

  while (offset < encodedArray.length || ebn === 0) {
    const block = new Uint8Array(TTI_BLOCK_SIZE)
    block.fill(0x8f) // Fill with end marker

    // SGN (0) - Subtitle Group Number
    block[0] = 0

    // SN (1-2) - Subtitle Number (big-endian)
    const sn = startIndex + 1
    block[1] = (sn >> 8) & 0xff
    block[2] = sn & 0xff

    // EBN (3) - Extension Block Number
    block[3] = ebn

    // CS (4) - Cumulative Status
    block[4] = 0x00 // Not cumulative

    // TCI (5-8) - Time Code In
    writeBCDTimecode(block, 5, event.start, frameRate)

    // TCO (9-12) - Time Code Out
    writeBCDTimecode(block, 9, event.end, frameRate)

    // VP (13) - Vertical Position
    block[13] = 0x14 // Row 20 (near bottom)

    // JC (14) - Justification Code
    block[14] = 0x02 // Centered

    // CF (15) - Comment Flag
    block[15] = 0x00 // Not a comment

    // TF (16-127) - Text Field
    const chunkSize = Math.min(MAX_TEXT_FIELD_SIZE, encodedArray.length - offset)
    if (chunkSize > 0) {
      block.set(encodedArray.slice(offset, offset + chunkSize), 16)
      offset += chunkSize
    }

    blocks.push(block)
    ebn++

    // Only create extension blocks if there's more text
    if (offset >= encodedArray.length) break
  }

  return blocks
}

function writeBCDTimecode(block: Uint8Array, offset: number, timeMs: number, frameRate: number): void {
  const totalSeconds = Math.floor(timeMs / 1000)
  const hh = Math.floor(totalSeconds / 3600)
  const mm = Math.floor((totalSeconds % 3600) / 60)
  const ss = totalSeconds % 60
  const ff = Math.floor(((timeMs % 1000) / 1000) * frameRate)

  block[offset] = toBCD(hh)
  block[offset + 1] = toBCD(mm)
  block[offset + 2] = toBCD(ss)
  block[offset + 3] = toBCD(ff)
}

function toBCD(value: number): number {
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return (tens << 4) | ones
}

function writeField(output: Uint8Array, offset: number, text: string, length: number): void {
  const encoder = new TextEncoder()
  const encoded = encoder.encode(text.slice(0, length))
  output.set(encoded, offset)
}

function getEncoder(cct: number): TextEncoder {
  // Note: TextEncoder only supports UTF-8, but for basic Latin characters
  // this works fine. For proper support of other character sets, would need
  // a more sophisticated encoding library
  return new TextEncoder()
}
