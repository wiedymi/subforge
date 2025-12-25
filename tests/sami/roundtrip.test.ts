import { test, expect } from 'bun:test'
import { parseSAMI } from '../../src/formats/xml/sami/parser.ts'
import { toSAMI } from '../../src/formats/xml/sami/serializer.ts'
import { readFileSync } from 'node:fs'

test('roundtrip simple document', () => {
  const input = `<SAMI>
<HEAD>
<TITLE>Test</TITLE>
<STYLE TYPE="text/css">
<!--
P { margin-left: 8pt; margin-right: 8pt; margin-bottom: 2pt; margin-top: 2pt;
    text-align: center; font-size: 20pt; font-family: Arial; font-weight: normal;
    color: white; }
.ENCC { Name: English; lang: en-US; }
-->
</STYLE>
</HEAD>
<BODY>
<SYNC Start=1000><P Class=ENCC>Hello</P>
<SYNC Start=3000><P Class=ENCC>&nbsp;</P>
<SYNC Start=5000><P Class=ENCC>World</P>
<SYNC Start=8000><P Class=ENCC>&nbsp;</P>
</BODY>
</SAMI>`

  const doc = parseSAMI(input)
  const output = toSAMI(doc)

  expect(output).toContain('Hello')
  expect(output).toContain('World')
  expect(output).toContain('SYNC Start=1000')
  expect(output).toContain('SYNC Start=5000')
})

test('roundtrip with inline styles', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><b>bold</b> <i>italic</i></P>
</BODY>
</SAMI>`

  const doc = parseSAMI(input)
  const output = toSAMI(doc)
  const doc2 = parseSAMI(output)

  expect(doc2.events[0]!.segments.length).toBe(3) // bold, space, italic
  expect(doc2.events[0]!.segments[0]!.style?.bold).toBe(true)
  expect(doc2.events[0]!.segments[2]!.style?.italic).toBe(true)
})

test('roundtrip preserves timing', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1234><P>Test</P>
<SYNC Start=5678><P>&nbsp;</P>
</BODY>
</SAMI>`

  const doc = parseSAMI(input)
  const output = toSAMI(doc)

  expect(output).toContain('SYNC Start=1234')
  expect(output).toContain('SYNC Start=5678')
})

test('roundtrip simple.smi fixture', () => {
  const content = readFileSync('/Users/uyakauleu/vivy/experiments/subforge/tests/fixtures/sami/simple.smi', 'utf-8')
  const doc = parseSAMI(content)
  const output = toSAMI(doc)
  const doc2 = parseSAMI(output)

  expect(doc2.events.length).toBe(doc.events.length)
  expect(doc2.events[0]!.text).toBe(doc.events[0]!.text)
  expect(doc2.events[1]!.text).toBe(doc.events[1]!.text)
  expect(doc2.events[0]!.start).toBe(doc.events[0]!.start)
  expect(doc2.events[1]!.start).toBe(doc.events[1]!.start)
})

test('roundtrip with font colors', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><font color="#FF0000">red</font></P>
</BODY>
</SAMI>`

  const doc = parseSAMI(input)
  const output = toSAMI(doc)
  const doc2 = parseSAMI(output)

  expect(doc2.events[0]!.segments[0]!.style?.primaryColor).toBeDefined()
  expect(doc2.events[0]!.segments[0]!.style?.primaryColor).toBe(doc.events[0]!.segments[0]!.style?.primaryColor)
})

test('roundtrip preserves text content', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P>Test & "quotes" &lt;tags&gt;</P>
</BODY>
</SAMI>`

  const doc = parseSAMI(input)
  const output = toSAMI(doc)
  const doc2 = parseSAMI(output)

  expect(doc2.events[0]!.text).toBe(doc.events[0]!.text)
  expect(doc2.events[0]!.text).toBe('Test & "quotes" <tags>')
})

test('roundtrip nested styles', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><b><i><u>all</u></i></b></P>
</BODY>
</SAMI>`

  const doc = parseSAMI(input)
  const output = toSAMI(doc)
  const doc2 = parseSAMI(output)

  expect(doc2.events[0]!.segments[0]!.style?.bold).toBe(true)
  expect(doc2.events[0]!.segments[0]!.style?.italic).toBe(true)
  expect(doc2.events[0]!.segments[0]!.style?.underline).toBe(true)
})

test('roundtrip multiple events maintain order', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P>First</P>
<SYNC Start=2000><P>&nbsp;</P>
<SYNC Start=3000><P>Second</P>
<SYNC Start=4000><P>&nbsp;</P>
<SYNC Start=5000><P>Third</P>
<SYNC Start=6000><P>&nbsp;</P>
</BODY>
</SAMI>`

  const doc = parseSAMI(input)
  const output = toSAMI(doc)
  const doc2 = parseSAMI(output)

  expect(doc2.events.length).toBe(3)
  expect(doc2.events[0]!.text).toBe('First')
  expect(doc2.events[1]!.text).toBe('Second')
  expect(doc2.events[2]!.text).toBe('Third')
})

test('roundtrip handles out-of-order events', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=3000><P>Second</P>
<SYNC Start=1000><P>First</P>
</BODY>
</SAMI>`

  const doc = parseSAMI(input)
  const output = toSAMI(doc)

  // toSAMI should sort by start time
  const firstIndex = output.indexOf('SYNC Start=1000')
  const secondIndex = output.indexOf('SYNC Start=3000')
  expect(firstIndex).toBeLessThan(secondIndex)
})
