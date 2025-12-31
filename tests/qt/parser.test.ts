import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseQT } from '../../src/formats/xml/qt/parser.ts'

const simpleQT = `{QTtext} {font:Helvetica}
{plain} {size:12} {textColor: 65535, 65535, 65535}
{backColor: 0, 0, 0}
{justify:center}
{timeScale:1000}
{width:320} {height:60}
{timeStamps:absolute}

[00:00:01.000]
First subtitle text

[00:00:05.000]
Second subtitle text

[00:00:10.000]
`

test('parseQT parses basic file', () => {
  const doc = unwrap(parseQT(simpleQT))
  expect(doc.events).toHaveLength(2)
})

test('parseQT parses first subtitle', () => {
  const doc = unwrap(parseQT(simpleQT))
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(5000)
  expect(doc.events[0]!.text).toBe('First subtitle text')
})

test('parseQT parses second subtitle', () => {
  const doc = unwrap(parseQT(simpleQT))
  expect(doc.events[1]!.start).toBe(5000)
  expect(doc.events[1]!.end).toBe(10000)
  expect(doc.events[1]!.text).toBe('Second subtitle text')
})

test('parseQT handles multiline text', () => {
  const qt = `{QTtext}
{timeScale:1000}
{timeStamps:absolute}

[00:00:01.000]
Line one
Line two

[00:00:05.000]
`

  const doc = unwrap(parseQT(qt))
  expect(doc.events[0]!.text).toBe('Line one\nLine two')
})

test('parseQT handles different timeScale', () => {
  const qt = `{QTtext}
{timeScale:600}
{timeStamps:absolute}

[00:00:01.000]
Test subtitle

[00:00:02.000]
`

  const doc = unwrap(parseQT(qt))
  // With timeScale 600, times should still be converted to milliseconds correctly
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(2000)
})

test('parseQT handles short timestamp format', () => {
  const qt = `{QTtext}
{timeScale:1000}
{timeStamps:absolute}

[00:05.000]
Test at 5 seconds

[00:10.000]
`

  const doc = unwrap(parseQT(qt))
  expect(doc.events[0]!.start).toBe(5000)
  expect(doc.events[0]!.end).toBe(10000)
})

test('parseQT from fixture file', async () => {
  const file = Bun.file('/Users/uyakauleu/vivy/experiments/subforge/tests/fixtures/qt/simple.qt')
  const content = await file.text()
  const doc = unwrap(parseQT(content))

  expect(doc.events).toHaveLength(3)
  expect(doc.events[0]!.text).toBe('First subtitle text')
  expect(doc.events[1]!.text).toBe('Second subtitle text')
  expect(doc.events[2]!.text).toBe('Third subtitle text')
})

test('parseQT returns errors and warnings arrays', () => {
  const result = parseQT(simpleQT)
  expect(result.ok).toBe(true)
  expect(result.errors).toBeDefined()
  expect(result.warnings).toBeDefined()
  expect(result.document).toBeDefined()
})

test('parseQT handles empty text (clear subtitle)', () => {
  const qt = `{QTtext}
{timeScale:1000}
{timeStamps:absolute}

[00:00:01.000]
Some text

[00:00:05.000]

[00:00:10.000]
More text

[00:00:15.000]
`

  const doc = unwrap(parseQT(qt))
  expect(doc.events).toHaveLength(2)
  expect(doc.events[0]!.text).toBe('Some text')
  expect(doc.events[1]!.text).toBe('More text')
})
