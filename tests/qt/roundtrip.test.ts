import { test, expect } from 'bun:test'
import { parseQT } from '../../src/formats/xml/qt/parser.ts'
import { toQT } from '../../src/formats/xml/qt/serializer.ts'

test('roundtrip preserves basic subtitle data', () => {
  const original = `{QTtext} {font:Helvetica}
{plain} {size:12} {textColor: 65535, 65535, 65535}
{backColor: 0, 0, 0}
{justify:center}
{timeScale:1000}
{width:320} {height:60}
{timeStamps:absolute}

[00:00:01.000]
First subtitle

[00:00:05.000]
Second subtitle

[00:00:10.000]
`

  const doc = parseQT(original)
  const serialized = toQT(doc)
  const reparsed = parseQT(serialized)

  expect(reparsed.events).toHaveLength(doc.events.length)
  expect(reparsed.events[0]!.start).toBe(doc.events[0]!.start)
  expect(reparsed.events[0]!.end).toBe(doc.events[0]!.end)
  expect(reparsed.events[0]!.text).toBe(doc.events[0]!.text)
  expect(reparsed.events[1]!.start).toBe(doc.events[1]!.start)
  expect(reparsed.events[1]!.end).toBe(doc.events[1]!.end)
  expect(reparsed.events[1]!.text).toBe(doc.events[1]!.text)
})

test('roundtrip preserves multiline text', () => {
  const original = `{QTtext}
{timeScale:1000}
{timeStamps:absolute}

[00:00:01.000]
Line one
Line two
Line three

[00:00:05.000]
`

  const doc = parseQT(original)
  const serialized = toQT(doc)
  const reparsed = parseQT(serialized)

  expect(reparsed.events[0]!.text).toBe('Line one\nLine two\nLine three')
})

test('roundtrip preserves timing accuracy', () => {
  const original = `{QTtext}
{timeScale:1000}
{timeStamps:absolute}

[00:00:00.123]
Test 1

[00:00:01.456]
Test 2

[00:00:02.789]
`

  const doc = parseQT(original)
  const serialized = toQT(doc)
  const reparsed = parseQT(serialized)

  expect(reparsed.events[0]!.start).toBe(123)
  expect(reparsed.events[0]!.end).toBe(1456)
  expect(reparsed.events[1]!.start).toBe(1456)
  expect(reparsed.events[1]!.end).toBe(2789)
})

test('roundtrip with fixture file', async () => {
  const file = Bun.file('/Users/uyakauleu/vivy/experiments/subforge/tests/fixtures/qt/simple.qt')
  const original = await file.text()

  const doc = parseQT(original)
  const serialized = toQT(doc)
  const reparsed = parseQT(serialized)

  expect(reparsed.events).toHaveLength(doc.events.length)

  for (let i = 0; i < doc.events.length; i++) {
    expect(reparsed.events[i]!.start).toBe(doc.events[i]!.start)
    expect(reparsed.events[i]!.end).toBe(doc.events[i]!.end)
    expect(reparsed.events[i]!.text).toBe(doc.events[i]!.text)
  }
})

test('roundtrip handles long timestamps', () => {
  const original = `{QTtext}
{timeScale:1000}
{timeStamps:absolute}

[01:30:45.678]
Long timestamp

[01:45:30.123]
`

  const doc = parseQT(original)
  const serialized = toQT(doc)
  const reparsed = parseQT(serialized)

  expect(reparsed.events[0]!.start).toBe(5445678)
  expect(reparsed.events[0]!.end).toBe(6330123)
})
