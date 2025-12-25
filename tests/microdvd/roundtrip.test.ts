import { test, expect } from 'bun:test'
import { parseMicroDVD, toMicroDVD } from '../../src/formats/text/microdvd/index.ts'

test('roundtrip - basic subtitles', () => {
  const input = `{0}{100}First subtitle
{150}{300}Second subtitle
{350}{500}Third subtitle
`
  const doc = parseMicroDVD(input, 25)
  const output = toMicroDVD(doc, 25)
  expect(output).toBe(input)
})

test('roundtrip - with line breaks', () => {
  const input = '{150}{300}Second subtitle|with line break\n'
  const doc = parseMicroDVD(input, 25)
  const output = toMicroDVD(doc, 25)
  expect(output).toBe(input)
})

test('roundtrip - with tags', () => {
  const input = `{0}{100}{y:b}Bold text
{150}{300}{y:i}Italic text
{350}{500}{C:$ff0000}Red text
{600}{800}{f:Arial}Arial font
{900}{1100}{s:24}Large text
`
  const doc = parseMicroDVD(input, 25)
  const output = toMicroDVD(doc, 25)
  expect(output).toBe(input)
})

test('roundtrip - fixture file', async () => {
  const file = Bun.file('./tests/fixtures/microdvd/simple.sub')
  const input = await file.text()
  const doc = parseMicroDVD(input, 25)
  const output = toMicroDVD(doc, 25)

  // Parse both and compare events
  const doc1 = parseMicroDVD(input, 25)
  const doc2 = parseMicroDVD(output, 25)

  expect(doc2.events.length).toBe(doc1.events.length)

  for (let i = 0; i < doc1.events.length; i++) {
    expect(doc2.events[i]!.start).toBe(doc1.events[i]!.start)
    expect(doc2.events[i]!.end).toBe(doc1.events[i]!.end)
    expect(doc2.events[i]!.text).toBe(doc1.events[i]!.text)
  }
})

test('roundtrip - different framerates', () => {
  const input = '{0}{100}Text\n'

  const doc25 = parseMicroDVD(input, 25)
  const output25 = toMicroDVD(doc25, 25)
  expect(output25).toBe(input)

  const doc30 = parseMicroDVD(input, 30)
  const output30 = toMicroDVD(doc30, 30)
  expect(output30).toBe(input)
})

test('roundtrip - empty document', () => {
  const input = ''
  const doc = parseMicroDVD(input, 25)
  const output = toMicroDVD(doc, 25)
  expect(output).toBe('')
})
