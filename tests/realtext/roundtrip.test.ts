import { test, expect } from 'bun:test'
import { parseRealText } from '../../src/realtext/parser.ts'
import { toRealText } from '../../src/realtext/serializer.ts'

test('roundtrip preserves basic structure', () => {
  const original = `<window duration="00:00:10.00" wordwrap="true" bgcolor="black">
<time begin="00:00:01.00"/>
<clear/>First subtitle
<time begin="00:00:05.00"/>
<clear/>Second subtitle
</window>`

  const doc = parseRealText(original)
  const serialized = toRealText(doc)
  const doc2 = parseRealText(serialized)

  expect(doc2.events).toHaveLength(doc.events.length)
  expect(doc2.events[0]!.text).toBe(doc.events[0]!.text)
  expect(doc2.events[1]!.text).toBe(doc.events[1]!.text)
})

test('roundtrip preserves timestamps', () => {
  const original = `<window duration="00:00:10.00" wordwrap="true" bgcolor="black">
<time begin="00:00:01.50"/>
<clear/>Text at 1.5 seconds
<time begin="00:00:05.25"/>
<clear/>Text at 5.25 seconds
</window>`

  const doc = parseRealText(original)
  const serialized = toRealText(doc)
  const doc2 = parseRealText(serialized)

  expect(doc2.events[0]!.start).toBe(doc.events[0]!.start)
  expect(doc2.events[1]!.start).toBe(doc.events[1]!.start)
})

test('roundtrip preserves formatting', () => {
  const original = `<window duration="00:00:10.00" wordwrap="true" bgcolor="black">
<time begin="00:00:01.00"/>
<clear/><b>Bold</b> and <i>italic</i>
</window>`

  const doc = parseRealText(original)
  const serialized = toRealText(doc)
  const doc2 = parseRealText(serialized)

  expect(doc2.events[0]!.text).toContain('<b>Bold</b>')
  expect(doc2.events[0]!.text).toContain('<i>italic</i>')
})

test('roundtrip preserves line breaks', () => {
  const original = `<window duration="00:00:10.00" wordwrap="true" bgcolor="black">
<time begin="00:00:01.00"/>
<clear/>Line one<br/>Line two
</window>`

  const doc = parseRealText(original)
  const serialized = toRealText(doc)
  const doc2 = parseRealText(serialized)

  expect(doc2.events[0]!.text).toBe(doc.events[0]!.text)
})

test('roundtrip handles multiple events', () => {
  const original = `<window duration="00:00:30.00" wordwrap="true" bgcolor="black">
<time begin="00:00:01.00"/>
<clear/>First
<time begin="00:00:10.00"/>
<clear/>Second
<time begin="00:00:20.00"/>
<clear/>Third
</window>`

  const doc = parseRealText(original)
  expect(doc.events).toHaveLength(3)

  const serialized = toRealText(doc)
  const doc2 = parseRealText(serialized)

  expect(doc2.events).toHaveLength(3)
  expect(doc2.events[0]!.text).toBe('First')
  expect(doc2.events[1]!.text).toBe('Second')
  expect(doc2.events[2]!.text).toBe('Third')
})
