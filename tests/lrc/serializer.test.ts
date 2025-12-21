import { test, expect } from 'bun:test'
import { toLRC } from '../../src/lrc/serializer.ts'
import { createDocument, createEvent, createKaraokeEvent } from '../../src/core/document.ts'

test('toLRC outputs basic format', () => {
  const doc = createDocument()
  doc.events.push(createEvent(12340, 15670, 'First line'))
  doc.events.push(createEvent(15670, 18000, 'Second line'))

  const lrc = toLRC(doc, { includeMetadata: false })
  expect(lrc).toContain('[00:12.34]First line')
  expect(lrc).toContain('[00:15.67]Second line')
})

test('toLRC outputs metadata', () => {
  const doc = createDocument()
  doc.info.title = 'Song Title'
  doc.info.author = 'Artist Name'

  const lrc = toLRC(doc)
  expect(lrc).toContain('[ti:Song Title]')
  expect(lrc).toContain('[ar:Artist Name]')
})

test('toLRC sorts events by start time', () => {
  const doc = createDocument()
  doc.events.push(createEvent(20000, 25000, 'Third'))
  doc.events.push(createEvent(10000, 15000, 'First'))
  doc.events.push(createEvent(15000, 20000, 'Second'))

  const lrc = toLRC(doc, { includeMetadata: false })
  const lines = lrc.trim().split('\n')
  expect(lines[0]).toContain('First')
  expect(lines[1]).toContain('Second')
  expect(lines[2]).toContain('Third')
})

test('toLRC outputs enhanced LRC with karaoke', () => {
  const doc = createDocument()
  const event = createKaraokeEvent(12000, 15000, [
    { text: 'Word', duration: 500 },
    { text: 'by', duration: 500 },
    { text: 'word', duration: 500 }
  ])
  doc.events.push(event)

  const lrc = toLRC(doc, { includeMetadata: false })
  expect(lrc).toContain('[00:12.00]')
  expect(lrc).toContain('<00:12.50>Word')
  expect(lrc).toContain('<00:13.00>by')
  expect(lrc).toContain('<00:13.50>word')
})

test('toLRC uses centiseconds by default', () => {
  const doc = createDocument()
  doc.events.push(createEvent(12340, 15670, 'Test'))

  const lrc = toLRC(doc, { includeMetadata: false })
  expect(lrc).toContain('[00:12.34]')
})

test('toLRC can use milliseconds', () => {
  const doc = createDocument()
  doc.events.push(createEvent(12345, 15678, 'Test'))

  const lrc = toLRC(doc, { includeMetadata: false, useCentiseconds: false })
  expect(lrc).toContain('[00:12.345]')
})

test('toLRC applies offset', () => {
  const doc = createDocument()
  doc.events.push(createEvent(10000, 15000, 'Test'))

  const lrc = toLRC(doc, { includeMetadata: true, offset: 500 })
  expect(lrc).toContain('[offset:500]')
  expect(lrc).toContain('[00:10.50]')
})

test('toLRC handles empty document', () => {
  const doc = createDocument()
  const lrc = toLRC(doc, { includeMetadata: false })
  expect(lrc).toBe('')
})

test('toLRC skips metadata when disabled', () => {
  const doc = createDocument()
  doc.info.title = 'Song Title'
  doc.info.author = 'Artist Name'

  const lrc = toLRC(doc, { includeMetadata: false })
  expect(lrc).not.toContain('[ti:')
  expect(lrc).not.toContain('[ar:')
})
