// Simple PAC fixture generator
// This creates a valid PAC file for testing

export function createSimplePACFixture(): Uint8Array {
  const buffer = new Uint8Array(200)
  const view = new DataView(buffer.buffer)

  // Header (24 bytes)
  buffer[0] = 0x01  // Format code
  buffer[1] = 0x00
  buffer[2] = 0x00
  buffer[3] = 0x00
  buffer[4] = 0x01  // PAL 25fps
  // Rest of header is zeros

  let pos = 24

  // First subtitle: "Hello world" from 1s to 5s
  buffer[pos++] = 0x00  // Hours
  buffer[pos++] = 0x00  // Minutes
  buffer[pos++] = 0x01  // Seconds
  buffer[pos++] = 0x00  // Frames

  buffer[pos++] = 0x00  // Hours
  buffer[pos++] = 0x00  // Minutes
  buffer[pos++] = 0x05  // Seconds
  buffer[pos++] = 0x00  // Frames

  buffer[pos++] = 0x14  // Vertical position (20)

  const text1 = 'Hello world'
  view.setUint16(pos, text1.length, false)
  pos += 2
  for (let i = 0; i < text1.length; i++) {
    buffer[pos++] = text1.charCodeAt(i)
  }

  // Second subtitle: "Second line" from 6s to 10s with italic
  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x06
  buffer[pos++] = 0x00

  buffer[pos++] = 0x00
  buffer[pos++] = 0x00
  buffer[pos++] = 0x10  // 10 seconds
  buffer[pos++] = 0x00

  buffer[pos++] = 0x18  // Vertical position (24)

  // Text with italic: "{i1}Second line{i0}"
  const textBytes: number[] = [
    0x0A,  // Italic on
    0x53, 0x65, 0x63, 0x6F, 0x6E, 0x64,  // "Second"
    0x20,  // Space
    0x6C, 0x69, 0x6E, 0x65,  // "line"
    0x0B   // Italic off
  ]

  view.setUint16(pos, textBytes.length, false)
  pos += 2
  for (const byte of textBytes) {
    buffer[pos++] = byte
  }

  return buffer.subarray(0, pos)
}

// Generate the actual file if this is run directly
if (import.meta.main) {
  const data = createSimplePACFixture()
  await Bun.write(new URL('./simple.pac', import.meta.url), data)
  console.log('Created simple.pac fixture')
}
