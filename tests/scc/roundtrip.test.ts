import { test, expect } from 'bun:test'
import { parseSCC } from '../../src/formats/broadcast/scc/parser.ts'
import { toSCC } from '../../src/formats/broadcast/scc/serializer.ts'

const simpleSCC = `Scenarist_SCC V1.0

00:00:01;00	9420 9420 94ad 94ad 9470 9470 4865 6c6c 6f20 776f 726c 6400

00:00:05;00	942c 942c

00:00:06;00	9420 9420 94ad 94ad 9470 9470 476f 6f64 6279 6520 776f 726c 6400

00:00:10;00	942c 942c`

test('roundtrip preserves caption count', () => {
  const doc = parseSCC(simpleSCC)
  const output = toSCC(doc)
  const doc2 = parseSCC(output)

  expect(doc2.events.length).toBe(doc.events.length)
})

test('roundtrip preserves text content', () => {
  const doc = parseSCC(simpleSCC)
  const output = toSCC(doc)
  const doc2 = parseSCC(output)

  expect(doc2.events[0]?.text).toBe(doc.events[0]?.text)
  expect(doc2.events[1]?.text).toBe(doc.events[1]?.text)
})

test('roundtrip preserves timing', () => {
  const doc = parseSCC(simpleSCC)
  const output = toSCC(doc)
  const doc2 = parseSCC(output)

  expect(doc2.events[0]?.start).toBe(doc.events[0]?.start)
  expect(doc2.events[0]?.end).toBe(doc.events[0]?.end)
  expect(doc2.events[1]?.start).toBe(doc.events[1]?.start)
  expect(doc2.events[1]?.end).toBe(doc.events[1]?.end)
})

test('roundtrip handles special characters', () => {
  const scc = `Scenarist_SCC V1.0

00:00:01;00	9420 9420 9130

00:00:05;00	942c 942c`

  const doc = parseSCC(scc)
  const output = toSCC(doc)
  const doc2 = parseSCC(output)

  expect(doc2.events[0]?.text).toBe('®')
})

test('roundtrip maintains valid SCC format', () => {
  const doc = parseSCC(simpleSCC)
  const output = toSCC(doc)

  // Should have header
  expect(output).toContain('Scenarist_SCC V1.0')

  // Should have timecodes
  expect(output).toMatch(/\d{2}:\d{2}:\d{2}[;:]\d{2}/)

  // Should have hex pairs
  expect(output).toMatch(/[0-9a-f]{4}/)
})

test('roundtrip preserves empty document', () => {
  const scc = 'Scenarist_SCC V1.0\n\n'
  const doc = parseSCC(scc)
  const output = toSCC(doc)
  const doc2 = parseSCC(output)

  expect(doc2.events.length).toBe(0)
})

test('multiple roundtrips are stable', () => {
  const doc1 = parseSCC(simpleSCC)
  const output1 = toSCC(doc1)
  const doc2 = parseSCC(output1)
  const output2 = toSCC(doc2)
  const doc3 = parseSCC(output2)

  expect(doc3.events.length).toBe(doc1.events.length)
  expect(doc3.events[0]?.text).toBe(doc1.events[0]?.text)
  expect(doc3.events[0]?.start).toBe(doc1.events[0]?.start)
})

test('roundtrip handles ASCII text', () => {
  const scc = `Scenarist_SCC V1.0

00:00:01;00	9420 9420 5468 6973 2069 7320 6120 7465 7374

00:00:05;00	942c 942c`

  const doc = parseSCC(scc)
  const output = toSCC(doc)
  const doc2 = parseSCC(output)

  expect(doc2.events[0]?.text).toBe(doc.events[0]?.text)
})
