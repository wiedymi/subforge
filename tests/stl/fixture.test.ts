import { test, expect, describe } from 'bun:test'
import { parseEBUSTL } from '../../src/stl/ebu/parser.ts'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('EBU-STL Fixture', () => {
  test('parse simple.stl fixture', () => {
    const fixturePath = resolve(__dirname, '../fixtures/stl/simple.stl')
    const data = new Uint8Array(readFileSync(fixturePath))

    const doc = parseEBUSTL(data)

    expect(doc.info.title).toBe('Simple Test Subtitle')
    expect(doc.events.length).toBe(2)

    expect(doc.events[0].text).toBe('Hello World')
    expect(doc.events[0].start).toBe(1000)
    expect(doc.events[0].end).toBe(5000)

    expect(doc.events[1].text).toBe('Second subtitle')
    expect(doc.events[1].start).toBe(7000)
    expect(doc.events[1].end).toBe(12000)
  })
})
