import { test, expect, describe } from 'bun:test'
import { parsePGS, parsePGSResult } from '../../src/formats/binary/pgs/parser.ts'
import { SegmentType } from '../../src/formats/binary/pgs/segments.ts'

describe('PGS Parser', () => {
  test('parsePGS - empty data', () => {
    const data = new Uint8Array([])
    const doc = parsePGS(data)

    expect(doc.events).toHaveLength(0)
  })

  test('parsePGS - single display set', () => {
    // Build a minimal PGS display set
    const segments: number[] = []

    // PCS (Presentation Composition Segment)
    const pcsData = [
      0x04, 0x38, // Width (1080)
      0x02, 0x40, // Height (576)
      0x10, // Frame rate
      0x00, 0x00, // Composition number
      0x80, // Composition state
      0x00, // Palette update flag
      0x00, // Palette ID
      0x01, // Object count
      0x00, 0x00, // Object ID
      0x00, // Window ID
      0x00, // Flags
      0x00, 0x10, // X = 16
      0x00, 0x10, // Y = 16
    ]
    segments.push(
      0x50, 0x47, // Magic
      0x00, 0x00, 0x16, 0x2E, // PTS = 5678
      0x00, 0x00, 0x16, 0x2E, // DTS = 5678
      SegmentType.PCS,
      (pcsData.length >> 8) & 0xFF, pcsData.length & 0xFF,
      ...pcsData
    )

    // WDS (Window Definition Segment)
    const wdsData = [
      0x01, // Window count
      0x00, // Window ID
      0x00, 0x10, // X = 16
      0x00, 0x10, // Y = 16
      0x00, 0x20, // Width = 32
      0x00, 0x10, // Height = 16
    ]
    segments.push(
      0x50, 0x47, // Magic
      0x00, 0x00, 0x16, 0x2E, // PTS
      0x00, 0x00, 0x16, 0x2E, // DTS
      SegmentType.WDS,
      (wdsData.length >> 8) & 0xFF, wdsData.length & 0xFF,
      ...wdsData
    )

    // PDS (Palette Definition Segment)
    const pdsData = [
      0x00, // Palette ID
      0x00, // Version
      0x00, 0x00, 0x00, 0x00, 0x00, // Entry 0: transparent
      0x01, 0xFF, 0x80, 0x80, 0xFF, // Entry 1: white
    ]
    segments.push(
      0x50, 0x47, // Magic
      0x00, 0x00, 0x16, 0x2E, // PTS
      0x00, 0x00, 0x16, 0x2E, // DTS
      SegmentType.PDS,
      (pdsData.length >> 8) & 0xFF, pdsData.length & 0xFF,
      ...pdsData
    )

    // ODS (Object Definition Segment)
    const imageData = [0x01, 0x00, 0x00] // Simple RLE: single pixel with color 1
    const odsData = [
      0x00, 0x00, // Object ID
      0x00, // Version
      0xC0, // Flags (first and last)
      0x00, 0x00, 0x07, // Data length
      0x00, 0x20, // Width = 32
      0x00, 0x10, // Height = 16
      ...imageData,
    ]
    segments.push(
      0x50, 0x47, // Magic
      0x00, 0x00, 0x16, 0x2E, // PTS
      0x00, 0x00, 0x16, 0x2E, // DTS
      SegmentType.ODS,
      (odsData.length >> 8) & 0xFF, odsData.length & 0xFF,
      ...odsData
    )

    // END
    segments.push(
      0x50, 0x47, // Magic
      0x00, 0x00, 0x16, 0x2E, // PTS
      0x00, 0x00, 0x16, 0x2E, // DTS
      SegmentType.END,
      0x00, 0x00 // Size = 0
    )

    const data = new Uint8Array(segments)
    const doc = parsePGS(data)

    expect(doc.events).toHaveLength(1)
    expect(doc.events[0].start).toBeCloseTo(63, 0) // 5678 / 90 ≈ 63ms
    expect(doc.events[0].segments).toHaveLength(1)

    const imageEffect = doc.events[0].segments[0].effects.find(e => e.type === 'image')
    expect(imageEffect).toBeDefined()
    expect(imageEffect?.params.width).toBe(32)
    expect(imageEffect?.params.height).toBe(16)
    expect(imageEffect?.params.x).toBe(16)
    expect(imageEffect?.params.y).toBe(16)

    const pgsEffect = doc.events[0].segments[0].effects.find(e => e.type === 'pgs')
    expect(pgsEffect).toBeDefined()
    expect(pgsEffect?.params.compositionNumber).toBe(0)
    expect(pgsEffect?.params.windowId).toBe(0)
  })

  test('parsePGS - multiple display sets', () => {
    // Build two display sets
    const segments: number[] = []

    for (let i = 0; i < 2; i++) {
      const pts = 5678 + i * 9000 // 100ms apart at 90kHz

      // PCS
      const pcsData = [
        0x04, 0x38, // Width
        0x02, 0x40, // Height
        0x10, // Frame rate
        (i >> 8) & 0xFF, i & 0xFF, // Composition number
        0x80, // State
        0x00, // Palette update
        0x00, // Palette ID
        0x01, // Object count
        0x00, 0x00, // Object ID
        0x00, // Window ID
        0x00, // Flags
        0x00, 0x10, // X
        0x00, 0x10, // Y
      ]
      segments.push(
        0x50, 0x47,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        SegmentType.PCS,
        (pcsData.length >> 8) & 0xFF, pcsData.length & 0xFF,
        ...pcsData
      )

      // WDS
      const wdsData = [0x01, 0x00, 0x00, 0x10, 0x00, 0x10, 0x00, 0x10, 0x00, 0x10]
      segments.push(
        0x50, 0x47,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        SegmentType.WDS,
        (wdsData.length >> 8) & 0xFF, wdsData.length & 0xFF,
        ...wdsData
      )

      // PDS
      const pdsData = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xFF, 0x80, 0x80, 0xFF]
      segments.push(
        0x50, 0x47,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        SegmentType.PDS,
        (pdsData.length >> 8) & 0xFF, pdsData.length & 0xFF,
        ...pdsData
      )

      // ODS
      const imageData = [0x01, 0x00, 0x00]
      const odsData = [0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x07, 0x00, 0x10, 0x00, 0x10, ...imageData]
      segments.push(
        0x50, 0x47,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        SegmentType.ODS,
        (odsData.length >> 8) & 0xFF, odsData.length & 0xFF,
        ...odsData
      )

      // END
      segments.push(
        0x50, 0x47,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        (pts >> 24) & 0xFF, (pts >> 16) & 0xFF, (pts >> 8) & 0xFF, pts & 0xFF,
        SegmentType.END,
        0x00, 0x00
      )
    }

    const data = new Uint8Array(segments)
    const doc = parsePGS(data)

    expect(doc.events).toHaveLength(2)
    expect(doc.events[0].start).toBeCloseTo(63, 0)
    expect(doc.events[0].end).toBeCloseTo(163, 0) // Next subtitle starts at 163ms
    expect(doc.events[1].start).toBeCloseTo(163, 0)
  })

  test('parsePGSResult - collect errors on invalid data', () => {
    const data = new Uint8Array([0x50, 0x47, 0x00, 0x00]) // Incomplete header
    const result = parsePGSResult(data, { onError: 'collect' })

    expect(result.document.events).toHaveLength(0)
  })
})
