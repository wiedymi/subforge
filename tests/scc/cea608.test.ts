import { test, expect } from 'bun:test'
import { decodeCEA608, encodeCEA608Text, getControlCode, CONTROL_CODES } from '../../src/scc/cea608.ts'

test('decodeCEA608 decodes basic ASCII characters', () => {
  const cmd = decodeCEA608(0x48, 0x65) // 'He'
  expect(cmd).toEqual({ type: 'char', text: 'He' })
})

test('decodeCEA608 decodes single ASCII character', () => {
  const cmd = decodeCEA608(0x48, 0x00) // 'H'
  expect(cmd).toEqual({ type: 'char', text: 'H' })
})

test('decodeCEA608 decodes RCL control code', () => {
  const cmd = decodeCEA608(0x94, 0x20)
  expect(cmd?.type).toBe('control')
  if (cmd?.type === 'control') {
    expect(cmd.name).toBe('RCL')
  }
})

test('decodeCEA608 decodes EDM control code', () => {
  const cmd = decodeCEA608(0x94, 0x2c)
  expect(cmd?.type).toBe('control')
  if (cmd?.type === 'control') {
    expect(cmd.name).toBe('EDM')
  }
})

test('decodeCEA608 decodes EOC control code', () => {
  const cmd = decodeCEA608(0x94, 0x2f)
  expect(cmd?.type).toBe('control')
  if (cmd?.type === 'control') {
    expect(cmd.name).toBe('EOC')
  }
})

test('decodeCEA608 decodes CR control code', () => {
  const cmd = decodeCEA608(0x94, 0x2d)
  expect(cmd?.type).toBe('control')
  if (cmd?.type === 'control') {
    expect(cmd.name).toBe('CR')
  }
})

test('decodeCEA608 decodes special character ®', () => {
  const cmd = decodeCEA608(0x91, 0x30)
  expect(cmd).toEqual({ type: 'char', text: '®' })
})

test('decodeCEA608 decodes special character ♪', () => {
  const cmd = decodeCEA608(0x91, 0x37)
  expect(cmd).toEqual({ type: 'char', text: '♪' })
})

test('encodeCEA608Text encodes basic ASCII', () => {
  const bytes = encodeCEA608Text('Hello')
  expect(bytes.length).toBeGreaterThan(0)
  // Should encode as pairs: 'He', 'll', 'o'
  expect(bytes).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00])
})

test('encodeCEA608Text encodes special characters', () => {
  const bytes = encodeCEA608Text('®')
  expect(bytes.length).toBe(2)
  expect(bytes).toEqual([0x91, 0x30])
})

test('getControlCode returns RCL bytes', () => {
  const [b1, b2] = getControlCode('RCL')
  expect(b1).toBe(0x94)
  expect(b2).toBe(0x20)
})

test('getControlCode returns EDM bytes', () => {
  const [b1, b2] = getControlCode('EDM')
  expect(b1).toBe(0x94)
  expect(b2).toBe(0x2c)
})

test('getControlCode returns EOC bytes', () => {
  const [b1, b2] = getControlCode('EOC')
  expect(b1).toBe(0x94)
  expect(b2).toBe(0x2f)
})

test('decodeCEA608 returns null for padding bytes', () => {
  const cmd = decodeCEA608(0x80, 0x80)
  expect(cmd).toBeNull()
})

test('decodeCEA608 handles space character', () => {
  const cmd = decodeCEA608(0x20, 0x20) // Two spaces
  expect(cmd).toEqual({ type: 'char', text: '  ' })
})
