import { test, expect } from 'bun:test'
import {
  generateId,
  createDocument,
  createDefaultStyle,
  createEvent,
  createKaraokeEvent,
  cloneDocument,
  cloneEvent
} from '../../src/core/document.ts'

test('generateId creates unique ids', () => {
  const id1 = generateId()
  const id2 = generateId()
  expect(id1).not.toBe(id2)
})

test('generateId returns number', () => {
  const id = generateId()
  expect(typeof id).toBe('number')
})

test('createDocument has default values', () => {
  const doc = createDocument()
  expect(doc.info.playResX).toBe(1920)
  expect(doc.info.playResY).toBe(1080)
  expect(doc.info.scaleBorderAndShadow).toBe(true)
  expect(doc.info.wrapStyle).toBe(0)
  expect(doc.styles.has('Default')).toBe(true)
  expect(doc.events).toHaveLength(0)
  expect(doc.comments).toHaveLength(0)
})

test('createDocument accepts partial info', () => {
  const doc = createDocument({ info: { title: 'Test', playResX: 1280, playResY: 720, scaleBorderAndShadow: true, wrapStyle: 0 } })
  expect(doc.info.title).toBe('Test')
  expect(doc.info.playResX).toBe(1280)
})

test('createDefaultStyle has correct defaults', () => {
  const style = createDefaultStyle()
  expect(style.name).toBe('Default')
  expect(style.fontName).toBe('Arial')
  expect(style.fontSize).toBe(48)
  expect(style.primaryColor).toBe(0x00FFFFFF)
  expect(style.alignment).toBe(2)
})

test('createEvent has correct values', () => {
  const event = createEvent(1000, 5000, 'Hello')
  expect(event.start).toBe(1000)
  expect(event.end).toBe(5000)
  expect(event.text).toBe('Hello')
  expect(event.style).toBe('Default')
  expect(event.dirty).toBe(false)
})

test('createEvent accepts overrides', () => {
  const event = createEvent(0, 1000, 'Test', { style: 'Sign', layer: 1 })
  expect(event.style).toBe('Sign')
  expect(event.layer).toBe(1)
})

test('createKaraokeEvent creates segments', () => {
  const event = createKaraokeEvent(0, 2000, [
    { text: 'He', duration: 500 },
    { text: 'llo', duration: 500 }
  ])
  expect(event.segments).toHaveLength(2)
  expect(event.segments[0]!.text).toBe('He')
  expect(event.segments[0]!.effects[0]!.type).toBe('karaoke')
  expect(event.dirty).toBe(true)
})

test('cloneDocument creates deep copy', () => {
  const doc = createDocument()
  const event = createEvent(0, 1000, 'Test')
  event.image = {
    format: 'indexed',
    width: 2,
    height: 1,
    data: new Uint8Array([1, 2]),
    palette: [0x000000FF, 0xFFFFFFFF],
  }
  event.vobsub = { forced: false, originalIndex: 0 }
  doc.events.push(event)
  const clone = cloneDocument(doc)
  clone.events[0]!.text = 'Modified'
  clone.events[0]!.image!.data[0] = 9
  expect(doc.events[0]!.text).toBe('Test')
  expect(doc.events[0]!.image!.data[0]).toBe(1)
})

test('cloneEvent creates new id', () => {
  const event = createEvent(0, 1000, 'Test')
  event.image = {
    format: 'indexed',
    width: 1,
    height: 1,
    data: new Uint8Array([3]),
  }
  event.pgs = { compositionNumber: 1, windowId: 0 }
  const clone = cloneEvent(event)
  expect(clone.id).not.toBe(event.id)
  expect(clone.text).toBe(event.text)
  expect(clone.image?.data[0]).toBe(3)
  expect(clone.pgs?.compositionNumber).toBe(1)
})
