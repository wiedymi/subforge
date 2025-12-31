import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseSCC } from '../../src/formats/broadcast/scc/parser.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const simpleSCC = `Scenarist_SCC V1.0

00:00:01;00	9420 9420 94ad 94ad 9470 9470 4865 6c6c 6f20 776f 726c 6400

00:00:05;00	942c 942c

00:00:06;00	9420 9420 94ad 94ad 9470 9470 476f 6f64 6279 6520 776f 726c 6400

00:00:10;00	942c 942c`

test('parseSCC parses header', () => {
  const doc = unwrap(parseSCC(simpleSCC))
  expect(doc).toBeDefined()
  expect(doc.events).toBeDefined()
})

test('parseSCC parses basic captions', () => {
  const doc = unwrap(parseSCC(simpleSCC))
  expect(doc.events.length).toBeGreaterThanOrEqual(1)
})

test('parseSCC parses first caption text', () => {
  const doc = unwrap(parseSCC(simpleSCC))
  expect(doc.events[0]?.text).toBe('Hello world')
})

test('parseSCC parses first caption timing', () => {
  const doc = unwrap(parseSCC(simpleSCC))
  const event = doc.events[0]!
  expect(event.start).toBe(1000) // 00:00:01;00
  expect(event.end).toBe(5000)   // 00:00:05;00
})

test('parseSCC parses second caption', () => {
  const doc = unwrap(parseSCC(simpleSCC))
  expect(doc.events.length).toBeGreaterThanOrEqual(2)
  expect(doc.events[1]?.text).toBe('Goodbye world')
})

test('parseSCC parses second caption timing', () => {
  const doc = unwrap(parseSCC(simpleSCC))
  const event = doc.events[1]!
  expect(event.start).toBe(6000)  // 00:00:06;00
  expect(event.end).toBe(10000)   // 00:00:10;00
})

test('parseSCC handles non-drop-frame timecode', () => {
  const scc = `Scenarist_SCC V1.0

00:00:01:00	9420 9420 94ad 94ad 9470 9470 5465 7374

00:00:05:00	942c 942c`

  const doc = unwrap(parseSCC(scc))
  expect(doc.events.length).toBeGreaterThanOrEqual(1)
  expect(doc.events[0]?.text).toBe('Test')
})

test('parseSCC handles BOM', () => {
  const scc = '\uFEFFScenarist_SCC V1.0\n\n00:00:01;00\t9420 9420 4865 6c6c 6f\n\n00:00:05;00\t942c 942c'
  const doc = unwrap(parseSCC(scc))
  expect(doc.events.length).toBeGreaterThanOrEqual(1)
})

test('parseSCC handles Windows line endings', () => {
  const scc = 'Scenarist_SCC V1.0\r\n\r\n00:00:01;00\t9420 9420 4865 6c6c 6f\r\n\r\n00:00:05;00\t942c 942c'
  const doc = unwrap(parseSCC(scc))
  expect(doc.events.length).toBeGreaterThanOrEqual(1)
})

test('parseSCC handles empty captions', () => {
  const scc = `Scenarist_SCC V1.0

00:00:01;00	9420 9420

00:00:05;00	942c 942c`

  const doc = unwrap(parseSCC(scc))
  // Should not create event for empty caption
  expect(doc.events.length).toBe(0)
})

test('parseSCC sets default properties', () => {
  const doc = unwrap(parseSCC(simpleSCC))
  const event = doc.events[0]!
  expect(event.style).toBe('Default')
  expect(event.layer).toBe(0)
  expect(event.actor).toBe('')
})

test('parseSCC creates unique IDs', () => {
  const doc = unwrap(parseSCC(simpleSCC))
  if (doc.events.length >= 2) {
    expect(doc.events[0]!.id).not.toBe(doc.events[1]!.id)
  }
})

test('parseSCC handles special characters', () => {
  const scc = `Scenarist_SCC V1.0

00:00:01;00	9420 9420 9130

00:00:05;00	942c 942c`

  const doc = unwrap(parseSCC(scc))
  expect(doc.events[0]?.text).toBe('®')
})

test('parseSCC collects errors for missing header', () => {
  const scc = '00:00:01;00\t9420 9420 4865 6c6c 6f'
  const result = parseSCC(scc, { onError: 'collect' })
  expect(result.ok).toBe(false)
  expect(result.errors.length).toBeGreaterThan(0)
})

test('parseSCC parses fixture file', () => {
  const fixturePath = join(import.meta.dir, '../fixtures/scc/simple.scc')
  const content = readFileSync(fixturePath, 'utf-8')
  const doc = unwrap(parseSCC(content))
  expect(doc.events.length).toBeGreaterThanOrEqual(1)
})

test('parseSCC handles carriage return', () => {
  const scc = `Scenarist_SCC V1.0

00:00:01;00	9420 9420 4c69 6e65 942d 4f6e 65

00:00:05;00	942c 942c`

  const doc = unwrap(parseSCC(scc))
  expect(doc.events[0]?.text).toContain('\n')
})

test('parseSCC handles multiple lines', () => {
  const scc = `Scenarist_SCC V1.0

00:00:01;00	9420 9420 4c69 6e65 942d 4f6e 65

00:00:02;00	9420 9420 4c69 6e65 942d 5477 6f

00:00:05;00	942c 942c`

  const doc = unwrap(parseSCC(scc))
  expect(doc.events.length).toBeGreaterThanOrEqual(1)
})
