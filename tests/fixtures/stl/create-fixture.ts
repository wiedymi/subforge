// Script to create a simple EBU-STL test fixture
import { writeFileSync } from 'fs'
import { resolve } from 'path'

function createSimpleSTL(): Uint8Array {
  const data = new Uint8Array(1024 + 128 * 2)
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
  data.set(new TextEncoder().encode('Simple Test Subtitle'), 16)

  // TN (144-175) - Translator's Name
  data.set(new TextEncoder().encode('Test Author'), 144)

  // CD (224-229) - Creation Date
  data.set(new TextEncoder().encode('250101'), 224)

  // RD (230-235) - Revision Date
  data.set(new TextEncoder().encode('250101'), 230)

  // RN (236-237) - Revision Number
  data.set(new TextEncoder().encode('01'), 236)

  // TNB (238-242) - Total number of TTI blocks
  data.set(new TextEncoder().encode('00002'), 238)

  // TNS (243-247) - Total number of subtitles
  data.set(new TextEncoder().encode('00002'), 243)

  // TNG (248-250) - Total number of subtitle groups
  data.set(new TextEncoder().encode('001'), 248)

  // MNC (251-252) - Max displayable characters
  data.set(new TextEncoder().encode('40'), 251)

  // MNR (253-254) - Max displayable rows
  data.set(new TextEncoder().encode('23'), 253)

  // TCS (255) - Time Code Status
  data[255] = 0x31

  // TCP (256-263) - Time Code Start
  data.set(new TextEncoder().encode('00000000'), 256)

  // TCF (264-271) - Time Code First
  data.set(new TextEncoder().encode('00000000'), 264)

  // TND (272) - Total number of disks
  data[272] = 0x31

  // DSN (273) - Disk sequence number
  data[273] = 0x31

  // CO (274-276) - Country
  data.set(new TextEncoder().encode('USA'), 274)

  // First TTI Block at offset 1024
  let ttiOffset = 1024

  // SGN (0)
  data[ttiOffset + 0] = 0

  // SN (1-2) - Subtitle number 1
  data[ttiOffset + 1] = 0
  data[ttiOffset + 2] = 1

  // EBN (3)
  data[ttiOffset + 3] = 0

  // CS (4)
  data[ttiOffset + 4] = 0

  // TCI (5-8) - Time Code In: 00:00:01:00 (BCD)
  data[ttiOffset + 5] = 0x00
  data[ttiOffset + 6] = 0x00
  data[ttiOffset + 7] = 0x01
  data[ttiOffset + 8] = 0x00

  // TCO (9-12) - Time Code Out: 00:00:05:00 (BCD)
  data[ttiOffset + 9] = 0x00
  data[ttiOffset + 10] = 0x00
  data[ttiOffset + 11] = 0x05
  data[ttiOffset + 12] = 0x00

  // VP (13)
  data[ttiOffset + 13] = 0x14

  // JC (14)
  data[ttiOffset + 14] = 0x02

  // CF (15)
  data[ttiOffset + 15] = 0x00

  // TF (16-127) - Text: "Hello World"
  const text1 = new Uint8Array([
    0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64, // Hello World
    0x8f // End marker
  ])
  data.set(text1, ttiOffset + 16)
  // Fill rest with 0x8f
  for (let i = ttiOffset + 16 + text1.length; i < ttiOffset + 128; i++) {
    data[i] = 0x8f
  }

  // Second TTI Block at offset 1024 + 128
  ttiOffset = 1024 + 128

  // SGN (0)
  data[ttiOffset + 0] = 0

  // SN (1-2) - Subtitle number 2
  data[ttiOffset + 1] = 0
  data[ttiOffset + 2] = 2

  // EBN (3)
  data[ttiOffset + 3] = 0

  // CS (4)
  data[ttiOffset + 4] = 0

  // TCI (5-8) - Time Code In: 00:00:07:00 (BCD)
  data[ttiOffset + 5] = 0x00
  data[ttiOffset + 6] = 0x00
  data[ttiOffset + 7] = 0x07
  data[ttiOffset + 8] = 0x00

  // TCO (9-12) - Time Code Out: 00:00:12:00 (BCD)
  data[ttiOffset + 9] = 0x00
  data[ttiOffset + 10] = 0x00
  data[ttiOffset + 11] = 0x12
  data[ttiOffset + 12] = 0x00

  // VP (13)
  data[ttiOffset + 13] = 0x14

  // JC (14)
  data[ttiOffset + 14] = 0x02

  // CF (15)
  data[ttiOffset + 15] = 0x00

  // TF (16-127) - Text: "Second subtitle"
  const text2 = new Uint8Array([
    0x53, 0x65, 0x63, 0x6f, 0x6e, 0x64, 0x20, 0x73, 0x75, 0x62, 0x74, 0x69, 0x74, 0x6c, 0x65, // Second subtitle
    0x8f // End marker
  ])
  data.set(text2, ttiOffset + 16)
  // Fill rest with 0x8f
  for (let i = ttiOffset + 16 + text2.length; i < ttiOffset + 128; i++) {
    data[i] = 0x8f
  }

  return data
}

const fixture = createSimpleSTL()
const outputPath = resolve(__dirname, 'simple.stl')
writeFileSync(outputPath, fixture)
console.log(`Created fixture: ${outputPath}`)
