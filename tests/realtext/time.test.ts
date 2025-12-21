import { test, expect } from 'bun:test'
import { parseTime, formatTime } from '../../src/realtext/time.ts'

test('parseTime parses basic format', () => {
  expect(parseTime('00:00:01.00')).toBe(1000)
  expect(parseTime('00:00:05.00')).toBe(5000)
  expect(parseTime('00:01:00.00')).toBe(60000)
  expect(parseTime('01:00:00.00')).toBe(3600000)
})

test('parseTime handles centiseconds', () => {
  expect(parseTime('00:00:01.50')).toBe(1500)
  expect(parseTime('00:00:01.25')).toBe(1250)
  expect(parseTime('00:00:01.99')).toBe(1990)
})

test('parseTime handles complex times', () => {
  expect(parseTime('01:23:45.67')).toBe(5025670)
})

test('formatTime formats basic times', () => {
  expect(formatTime(1000)).toBe('00:00:01.00')
  expect(formatTime(5000)).toBe('00:00:05.00')
  expect(formatTime(60000)).toBe('00:01:00.00')
  expect(formatTime(3600000)).toBe('01:00:00.00')
})

test('formatTime handles centiseconds', () => {
  expect(formatTime(1500)).toBe('00:00:01.50')
  expect(formatTime(1250)).toBe('00:00:01.25')
  expect(formatTime(1990)).toBe('00:00:01.99')
})

test('formatTime handles complex times', () => {
  expect(formatTime(5025670)).toBe('01:23:45.67')
})

test('roundtrip time conversion', () => {
  const times = [0, 1000, 5000, 60000, 3600000, 1500, 5025670]
  for (const time of times) {
    const formatted = formatTime(time)
    const parsed = parseTime(formatted)
    expect(parsed).toBe(time)
  }
})
