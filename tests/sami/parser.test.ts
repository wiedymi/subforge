import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseSAMI } from '../../src/formats/xml/sami/parser.ts'
import { readFileSync } from 'node:fs'

test('parseSAMI basic structure', () => {
  const input = `<SAMI>
<HEAD>
<TITLE>Test</TITLE>
</HEAD>
<BODY>
<SYNC Start=1000><P>Hello</P>
<SYNC Start=3000><P>&nbsp;</P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events.length).toBe(1)
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(3000)
  expect(doc.events[0]!.text).toBe('Hello')
})

test('parseSAMI with class', () => {
  const input = `<SAMI>
<HEAD>
<STYLE TYPE="text/css">
.ENCC { Name: English; lang: en-US; }
</STYLE>
</HEAD>
<BODY>
<SYNC Start=1000><P Class=ENCC>Hello</P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events.length).toBe(1)
  expect(doc.events[0]!.style).toBe('ENCC')
  expect(doc.styles.has('ENCC')).toBe(true)
})

test('parseSAMI multiple sync points', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P>First</P>
<SYNC Start=2000><P>&nbsp;</P>
<SYNC Start=3000><P>Second</P>
<SYNC Start=5000><P>&nbsp;</P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events.length).toBe(2)
  expect(doc.events[0]!.text).toBe('First')
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(2000)
  expect(doc.events[1]!.text).toBe('Second')
  expect(doc.events[1]!.start).toBe(3000)
  expect(doc.events[1]!.end).toBe(5000)
})

test('parseSAMI skips empty markers', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P>Text</P>
<SYNC Start=2000><P>&nbsp;</P>
<SYNC Start=3000><P></P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events.length).toBe(1)
  expect(doc.events[0]!.text).toBe('Text')
})

test('parseSAMI inline bold tag', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><b>bold</b></P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.segments.length).toBe(1)
  expect(doc.events[0]!.segments[0]!.style?.bold).toBe(true)
})

test('parseSAMI inline italic tag', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><i>italic</i></P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.segments[0]!.style?.italic).toBe(true)
})

test('parseSAMI inline underline tag', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><u>underline</u></P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.segments[0]!.style?.underline).toBe(true)
})

test('parseSAMI inline strikeout tag', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><s>strike</s></P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.segments[0]!.style?.strikeout).toBe(true)
})

test('parseSAMI inline font color', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><font color="#FF0000">red</font></P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.segments[0]!.style?.primaryColor).toBeDefined()
})

test('parseSAMI nested tags', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><b><i>bold italic</i></b></P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.segments[0]!.style?.bold).toBe(true)
  expect(doc.events[0]!.segments[0]!.style?.italic).toBe(true)
})

test('parseSAMI HTML entities', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P>&lt;test&gt; &amp; &quot;</P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.text).toBe('<test> & "')
})

test('parseSAMI with BOM', () => {
  const input = '\uFEFF<SAMI><HEAD></HEAD><BODY><SYNC Start=1000><P>Test</P></BODY></SAMI>'

  const doc = unwrap(parseSAMI(input))

  expect(doc.events.length).toBe(1)
})

test('parseSAMI simple.smi fixture', () => {
  const content = readFileSync('/Users/uyakauleu/vivy/experiments/subforge/tests/fixtures/sami/simple.smi', 'utf-8')
  const doc = unwrap(parseSAMI(content))

  expect(doc.events.length).toBe(2)
  expect(doc.events[0]!.text).toBe('Hello')
  expect(doc.events[1]!.text).toBe('World')
  expect(doc.styles.has('ENCC')).toBe(true)
  expect(doc.styles.has('KRCC')).toBe(true)
})

test('parseSAMI case insensitive tags', () => {
  const input = `<sami>
<head></head>
<body>
<sync start=1000><p class=test>Text</p>
</body>
</sami>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events.length).toBe(1)
})

test('parseSAMI without closing P tag', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P>First
<SYNC Start=2000><P>Second
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events.length).toBe(2)
})

test('parseSAMI with multiple spaces in attributes', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC  Start = 1000 ><P  Class = TEST >Text</P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events.length).toBe(1)
  expect(doc.events[0]!.style).toBe('TEST')
})

test('parseSAMI collect mode returns document', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P>Test</P>
</BODY>
</SAMI>`

  const result = parseSAMI(input, { onError: 'collect' })

  expect(result.document.events.length).toBe(1)
  expect(result.ok).toBe(true)
  expect(result.errors.length).toBe(0)
})

test('parseSAMI plain text without tags', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P>Plain text</P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.text).toBe('Plain text')
  expect(doc.events[0]!.dirty).toBe(false)
})

test('parseSAMI mixed plain and styled', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P>Normal <b>bold</b> normal</P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.segments.length).toBe(3)
  expect(doc.events[0]!.dirty).toBe(true)
})

test('parseSAMI unclosed tag', () => {
  const input = `<SAMI>
<HEAD></HEAD>
<BODY>
<SYNC Start=1000><P><b>unclosed</P>
</BODY>
</SAMI>`

  const doc = unwrap(parseSAMI(input))

  expect(doc.events[0]!.text).toBe('unclosed')
})
