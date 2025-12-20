import { test, expect } from 'bun:test'
import { parseColor, formatColor, parseAlpha, formatAlpha } from '../../src/ass/color.ts'

test('parseColor parses 8-digit color', () => {
  expect(parseColor('&H00FFFFFF&')).toBe(0x00FFFFFF)
})

test('parseColor parses 6-digit color', () => {
  expect(parseColor('&HFFFFFF&')).toBe(0x00FFFFFF)
})

test('parseColor parses with alpha', () => {
  expect(parseColor('&H800000FF&')).toBe(0x800000FF)
})

test('parseColor lowercase', () => {
  expect(parseColor('&hffffff&')).toBe(0x00FFFFFF)
})

test('parseColor without trailing ampersand', () => {
  expect(parseColor('&HFFFFFF')).toBe(0x00FFFFFF)
})

test('parseColor throws on invalid', () => {
  expect(() => parseColor('invalid')).toThrow()
})

test('formatColor formats to 8-digit', () => {
  expect(formatColor(0x00FFFFFF)).toBe('&H00FFFFFF&')
})

test('formatColor formats with alpha', () => {
  expect(formatColor(0x800000FF)).toBe('&H800000FF&')
})

test('formatColor pads zeros', () => {
  expect(formatColor(0x000000FF)).toBe('&H000000FF&')
})

test('parseAlpha parses alpha value', () => {
  expect(parseAlpha('&HFF&')).toBe(255)
})

test('parseAlpha parses zero', () => {
  expect(parseAlpha('&H00&')).toBe(0)
})

test('formatAlpha formats value', () => {
  expect(formatAlpha(255)).toBe('&HFF&')
})

test('formatAlpha pads zeros', () => {
  expect(formatAlpha(15)).toBe('&H0F&')
})

test('roundtrip preserves color', () => {
  const original = 0x800000FF
  expect(parseColor(formatColor(original))).toBe(original)
})
