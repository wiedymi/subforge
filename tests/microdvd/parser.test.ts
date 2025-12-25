import { test, expect } from 'bun:test'
import { parseMicroDVD, parseMicroDVDResult } from '../../src/formats/text/microdvd/index.ts'

test('parseMicroDVD - basic subtitle', () => {
  const input = '{0}{100}First subtitle'
  const doc = parseMicroDVD(input, 25)

  expect(doc.events.length).toBe(1)
  expect(doc.events[0]!.start).toBe(0)
  expect(doc.events[0]!.end).toBe(4000)
  expect(doc.events[0]!.text).toBe('First subtitle')
})

test('parseMicroDVD - multiple subtitles', () => {
  const input = `{0}{100}First subtitle
{150}{300}Second subtitle`
  const doc = parseMicroDVD(input, 25)

  expect(doc.events.length).toBe(2)
  expect(doc.events[0]!.text).toBe('First subtitle')
  expect(doc.events[1]!.text).toBe('Second subtitle')
})

test('parseMicroDVD - pipe as line break', () => {
  const input = '{150}{300}Second subtitle|with line break'
  const doc = parseMicroDVD(input, 25)

  expect(doc.events.length).toBe(1)
  expect(doc.events[0]!.text).toBe('Second subtitle\nwith line break')
})

test('parseMicroDVD - frame to millisecond conversion', () => {
  const doc = parseMicroDVD('{0}{25}One second at 25fps', 25)
  expect(doc.events[0]!.start).toBe(0)
  expect(doc.events[0]!.end).toBe(1000)

  const doc2 = parseMicroDVD('{0}{30}One second at 30fps', 30)
  expect(doc2.events[0]!.start).toBe(0)
  expect(doc2.events[0]!.end).toBe(1000)
})

test('parseMicroDVD - with formatting tags', () => {
  const input = '{350}{500}{y:i}Italic text'
  const doc = parseMicroDVD(input, 25)

  expect(doc.events.length).toBe(1)
  expect(doc.events[0]!.text).toBe('{y:i}Italic text')
})

test('parseMicroDVD - with color tags', () => {
  const input = '{600}{800}{C:$ff0000}Blue colored text'
  const doc = parseMicroDVD(input, 25)

  expect(doc.events.length).toBe(1)
  expect(doc.events[0]!.text).toBe('{C:$ff0000}Blue colored text')
})

test('parseMicroDVD - empty lines ignored', () => {
  const input = `{0}{100}First

{150}{300}Second`
  const doc = parseMicroDVD(input, 25)

  expect(doc.events.length).toBe(2)
})

test('parseMicroDVD - BOM handling', () => {
  const input = '\uFEFF{0}{100}With BOM'
  const doc = parseMicroDVD(input, 25)

  expect(doc.events.length).toBe(1)
  expect(doc.events[0]!.text).toBe('With BOM')
})

test('parseMicroDVDResult - with errors', () => {
  const input = 'Invalid line\n{0}{100}Valid'
  const result = parseMicroDVDResult(input, 25, { onError: 'collect' })

  expect(result.document.events.length).toBe(1)
  expect(result.document.events[0]!.text).toBe('Valid')
})

test('parseMicroDVD - from fixture file', async () => {
  const file = Bun.file('./tests/fixtures/microdvd/simple.sub')
  const input = await file.text()
  const doc = parseMicroDVD(input, 25)

  expect(doc.events.length).toBe(8)
  expect(doc.events[0]!.text).toBe('First subtitle')
  expect(doc.events[1]!.text).toBe('Second subtitle\nwith line break')
  expect(doc.events[2]!.text).toBe('{y:i}Italic text')
})
