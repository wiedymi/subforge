import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseSBV } from '../../src/formats/text/sbv/parser.ts'
import { toSBV } from '../../src/formats/text/sbv/serializer.ts'

test('roundtrip simple file', () => {
  const original = `0:00:01.000,0:00:05.000
Hello world

0:00:06.000,0:00:10.000
Goodbye world`

  const doc = unwrap(parseSBV(original))
  const output = toSBV(doc)
  const reparsed = unwrap(parseSBV(output))

  expect(reparsed.events.length).toBe(2)
  expect(reparsed.events[0]!.start).toBe(1000)
  expect(reparsed.events[0]!.end).toBe(5000)
  expect(reparsed.events[0]!.text).toBe('Hello world')
  expect(reparsed.events[1]!.start).toBe(6000)
  expect(reparsed.events[1]!.end).toBe(10000)
  expect(reparsed.events[1]!.text).toBe('Goodbye world')
})

test('roundtrip multiline text', () => {
  const original = `0:00:01.000,0:00:05.000
First line
Second line
Third line`

  const doc = unwrap(parseSBV(original))
  const output = toSBV(doc)
  const reparsed = unwrap(parseSBV(output))

  expect(reparsed.events[0]!.text).toBe('First line\nSecond line\nThird line')
})

test('roundtrip large timestamps', () => {
  const original = `123:45:06.789,124:56:17.890
Very long video`

  const doc = unwrap(parseSBV(original))
  const output = toSBV(doc)
  const reparsed = unwrap(parseSBV(output))

  expect(reparsed.events[0]!.start).toBe(445506789)
  expect(reparsed.events[0]!.end).toBe(449777890)
})

test('roundtrip with many events', () => {
  let original = ''
  for (let i = 0; i < 100; i++) {
    const start = i * 5000
    const end = start + 4000
    original += `${Math.floor(start / 3600000)}:${String(Math.floor((start % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((start % 60000) / 1000)).padStart(2, '0')}.${String(start % 1000).padStart(3, '0')},${Math.floor(end / 3600000)}:${String(Math.floor((end % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((end % 60000) / 1000)).padStart(2, '0')}.${String(end % 1000).padStart(3, '0')}\n`
    original += `Subtitle ${i + 1}\n\n`
  }

  const doc = unwrap(parseSBV(original))
  const output = toSBV(doc)
  const reparsed = unwrap(parseSBV(output))

  expect(reparsed.events.length).toBe(100)
  expect(reparsed.events[0]!.text).toBe('Subtitle 1')
  expect(reparsed.events[99]!.text).toBe('Subtitle 100')
})

test('roundtrip preserves millisecond precision', () => {
  const original = `0:00:01.123,0:00:05.456
Test`

  const doc = unwrap(parseSBV(original))
  const output = toSBV(doc)
  const reparsed = unwrap(parseSBV(output))

  expect(reparsed.events[0]!.start).toBe(1123)
  expect(reparsed.events[0]!.end).toBe(5456)
})

test('roundtrip preserves text without empty lines', () => {
  const original = `0:00:01.000,0:00:05.000
Line 1
Line 2
Line 3`

  const doc = unwrap(parseSBV(original))
  const output = toSBV(doc)
  const reparsed = unwrap(parseSBV(output))

  expect(reparsed.events[0]!.text).toContain('Line 1')
  expect(reparsed.events[0]!.text).toContain('Line 2')
  expect(reparsed.events[0]!.text).toContain('Line 3')
})

test('roundtrip with fixture file', async () => {
  const fixture = Bun.file('tests/fixtures/sbv/simple.sbv')
  const original = await fixture.text()

  const doc = unwrap(parseSBV(original))
  const output = toSBV(doc)
  const reparsed = unwrap(parseSBV(output))

  expect(reparsed.events.length).toBe(3)
  expect(reparsed.events[0]!.text).toBe('Hello world')
  expect(reparsed.events[2]!.text).toContain('multiline')
})
