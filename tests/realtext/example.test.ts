import { test, expect } from 'bun:test'
import { parseRealText, toRealText, parseRealTextTime, formatRealTextTime } from '../../src/index.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../../src/core/document.ts'
import type { SubtitleEvent } from '../../src/core/types.ts'

test('example: parse RealText from string', () => {
  const rtContent = `<window duration="00:00:10.00" wordwrap="true" bgcolor="black">
<time begin="00:00:01.00"/>
<clear/>Hello world
<time begin="00:00:05.00"/>
<clear/>Goodbye world
</window>`

  const doc = parseRealText(rtContent)

  expect(doc.events).toHaveLength(2)
  expect(doc.events[0]?.text).toBe('Hello world')
  expect(doc.events[1]?.text).toBe('Goodbye world')
})

test('example: convert SubtitleDocument to RealText', () => {
  const doc = createDocument()

  const event1: SubtitleEvent = {
    id: generateId(),
    start: 1000,
    end: 5000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'First subtitle',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }

  const event2: SubtitleEvent = {
    id: generateId(),
    start: 5000,
    end: 10000,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: 'Second subtitle',
    segments: EMPTY_SEGMENTS,
    dirty: false
  }

  doc.events.push(event1, event2)

  const output = toRealText(doc)

  expect(output).toContain('<window')
  expect(output).toContain('First subtitle')
  expect(output).toContain('Second subtitle')
  expect(output).toContain('<time begin="00:00:01.00"/>')
  expect(output).toContain('<time begin="00:00:05.00"/>')
})

test('example: work with RealText timestamps', () => {
  // Parse time string to milliseconds
  const ms = parseRealTextTime('00:01:30.50')
  expect(ms).toBe(90500)

  // Format milliseconds to RealText time string
  const timeStr = formatRealTextTime(90500)
  expect(timeStr).toBe('00:01:30.50')
})

test('example: RealText with formatting tags', () => {
  const rtContent = `<window duration="00:00:10.00" wordwrap="true" bgcolor="black">
<time begin="00:00:01.00"/>
<clear/><b>Bold text</b> and <i>italic text</i>
</window>`

  const doc = parseRealText(rtContent)

  expect(doc.events[0]?.text).toContain('<b>Bold text</b>')
  expect(doc.events[0]?.text).toContain('<i>italic text</i>')
})
