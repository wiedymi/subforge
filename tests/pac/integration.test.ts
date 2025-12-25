import { test, expect } from 'bun:test'
import { parsePAC, toPAC } from '../../src/formats/binary/pac/index.ts'
import { createDocument } from '../../src/core/document.ts'

test('PAC integration: create document, serialize, and parse', () => {
  // Create a document programmatically
  const doc = createDocument()
  doc.info.title = 'Test PAC'

  doc.events.push({
    id: 1,
    start: 1000,
    end: 5000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 20,
    effect: '',
    text: 'First subtitle',
    segments: [],
    dirty: false
  })

  doc.events.push({
    id: 2,
    start: 6000,
    end: 10000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 24,
    effect: '',
    text: '{\\i1}Italic text{\\i0}',
    segments: [],
    dirty: false
  })

  // Serialize to PAC
  const pacData = toPAC(doc, 25)
  expect(pacData).toBeInstanceOf(Uint8Array)
  expect(pacData.length).toBeGreaterThan(24)  // At least header size

  // Parse back
  const parsed = parsePAC(pacData)
  expect(parsed.events).toHaveLength(2)
  expect(parsed.events[0]!.text).toBe('First subtitle')
  expect(parsed.events[0]!.start).toBe(1000)
  expect(parsed.events[0]!.end).toBe(5000)
  expect(parsed.events[0]!.marginV).toBe(20)

  expect(parsed.events[1]!.text).toContain('i1')
  expect(parsed.events[1]!.start).toBe(6000)
  expect(parsed.events[1]!.end).toBe(10000)
})

test('PAC integration: read fixture file', async () => {
  const fixtureFile = await Bun.file(new URL('../fixtures/pac/simple.pac', import.meta.url))
  const data = new Uint8Array(await fixtureFile.arrayBuffer())

  const doc = parsePAC(data)
  expect(doc.events).toHaveLength(2)
  expect(doc.events[0]!.text).toBe('Hello world')
  expect(doc.events[1]!.text).toContain('i1')
  expect(doc.events[1]!.text).toContain('Second line')
})

test('PAC integration: NTSC frame rate conversion', () => {
  const doc = createDocument()

  doc.events.push({
    id: 1,
    start: 1000,
    end: 2000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'NTSC test',
    segments: [],
    dirty: false
  })

  // Serialize with NTSC frame rate
  const pacData = toPAC(doc, 29.97)

  // Verify header byte indicates NTSC
  expect(pacData[4]).toBe(0x02)  // NTSC flag

  // Parse back
  const parsed = parsePAC(pacData)
  expect(parsed.events).toHaveLength(1)
  expect(parsed.events[0]!.text).toBe('NTSC test')
  // Allow small rounding differences due to frame rate conversion
  expect(Math.abs(parsed.events[0]!.start - 1000)).toBeLessThan(50)
})
