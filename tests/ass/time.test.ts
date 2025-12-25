import { test, expect } from 'bun:test'
import { parseTime, formatTime } from '../../src/formats/text/ass/time.ts'

test('parseTime parses simple timestamp', () => {
  expect(parseTime('0:00:01.50')).toBe(1500)
})

test('parseTime parses hours', () => {
  expect(parseTime('1:23:45.67')).toBe(5025670)
})

test('parseTime parses zero', () => {
  expect(parseTime('0:00:00.00')).toBe(0)
})

test('parseTime parses large hours', () => {
  expect(parseTime('10:00:00.00')).toBe(36000000)
})

test('parseTime throws on invalid format', () => {
  expect(() => parseTime('invalid')).toThrow()
})

test('parseTime throws on wrong separator', () => {
  expect(() => parseTime('0:00:00,00')).toThrow()
})

test('formatTime formats simple', () => {
  expect(formatTime(1500)).toBe('0:00:01.50')
})

test('formatTime formats with hours', () => {
  expect(formatTime(5025670)).toBe('1:23:45.67')
})

test('formatTime formats zero', () => {
  expect(formatTime(0)).toBe('0:00:00.00')
})

test('formatTime pads minutes and seconds', () => {
  expect(formatTime(61010)).toBe('0:01:01.01')
})

test('roundtrip preserves value', () => {
  const original = 12345670
  expect(parseTime(formatTime(original))).toBe(original)
})

// Coverage: 3-digit milliseconds (line 34)
test('parseTime handles 3-digit milliseconds', () => {
  expect(parseTime('0:00:01.123')).toBe(1123)
})
