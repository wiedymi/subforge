import { test, expect } from 'bun:test'
import { parseTime, formatTime } from '../../src/vtt/time.ts'

test('parseTime parses full VTT timestamp', () => {
  expect(parseTime('00:00:01.500')).toBe(1500)
})

test('parseTime parses hours', () => {
  expect(parseTime('01:23:45.678')).toBe(5025678)
})

test('parseTime parses short format (no hours)', () => {
  expect(parseTime('01:30.500')).toBe(90500)
})

test('parseTime parses zero', () => {
  expect(parseTime('00:00:00.000')).toBe(0)
})

test('parseTime throws on invalid format', () => {
  expect(() => parseTime('invalid')).toThrow()
})

test('parseTime throws on SRT format', () => {
  expect(() => parseTime('00:00:00,000')).toThrow()
})

test('formatTime formats simple', () => {
  expect(formatTime(1500)).toBe('00:00:01.500')
})

test('formatTime formats with hours', () => {
  expect(formatTime(5025678)).toBe('01:23:45.678')
})

test('formatTime formats zero', () => {
  expect(formatTime(0)).toBe('00:00:00.000')
})

test('formatTime pads correctly', () => {
  expect(formatTime(61001)).toBe('00:01:01.001')
})

test('roundtrip preserves value', () => {
  const original = 12345678
  expect(parseTime(formatTime(original))).toBe(original)
})
