import { test, expect } from 'bun:test'
import { toQT } from '../../src/qt/serializer.ts'
import { createDocument, createEvent } from '../../src/core/document.ts'

test('toQT generates basic file', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'First subtitle'))
  doc.events.push(createEvent(5000, 10000, 'Second subtitle'))

  const result = toQT(doc)

  expect(result).toContain('{QTtext}')
  expect(result).toContain('[00:00:01.000]')
  expect(result).toContain('First subtitle')
  expect(result).toContain('[00:00:05.000]')
  expect(result).toContain('Second subtitle')
  expect(result).toContain('[00:00:10.000]')
})

test('toQT includes header directives', () => {
  const doc = createDocument()
  const result = toQT(doc)

  expect(result).toContain('{font:Helvetica}')
  expect(result).toContain('{size:12}')
  expect(result).toContain('{textColor: 65535, 65535, 65535}')
  expect(result).toContain('{backColor: 0, 0, 0}')
  expect(result).toContain('{justify:center}')
  expect(result).toContain('{timeScale:1000}')
  expect(result).toContain('{width:320}')
  expect(result).toContain('{height:60}')
  expect(result).toContain('{timeStamps:absolute}')
})

test('toQT accepts custom options', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Test'))

  const result = toQT(doc, {
    font: 'Arial',
    size: 16,
    justify: 'left',
    width: 640,
    height: 480
  })

  expect(result).toContain('{font:Arial}')
  expect(result).toContain('{size:16}')
  expect(result).toContain('{justify:left}')
  expect(result).toContain('{width:640}')
  expect(result).toContain('{height:480}')
})

test('toQT formats time correctly', () => {
  const doc = createDocument()
  doc.events.push(createEvent(3661500, 3665000, 'Test')) // 1:01:01.500

  const result = toQT(doc)
  expect(result).toContain('[01:01:01.500]')
  expect(result).toContain('[01:01:05.000]')
})

test('toQT handles multiline text', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Line one\nLine two'))

  const result = toQT(doc)
  expect(result).toContain('Line one\nLine two')
})

test('toQT handles custom colors', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Test'))

  const result = toQT(doc, {
    textColor: [255, 0, 0], // Red
    backColor: [0, 255, 0]  // Green
  })

  // RGB 255,0,0 -> QuickTime 65535,0,0
  expect(result).toContain('65535, 0, 0')
  // RGB 0,255,0 -> QuickTime 0,65535,0
  expect(result).toContain('0, 65535, 0')
})

test('toQT adds final clear timestamp', () => {
  const doc = createDocument()
  doc.events.push(createEvent(1000, 5000, 'Test'))

  const result = toQT(doc)
  const lines = result.trim().split('\n')
  const lastLine = lines[lines.length - 1]

  // Should end with empty timestamp to clear
  expect(result).toContain('[00:00:05.000]')
})

test('toQT handles empty document', () => {
  const doc = createDocument()
  const result = toQT(doc)

  // Should still have header
  expect(result).toContain('{QTtext}')
  expect(result).toContain('{timeScale:1000}')
})
