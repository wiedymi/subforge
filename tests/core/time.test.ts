import { test, expect } from 'bun:test'
import { formatDuration, clamp, overlap, duration } from '../../src/core/time.ts'

test('formatDuration seconds only', () => {
  expect(formatDuration(5000)).toBe('5s')
})

test('formatDuration minutes and seconds', () => {
  expect(formatDuration(65000)).toBe('1m 5s')
})

test('formatDuration hours minutes seconds', () => {
  expect(formatDuration(3665000)).toBe('1h 1m 5s')
})

test('formatDuration zero', () => {
  expect(formatDuration(0)).toBe('0s')
})

test('clamp returns value in range', () => {
  expect(clamp(50, 0, 100)).toBe(50)
})

test('clamp returns min when below', () => {
  expect(clamp(-10, 0, 100)).toBe(0)
})

test('clamp returns max when above', () => {
  expect(clamp(150, 0, 100)).toBe(100)
})

test('overlap returns true for overlapping ranges', () => {
  expect(overlap(0, 100, 50, 150)).toBe(true)
})

test('overlap returns true for contained range', () => {
  expect(overlap(0, 100, 25, 75)).toBe(true)
})

test('overlap returns false for non-overlapping', () => {
  expect(overlap(0, 100, 100, 200)).toBe(false)
})

test('overlap returns false for completely separate', () => {
  expect(overlap(0, 100, 200, 300)).toBe(false)
})

test('duration calculates event duration', () => {
  expect(duration({ start: 1000, end: 5000 })).toBe(4000)
})

test('duration with zero length', () => {
  expect(duration({ start: 1000, end: 1000 })).toBe(0)
})
