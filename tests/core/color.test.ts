import { test, expect } from 'bun:test'
import { rgba, fromRGBA, withAlpha, blend, lighten, darken, Colors } from '../../src/core/color.ts'

test('rgba creates ABGR color', () => {
  const color = rgba(255, 0, 0, 0)
  expect(color).toBe(0x000000FF)
})

test('rgba with alpha', () => {
  const color = rgba(255, 0, 0, 128)
  expect(color).toBe(0x800000FF)
})

test('rgba full white', () => {
  const color = rgba(255, 255, 255, 0)
  expect(color).toBe(0x00FFFFFF)
})

test('fromRGBA extracts components', () => {
  const { r, g, b, a } = fromRGBA(0x800000FF)
  expect(r).toBe(255)
  expect(g).toBe(0)
  expect(b).toBe(0)
  expect(a).toBe(128)
})

test('fromRGBA white', () => {
  const { r, g, b, a } = fromRGBA(0x00FFFFFF)
  expect(r).toBe(255)
  expect(g).toBe(255)
  expect(b).toBe(255)
  expect(a).toBe(0)
})

test('withAlpha modifies alpha only', () => {
  const color = 0x00FFFFFF
  const result = withAlpha(color, 128)
  expect(result).toBe(0x80FFFFFF)
})

test('blend interpolates colors', () => {
  const white = Colors.white
  const black = Colors.black
  const gray = blend(black, white, 0.5)
  const { r, g, b } = fromRGBA(gray)
  expect(r).toBeCloseTo(128, 0)
  expect(g).toBeCloseTo(128, 0)
  expect(b).toBeCloseTo(128, 0)
})

test('blend at 0 returns first color', () => {
  const result = blend(Colors.red, Colors.blue, 0)
  expect(result).toBe(Colors.red)
})

test('blend at 1 returns second color', () => {
  const result = blend(Colors.red, Colors.blue, 1)
  expect(result).toBe(Colors.blue)
})

test('lighten blends towards white', () => {
  const result = lighten(Colors.black, 0.5)
  const { r, g, b } = fromRGBA(result)
  expect(r).toBeCloseTo(128, 0)
  expect(g).toBeCloseTo(128, 0)
  expect(b).toBeCloseTo(128, 0)
})

test('darken blends towards black', () => {
  const result = darken(Colors.white, 0.5)
  const { r, g, b } = fromRGBA(result)
  expect(r).toBeCloseTo(128, 0)
  expect(g).toBeCloseTo(128, 0)
  expect(b).toBeCloseTo(128, 0)
})

test('Colors.white is correct', () => {
  expect(Colors.white).toBe(0x00FFFFFF)
})

test('Colors.black is correct', () => {
  expect(Colors.black).toBe(0x00000000)
})

test('Colors.red is ABGR red', () => {
  expect(Colors.red).toBe(0x000000FF)
})

test('Colors.transparent has full alpha', () => {
  expect(Colors.transparent).toBe(0xFF000000)
})
