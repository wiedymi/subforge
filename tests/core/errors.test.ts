import { test, expect } from 'bun:test'
import { SubforgeError } from '../../src/core/errors.ts'
import { detectEncoding } from '../../src/core/encoding.ts'

// Coverage: SubforgeError constructor (lines 46-50)
test('SubforgeError has correct properties', () => {
  const error = new SubforgeError('INVALID_TIMESTAMP', 'Invalid time', { line: 5, column: 10 })
  expect(error.code).toBe('INVALID_TIMESTAMP')
  expect(error.line).toBe(5)
  expect(error.column).toBe(10)
  expect(error.message).toContain('INVALID_TIMESTAMP')
  expect(error.message).toContain('line 5')
  expect(error.name).toBe('SubforgeError')
})

// Coverage: detectEncoding (lines 55-58)
test('detectEncoding detects UTF-8 BOM', () => {
  const buffer = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F])
  expect(detectEncoding(buffer)).toBe('utf-8')
})

test('detectEncoding detects UTF-16LE BOM', () => {
  const buffer = new Uint8Array([0xFF, 0xFE, 0x48, 0x00, 0x65, 0x00])
  expect(detectEncoding(buffer)).toBe('utf-16le')
})

test('detectEncoding detects UTF-16BE BOM', () => {
  const buffer = new Uint8Array([0xFE, 0xFF, 0x00, 0x48, 0x00, 0x65])
  expect(detectEncoding(buffer)).toBe('utf-16be')
})

test('detectEncoding defaults to UTF-8', () => {
  const buffer = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F])
  expect(detectEncoding(buffer)).toBe('utf-8')
})
