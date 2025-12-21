import { test, expect } from 'bun:test'
import { parseSBV, parseSBVResult } from '../../src/sbv/parser.ts'

const simpleSBV = `0:00:01.000,0:00:05.000
Hello world

0:00:06.000,0:00:10.000
Goodbye world`

test('parseSBV parses basic file', () => {
  const doc = parseSBV(simpleSBV)
  expect(doc.events).toHaveLength(2)
})

test('parseSBV parses first subtitle', () => {
  const doc = parseSBV(simpleSBV)
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(5000)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseSBV parses second subtitle', () => {
  const doc = parseSBV(simpleSBV)
  expect(doc.events[1]!.start).toBe(6000)
  expect(doc.events[1]!.end).toBe(10000)
  expect(doc.events[1]!.text).toBe('Goodbye world')
})

test('parseSBV handles multiline text', () => {
  const sbv = `0:00:01.000,0:00:05.000
Line one
Line two`

  const doc = parseSBV(sbv)
  expect(doc.events[0]!.text).toBe('Line one\nLine two')
})

test('parseSBV handles empty lines between subtitles', () => {
  const sbv = `0:00:01.000,0:00:05.000
First


0:00:06.000,0:00:10.000
Second`

  const doc = parseSBV(sbv)
  expect(doc.events).toHaveLength(2)
})

test('parseSBV handles Windows line endings', () => {
  const sbv = "0:00:01.000,0:00:05.000\r\nHello world\r\n"
  const doc = parseSBV(sbv)
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseSBV creates unique IDs', () => {
  const doc = parseSBV(simpleSBV)
  expect(doc.events[0]!.id).not.toBe(doc.events[1]!.id)
})

test('parseSBV sets default style', () => {
  const doc = parseSBV(simpleSBV)
  expect(doc.events[0]!.style).toBe('Default')
})

test('parseSBVResult collects errors', () => {
  const sbv = `invalid,0:00:05.000
Hello`

  const result = parseSBVResult(sbv, { onError: 'collect' })
  expect(result.errors.length).toBeGreaterThan(0)
})

test('parseSBV handles BOM', () => {
  const sbv = "\uFEFF0:00:01.000,0:00:05.000\nHello"
  const doc = parseSBV(sbv)
  expect(doc.events).toHaveLength(1)
})

test('parseSBV handles trailing whitespace', () => {
  const sbv = `0:00:01.000,0:00:05.000
Hello world   `

  const doc = parseSBV(sbv)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseSBV handles variable hour format', () => {
  const sbv = `1:23:45.678,2:34:56.789
Long duration`

  const doc = parseSBV(sbv)
  expect(doc.events[0]!.start).toBe(5025678)
  expect(doc.events[0]!.end).toBe(9296789)
})

test('parseSBV handles three digit hours', () => {
  const sbv = `123:45:06.789,124:56:17.890
Very long duration`

  const doc = parseSBV(sbv)
  expect(doc.events[0]!.start).toBe(445506789)
  expect(doc.events[0]!.end).toBe(449777890)
})

test('parseSBV rejects missing comma', () => {
  const sbv = `0:00:01.000 0:00:05.000
Hello`

  expect(() => parseSBV(sbv)).toThrow()
})

test('parseSBV handles no trailing newline', () => {
  const sbv = `0:00:01.000,0:00:05.000
Hello world`

  const doc = parseSBV(sbv)
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.text).toBe('Hello world')
})
