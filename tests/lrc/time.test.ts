import { test, expect } from 'bun:test'
import { parseTime, formatTime } from '../../src/lrc/time.ts'

test('parseTime parses centiseconds format', () => {
  expect(parseTime('00:12.34')).toBe(12340)
  expect(parseTime('01:23.45')).toBe(83450)
  expect(parseTime('10:00.00')).toBe(600000)
})

test('parseTime parses milliseconds format', () => {
  expect(parseTime('00:12.340')).toBe(12340)
  expect(parseTime('01:23.456')).toBe(83456)
  expect(parseTime('10:00.000')).toBe(600000)
})

test('parseTime handles zero', () => {
  expect(parseTime('00:00.00')).toBe(0)
  expect(parseTime('00:00.000')).toBe(0)
})

test('parseTime throws on invalid format', () => {
  expect(() => parseTime('invalid')).toThrow()
  expect(() => parseTime('12:34')).toThrow()
  expect(() => parseTime('12.34')).toThrow()
})

test('formatTime with centiseconds', () => {
  expect(formatTime(12340, true)).toBe('00:12.34')
  expect(formatTime(83450, true)).toBe('01:23.45')
  expect(formatTime(600000, true)).toBe('10:00.00')
})

test('formatTime with milliseconds', () => {
  expect(formatTime(12340, false)).toBe('00:12.340')
  expect(formatTime(83456, false)).toBe('01:23.456')
  expect(formatTime(600000, false)).toBe('10:00.000')
})

test('formatTime handles zero', () => {
  expect(formatTime(0, true)).toBe('00:00.00')
  expect(formatTime(0, false)).toBe('00:00.000')
})

test('parseTime and formatTime roundtrip (centiseconds)', () => {
  const times = [0, 12340, 83450, 600000]
  for (const ms of times) {
    const formatted = formatTime(ms, true)
    expect(parseTime(formatted)).toBe(ms)
  }
})

test('parseTime and formatTime roundtrip (milliseconds)', () => {
  const times = [0, 12345, 83456, 600001]
  for (const ms of times) {
    const formatted = formatTime(ms, false)
    expect(parseTime(formatted)).toBe(ms)
  }
})
