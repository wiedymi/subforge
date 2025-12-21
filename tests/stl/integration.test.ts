import { test, expect, describe } from 'bun:test'
import { parseEBUSTL, toEBUSTL } from '../../src/stl/index.ts'
import { parseSpruceSTL, toSpruceSTL } from '../../src/stl/index.ts'
import { parseSRT, toSRT } from '../../src/srt/index.ts'

describe('STL Integration', () => {
  test('convert SRT to EBU-STL and back', () => {
    const srt = `1
00:00:01,000 --> 00:00:05,000
Hello World

2
00:00:07,000 --> 00:00:12,000
Second subtitle
`

    const doc1 = parseSRT(srt)
    expect(doc1.events.length).toBe(2)

    const binary = toEBUSTL(doc1)
    expect(binary.length).toBeGreaterThan(0)

    const doc2 = parseEBUSTL(binary)
    expect(doc2.events.length).toBe(2)
    expect(doc2.events[0].text).toBe('Hello World')
    expect(doc2.events[1].text).toBe('Second subtitle')
  })

  test('convert SRT to Spruce STL and back', () => {
    const srt = `1
00:00:01,000 --> 00:00:05,000
Hello World

2
00:00:07,000 --> 00:00:12,000
Second subtitle
`

    const doc1 = parseSRT(srt)
    const spruceText = toSpruceSTL(doc1)
    const doc2 = parseSpruceSTL(spruceText)

    expect(doc2.events.length).toBe(2)
    expect(doc2.events[0].text).toBe('Hello World')
    expect(doc2.events[1].text).toBe('Second subtitle')

    // Convert back to SRT
    const srt2 = toSRT(doc2)
    expect(srt2).toContain('Hello World')
    expect(srt2).toContain('Second subtitle')
  })

  test('EBU-STL preserves metadata', () => {
    const srt = `1
00:00:01,000 --> 00:00:05,000
Test subtitle
`

    const doc1 = parseSRT(srt)
    doc1.info.title = 'Test Movie'
    doc1.info.author = 'Test Author'

    const binary = toEBUSTL(doc1)
    const doc2 = parseEBUSTL(binary)

    expect(doc2.info.title).toBe('Test Movie')
  })
})
