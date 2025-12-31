import { test, expect, describe } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parsePGS } from '../../src/formats/binary/pgs/parser.ts'
import { toPGS } from '../../src/formats/binary/pgs/serializer.ts'
import { readFileSync } from 'fs'

describe('PGS Fixture', () => {
  test('parse simple.sup', () => {
    const data = readFileSync('tests/fixtures/pgs/simple.sup')
    const doc = unwrap(parsePGS(data))

    expect(doc.events).toHaveLength(1)
    expect(doc.events[0].start).toBeCloseTo(1000, 0) // 90000 / 90 = 1000ms

    const image = doc.events[0].image
    expect(image).toBeDefined()
    expect(image?.width).toBe(64)
    expect(image?.height).toBe(32)
    expect(image?.x).toBe(512)
    expect(image?.y).toBe(256)
  })

  test('roundtrip simple.sup', () => {
    const original = readFileSync('tests/fixtures/pgs/simple.sup')
    const doc = unwrap(parsePGS(original))
    const serialized = toPGS(doc)

    expect(serialized.length).toBeGreaterThan(0)

    const reparsed = unwrap(parsePGS(serialized))
    expect(reparsed.events).toHaveLength(1)

    const originalImage = doc.events[0].image
    const reparsedImage = reparsed.events[0].image

    expect(reparsedImage?.width).toBe(originalImage?.width)
    expect(reparsedImage?.height).toBe(originalImage?.height)
  })
})
