import { test, expect } from 'bun:test'
import { parseVTT, parseVTTResult } from '../../src/vtt/parser.ts'

const simpleVTT = `WEBVTT

00:00:01.000 --> 00:00:05.000
Hello world

00:00:06.000 --> 00:00:10.000
Goodbye world`

test('parseVTT parses basic file', () => {
  const doc = parseVTT(simpleVTT)
  expect(doc.events).toHaveLength(2)
})

test('parseVTT parses first cue', () => {
  const doc = parseVTT(simpleVTT)
  expect(doc.events[0]!.start).toBe(1000)
  expect(doc.events[0]!.end).toBe(5000)
  expect(doc.events[0]!.text).toBe('Hello world')
})

test('parseVTT parses second cue', () => {
  const doc = parseVTT(simpleVTT)
  expect(doc.events[1]!.start).toBe(6000)
  expect(doc.events[1]!.end).toBe(10000)
  expect(doc.events[1]!.text).toBe('Goodbye world')
})

test('parseVTT handles multiline text', () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:05.000
Line one
Line two`

  const doc = parseVTT(vtt)
  expect(doc.events[0]!.text).toBe('Line one\nLine two')
})

test('parseVTT handles cue identifiers', () => {
  const vtt = `WEBVTT

cue-1
00:00:01.000 --> 00:00:05.000
Hello`

  const doc = parseVTT(vtt)
  expect(doc.events).toHaveLength(1)
})

test('parseVTT handles cue settings', () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:05.000 line:0 position:50%
Hello`

  const doc = parseVTT(vtt)
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0]!.text).toBe('Hello')
})

test('parseVTT handles styling tags', () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:05.000
<b>Bold</b> text`

  const doc = parseVTT(vtt)
  expect(doc.events[0]!.text).toBe('<b>Bold</b> text')
})

test('parseVTT handles NOTE comments', () => {
  const vtt = `WEBVTT

NOTE This is a comment

00:00:01.000 --> 00:00:05.000
Hello`

  const doc = parseVTT(vtt)
  expect(doc.events).toHaveLength(1)
})

test('parseVTT handles STYLE blocks', () => {
  const vtt = `WEBVTT

STYLE
::cue { color: white }

00:00:01.000 --> 00:00:05.000
Hello`

  const doc = parseVTT(vtt)
  expect(doc.events).toHaveLength(1)
})

test('parseVTT handles REGION blocks', () => {
  const vtt = `WEBVTT

REGION
id:region1
width:40%
lines:3

00:00:01.000 --> 00:00:05.000
Hello`

  const doc = parseVTT(vtt)
  expect(doc.events).toHaveLength(1)
  expect(doc.regions).toBeDefined()
})

test('parseVTT handles short time format', () => {
  const vtt = `WEBVTT

01:30.500 --> 01:35.500
Hello`

  const doc = parseVTT(vtt)
  expect(doc.events[0]!.start).toBe(90500)
})

test('parseVTT creates unique IDs', () => {
  const doc = parseVTT(simpleVTT)
  expect(doc.events[0]!.id).not.toBe(doc.events[1]!.id)
})

test('parseVTT handles BOM', () => {
  const vtt = "\uFEFFWEBVTT\n\n00:00:01.000 --> 00:00:05.000\nHello"
  const doc = parseVTT(vtt)
  expect(doc.events).toHaveLength(1)
})

test('parseVTTResult collects errors', () => {
  const vtt = `WEBVTT

invalid --> 00:00:05.000
Hello`

  const result = parseVTTResult(vtt, { onError: 'collect' })
  expect(result.errors.length).toBeGreaterThan(0)
})
