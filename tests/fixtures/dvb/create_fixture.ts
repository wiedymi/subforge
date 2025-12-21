// Script to create a simple DVB subtitle fixture
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

function createSimpleDVBFixture(): Uint8Array {
  const segments: number[] = []

  // Page composition segment - 5 second timeout
  segments.push(
    0x0F, // sync byte
    0x10, // page composition
    0x00, 0x00, // page ID
    0x00, 0x02, // length
    0x05, // timeout (5 seconds)
    0x00  // version/state
  )

  // CLUT definition segment (4 colors)
  segments.push(
    0x0F, 0x12, 0x00, 0x00, // sync, type, page ID
    0x00, 0x1A, // length (26 bytes)
    0x00, 0x00, // CLUT ID 0, version 0
    // Entry 0: black transparent
    0x00, 0x01, 0x00, 0x80, 0x80, 0xFF,
    // Entry 1: white opaque
    0x01, 0x01, 0xFF, 0x80, 0x80, 0x00,
    // Entry 2: red opaque (Y=81, Cr=255, Cb=106)
    0x02, 0x01, 0x51, 0xFF, 0x6A, 0x00,
    // Entry 3: blue opaque (Y=41, Cr=240, Cb=255)
    0x03, 0x01, 0x29, 0xF0, 0xFF, 0x00
  )

  // Object data segment - simple 8x2 pixel block
  // Creates a simple pattern: white row, then red row
  const pixelData = [
    0x00, 0x48, 0x01, // Run of 8 pixels of color 1 (white)
    0x00, 0x00, // end of line
    0x00, 0x48, 0x02, // Run of 8 pixels of color 2 (red)
    0x00, 0x00  // end of line
  ]

  const objDataLen = 7 + pixelData.length
  segments.push(
    0x0F, 0x13, 0x00, 0x00, // sync, object data, page ID
    (objDataLen >> 8) & 0xFF, objDataLen & 0xFF, // length
    0x00, 0x00, // object ID
    0x00, // version/coding method 0 (pixel data)
    (pixelData.length >> 8) & 0xFF, pixelData.length & 0xFF, // top field length
    0x00, 0x00, // bottom field length
    ...pixelData
  )

  // End of display set
  segments.push(
    0x0F, 0x80, 0x00, 0x00, // sync, end of display set, page ID
    0x00, 0x00 // length
  )

  return new Uint8Array(segments)
}

// Create and write fixture
const fixture = createSimpleDVBFixture()
const outputPath = join(import.meta.dir, 'simple.dvb')
writeFileSync(outputPath, fixture)

console.log(`Created fixture at ${outputPath}`)
console.log(`Size: ${fixture.length} bytes`)
