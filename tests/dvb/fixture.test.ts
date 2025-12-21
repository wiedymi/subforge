import { test, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseDVB, toDVB } from '../../src/dvb/index.ts'

test('parseDVB handles fixture file', () => {
  const fixturePath = join(import.meta.dir, '../fixtures/dvb/simple.dvb')
  const data = new Uint8Array(readFileSync(fixturePath))

  const doc = parseDVB(data)

  expect(doc.events.length).toBeGreaterThan(0)
})

test('fixture roundtrip preserves structure', () => {
  const fixturePath = join(import.meta.dir, '../fixtures/dvb/simple.dvb')
  const original = new Uint8Array(readFileSync(fixturePath))

  const doc = parseDVB(original)
  const serialized = toDVB(doc)
  const reparsed = parseDVB(serialized)

  expect(reparsed.events.length).toBe(doc.events.length)
})

test('fixture contains image effects', () => {
  const fixturePath = join(import.meta.dir, '../fixtures/dvb/simple.dvb')
  const data = new Uint8Array(readFileSync(fixturePath))

  const doc = parseDVB(data)

  const hasImageEffect = doc.events.some(event =>
    event.segments.some(seg =>
      seg.effects.some(eff => eff.type === 'image')
    )
  )

  expect(hasImageEffect).toBe(true)
})

test('fixture image has palette', () => {
  const fixturePath = join(import.meta.dir, '../fixtures/dvb/simple.dvb')
  const data = new Uint8Array(readFileSync(fixturePath))

  const doc = parseDVB(data)

  for (const event of doc.events) {
    for (const segment of event.segments) {
      for (const effect of segment.effects) {
        if (effect.type === 'image') {
          const imageEffect = effect as any
          if (imageEffect.params.palette) {
            expect(imageEffect.params.palette.length).toBeGreaterThan(0)
          }
        }
      }
    }
  }
})
