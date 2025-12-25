import { test, expect } from 'bun:test'
import { parseTime, formatTime } from '../../src/formats/text/sbv/time.ts'

test('parseTime parses SBV timestamp with single digit hour', () => {
  expect(parseTime('0:00:01.500')).toBe(1500)
})

test('parseTime parses SBV timestamp with double digit hour', () => {
  expect(parseTime('01:23:45.678')).toBe(5025678)
})

test('parseTime parses zero', () => {
  expect(parseTime('0:00:00.000')).toBe(0)
})

test('parseTime parses large hours', () => {
  expect(parseTime('123:45:06.789')).toBe(445506789)
})

test('parseTime throws on invalid format', () => {
  expect(() => parseTime('invalid')).toThrow()
})

test('parseTime throws on SRT format', () => {
  expect(() => parseTime('00:00:00,000')).toThrow()
})

test('parseTime throws on ASS format', () => {
  expect(() => parseTime('0:00:00.00')).toThrow()
})

test('formatTime formats simple timestamp', () => {
  expect(formatTime(1500)).toBe('0:00:01.500')
})

test('formatTime formats with double digit hours', () => {
  expect(formatTime(5025678)).toBe('1:23:45.678')
})

test('formatTime formats zero', () => {
  expect(formatTime(0)).toBe('0:00:00.000')
})

test('formatTime pads minutes and seconds', () => {
  expect(formatTime(61001)).toBe('0:01:01.001')
})

test('formatTime handles large hours', () => {
  expect(formatTime(445506789)).toBe('123:45:06.789')
})

test('roundtrip preserves value', () => {
  const original = 12345678
  expect(parseTime(formatTime(original))).toBe(original)
})

test('roundtrip preserves small values', () => {
  const original = 123
  expect(parseTime(formatTime(original))).toBe(original)
})
