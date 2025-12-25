import { test, expect, describe } from 'bun:test'
import { parseTime, formatTime, parseDuration } from '../../src/formats/xml/ttml/time.ts'

describe('TTML Time Parsing', () => {
  describe('parseTime', () => {
    test('parses clock time format', () => {
      expect(parseTime('00:00:01.000')).toBe(1000)
      expect(parseTime('00:01:00.000')).toBe(60000)
      expect(parseTime('01:00:00.000')).toBe(3600000)
      expect(parseTime('01:23:45.678')).toBe(1 * 3600000 + 23 * 60000 + 45 * 1000 + 678)
    })

    test('parses clock time without milliseconds', () => {
      expect(parseTime('00:00:01')).toBe(1000)
      expect(parseTime('00:01:00')).toBe(60000)
      expect(parseTime('01:00:00')).toBe(3600000)
    })

    test('parses offset time in seconds', () => {
      expect(parseTime('1s')).toBe(1000)
      expect(parseTime('1.5s')).toBe(1500)
      expect(parseTime('123.456s')).toBe(123456)
    })

    test('parses offset time in milliseconds', () => {
      expect(parseTime('100ms')).toBe(100)
      expect(parseTime('1500ms')).toBe(1500)
      expect(parseTime('123.5ms')).toBe(124) // Rounded
    })

    test('parses offset time in minutes', () => {
      expect(parseTime('1m')).toBe(60000)
      expect(parseTime('2.5m')).toBe(150000)
    })

    test('parses offset time in hours', () => {
      expect(parseTime('1h')).toBe(3600000)
      expect(parseTime('2.5h')).toBe(9000000)
    })

    test('parses plain numbers as seconds', () => {
      expect(parseTime('1')).toBe(1000)
      expect(parseTime('1.5')).toBe(1500)
    })

    test('handles frames notation', () => {
      // HH:MM:SS:FF format (frames at 30fps)
      expect(parseTime('00:00:01:00')).toBe(1000)
      expect(parseTime('00:00:01:15')).toBe(1500)
      expect(parseTime('00:00:01:30')).toBe(2000)
    })

    test('handles empty or invalid input', () => {
      expect(parseTime('')).toBe(0)
      expect(parseTime('invalid')).toBe(0)
    })
  })

  describe('formatTime', () => {
    test('formats clock time', () => {
      expect(formatTime(1000, 'clock')).toBe('00:00:01.000')
      expect(formatTime(60000, 'clock')).toBe('00:01:00.000')
      expect(formatTime(3600000, 'clock')).toBe('01:00:00.000')
      expect(formatTime(5025678, 'clock')).toBe('01:23:45.678')
    })

    test('formats offset time', () => {
      expect(formatTime(1000, 'offset')).toBe('1.000s')
      expect(formatTime(1500, 'offset')).toBe('1.500s')
      expect(formatTime(123456, 'offset')).toBe('123.456s')
    })

    test('defaults to clock format', () => {
      expect(formatTime(1000)).toBe('00:00:01.000')
    })

    test('handles zero', () => {
      expect(formatTime(0, 'clock')).toBe('00:00:00.000')
      expect(formatTime(0, 'offset')).toBe('0.000s')
    })

    test('handles large values', () => {
      const tenHours = 10 * 3600000
      expect(formatTime(tenHours, 'clock')).toBe('10:00:00.000')
    })
  })

  describe('parseDuration', () => {
    test('parses duration in seconds', () => {
      expect(parseDuration('1s')).toBe(1000)
      expect(parseDuration('4.5s')).toBe(4500)
    })

    test('parses duration in milliseconds', () => {
      expect(parseDuration('100ms')).toBe(100)
      expect(parseDuration('1500ms')).toBe(1500)
    })

    test('parses duration in minutes', () => {
      expect(parseDuration('1m')).toBe(60000)
      expect(parseDuration('2.5m')).toBe(150000)
    })

    test('parses duration in hours', () => {
      expect(parseDuration('1h')).toBe(3600000)
    })
  })

  describe('roundtrip', () => {
    test('clock format roundtrips', () => {
      const times = [0, 1000, 60000, 3600000, 5025678]
      for (const time of times) {
        const formatted = formatTime(time, 'clock')
        const parsed = parseTime(formatted)
        expect(parsed).toBe(time)
      }
    })

    test('offset format roundtrips', () => {
      const times = [0, 1000, 1500, 60000, 123456]
      for (const time of times) {
        const formatted = formatTime(time, 'offset')
        const parsed = parseTime(formatted)
        expect(parsed).toBe(time)
      }
    })
  })
})
