import { test, expect } from 'bun:test'
import { toSAMI } from '../../src/formats/xml/sami/serializer.ts'
import { createDocument, createEvent } from '../../src/core/document.ts'

test('toSAMI basic structure', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 3000, 'Hello'))

  const output = toSAMI(doc)

  expect(output).toContain('<SAMI>')
  expect(output).toContain('<HEAD>')
  expect(output).toContain('<TITLE>')
  expect(output).toContain('<STYLE TYPE="text/css">')
  expect(output).toContain('<BODY>')
  expect(output).toContain('</SAMI>')
})

test('toSAMI sync points', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 3000, 'Hello'))

  const output = toSAMI(doc)

  expect(output).toContain('<SYNC Start=1000>')
  expect(output).toContain('<SYNC Start=3000>')
  expect(output).toContain('Hello')
  expect(output).toContain('&nbsp;')
})

test('toSAMI multiple events', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 2000, 'First'))
  doc.events.push(createEvent(3000, 4000, 'Second'))

  const output = toSAMI(doc)

  expect(output).toContain('First')
  expect(output).toContain('Second')
  expect(output).toMatch(/<SYNC Start=1000>.*First/s)
  expect(output).toMatch(/<SYNC Start=3000>.*Second/s)
})

test('toSAMI with title', () => {
  const doc = createDocument()
  doc.info.title = 'Test Title'
  doc.events.push(createEvent(1000, 2000, 'Text'))

  const output = toSAMI(doc)

  expect(output).toContain('<TITLE>Test Title</TITLE>')
})

test('toSAMI escapes HTML', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 2000, '<test> & "quote"'))

  const output = toSAMI(doc)

  expect(output).toContain('&lt;test&gt;')
  expect(output).toContain('&amp;')
  expect(output).toContain('&quot;')
})

test('toSAMI with segments bold', () => {
  const doc = createDocument()
  const event = createEvent(1000, 2000, 'bold')
  event.segments = [{
    text: 'bold',
    style: { bold: true },
    effects: []
  }]
  event.dirty = true
  doc.events.push(event)

  const output = toSAMI(doc)

  expect(output).toContain('<b>bold</b>')
})

test('toSAMI with segments italic', () => {
  const doc = createDocument()
  const event = createEvent(1000, 2000, 'italic')
  event.segments = [{
    text: 'italic',
    style: { italic: true },
    effects: []
  }]
  event.dirty = true
  doc.events.push(event)

  const output = toSAMI(doc)

  expect(output).toContain('<i>italic</i>')
})

test('toSAMI with segments underline', () => {
  const doc = createDocument()
  const event = createEvent(1000, 2000, 'underline')
  event.segments = [{
    text: 'underline',
    style: { underline: true },
    effects: []
  }]
  event.dirty = true
  doc.events.push(event)

  const output = toSAMI(doc)

  expect(output).toContain('<u>underline</u>')
})

test('toSAMI with segments strikeout', () => {
  const doc = createDocument()
  const event = createEvent(1000, 2000, 'strike')
  event.segments = [{
    text: 'strike',
    style: { strikeout: true },
    effects: []
  }]
  event.dirty = true
  doc.events.push(event)

  const output = toSAMI(doc)

  expect(output).toContain('<s>strike</s>')
})

test('toSAMI with segments color', () => {
  const doc = createDocument()
  const event = createEvent(1000, 2000, 'red')
  event.segments = [{
    text: 'red',
    style: { primaryColor: 0x000000FF }, // red in BGR
    effects: []
  }]
  event.dirty = true
  doc.events.push(event)

  const output = toSAMI(doc)

  expect(output).toContain('<font color="#ff0000">red</font>')
})

test('toSAMI with nested styles', () => {
  const doc = createDocument()
  const event = createEvent(1000, 2000, 'styled')
  event.segments = [{
    text: 'styled',
    style: { bold: true, italic: true },
    effects: []
  }]
  event.dirty = true
  doc.events.push(event)

  const output = toSAMI(doc)

  expect(output).toContain('<b>')
  expect(output).toContain('<i>')
  expect(output).toContain('</i>')
  expect(output).toContain('</b>')
})

test('toSAMI with custom style', () => {
  const doc = createDocument()
  const event = createEvent(1000, 2000, 'Custom')
  event.style = 'CustomStyle'
  doc.events.push(event)

  const output = toSAMI(doc)

  expect(output).toContain('Class=CUSTOMSTYLE')
})

test('toSAMI generates CSS', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 2000, 'Test'))

  const output = toSAMI(doc)

  expect(output).toContain('P {')
  expect(output).toContain('font-family: Arial')
  expect(output).toContain('color: white')
})

test('toSAMI sorts events by start time', () => {
  const doc = createDocument()
  doc.events.push(createEvent(3000, 4000, 'Second'))
  doc.events.push(createEvent(1000, 2000, 'First'))

  const output = toSAMI(doc)

  const firstIndex = output.indexOf('First')
  const secondIndex = output.indexOf('Second')

  expect(firstIndex).toBeLessThan(secondIndex)
})

test('toSAMI with multiple segments', () => {
  const doc = createDocument()
  const event = createEvent(1000, 2000, 'normal bold')
  event.segments = [
    { text: 'normal ', style: null, effects: [] },
    { text: 'bold', style: { bold: true }, effects: [] }
  ]
  event.dirty = true
  doc.events.push(event)

  const output = toSAMI(doc)

  expect(output).toContain('normal <b>bold</b>')
})

test('toSAMI empty document', () => {
  const doc = createDocument()

  const output = toSAMI(doc)

  expect(output).toContain('<SAMI>')
  expect(output).toContain('</SAMI>')
  expect(output).toContain('<BODY>')
})

test('toSAMI clear markers use same class', () => {
  const doc = createDocument()
  const event = createEvent(1000, 3000, 'Test')
  event.style = 'TestClass'
  doc.events.push(event)

  const output = toSAMI(doc)

  const syncLines = output.match(/<SYNC Start=\d+><P Class=\w+>/g)
  expect(syncLines?.length).toBe(2) // start and end
  expect(syncLines?.[0]).toContain('TESTCLASS')
  expect(syncLines?.[1]).toContain('TESTCLASS')
})
