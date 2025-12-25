import { test, expect, describe } from 'bun:test'
import { parsePGS } from '../../src/formats/binary/pgs/parser.ts'
import { toPGS } from '../../src/formats/binary/pgs/serializer.ts'
import { readFileSync } from 'fs'

describe('PGS Fixture', () => {
  test('parse simple.sup', () => {
    const data = readFileSync('tests/fixtures/pgs/simple.sup')
    const doc = parsePGS(data)

    expect(doc.events).toHaveLength(1)
    expect(doc.events[0].start).toBeCloseTo(1000, 0) // 90000 / 90 = 1000ms

    const imageEffect = doc.events[0].segments[0].effects.find(e => e.type === 'image')
    expect(imageEffect).toBeDefined()
    expect(imageEffect?.params.width).toBe(64)
    expect(imageEffect?.params.height).toBe(32)
    expect(imageEffect?.params.x).toBe(512)
    expect(imageEffect?.params.y).toBe(256)
  })

  test('roundtrip simple.sup', () => {
    const original = readFileSync('tests/fixtures/pgs/simple.sup')
    const doc = parsePGS(original)
    const serialized = toPGS(doc)

    expect(serialized.length).toBeGreaterThan(0)

    const reparsed = parsePGS(serialized)
    expect(reparsed.events).toHaveLength(1)

    const originalImage = doc.events[0].segments[0].effects.find(e => e.type === 'image')
    const reparsedImage = reparsed.events[0].segments[0].effects.find(e => e.type === 'image')

    expect(reparsedImage?.params.width).toBe(originalImage?.params.width)
    expect(reparsedImage?.params.height).toBe(originalImage?.params.height)
  })
})
