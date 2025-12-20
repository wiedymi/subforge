import { test, expect } from 'bun:test'
import {
  findByStyle,
  findByActor,
  findByLayer,
  findByText,
  findOverlapping,
  findDuplicates
} from '../../src/core/query.ts'
import { createEvent } from '../../src/core/document.ts'

test('findByStyle returns matching events', () => {
  const events = [
    createEvent(0, 1000, 'a', { style: 'Default' }),
    createEvent(1000, 2000, 'b', { style: 'Sign' }),
    createEvent(2000, 3000, 'c', { style: 'Default' }),
  ]
  const found = findByStyle(events, 'Sign')
  expect(found).toHaveLength(1)
  expect(found[0]!.text).toBe('b')
})

test('findByActor returns matching events', () => {
  const events = [
    createEvent(0, 1000, 'a', { actor: 'Alice' }),
    createEvent(1000, 2000, 'b', { actor: 'Bob' }),
  ]
  const found = findByActor(events, 'Alice')
  expect(found).toHaveLength(1)
  expect(found[0]!.text).toBe('a')
})

test('findByLayer returns matching events', () => {
  const events = [
    createEvent(0, 1000, 'a', { layer: 0 }),
    createEvent(1000, 2000, 'b', { layer: 1 }),
    createEvent(2000, 3000, 'c', { layer: 0 }),
  ]
  const found = findByLayer(events, 1)
  expect(found).toHaveLength(1)
  expect(found[0]!.text).toBe('b')
})

test('findByText with string (case insensitive)', () => {
  const events = [
    createEvent(0, 1000, 'Hello World'),
    createEvent(1000, 2000, 'Goodbye'),
  ]
  const found = findByText(events, 'hello')
  expect(found).toHaveLength(1)
  expect(found[0]!.text).toBe('Hello World')
})

test('findByText with regex', () => {
  const events = [
    createEvent(0, 1000, 'test123'),
    createEvent(1000, 2000, 'abc'),
  ]
  const found = findByText(events, /\d+/)
  expect(found).toHaveLength(1)
  expect(found[0]!.text).toBe('test123')
})

test('findOverlapping detects overlaps', () => {
  const events = [
    createEvent(0, 2000, 'a'),
    createEvent(1000, 3000, 'b'),
    createEvent(5000, 6000, 'c'),
  ]
  const overlaps = findOverlapping(events)
  expect(overlaps).toHaveLength(1)
  expect(overlaps[0]![0].text).toBe('a')
  expect(overlaps[0]![1].text).toBe('b')
})

test('findOverlapping returns empty for no overlaps', () => {
  const events = [
    createEvent(0, 1000, 'a'),
    createEvent(1000, 2000, 'b'),
  ]
  const overlaps = findOverlapping(events)
  expect(overlaps).toHaveLength(0)
})

test('findDuplicates finds exact duplicates', () => {
  const events = [
    createEvent(0, 1000, 'Hello'),
    createEvent(0, 1000, 'Hello'),
    createEvent(1000, 2000, 'World'),
  ]
  const dups = findDuplicates(events)
  expect(dups).toHaveLength(1)
  expect(dups[0]).toHaveLength(2)
})

test('findDuplicates returns empty for no duplicates', () => {
  const events = [
    createEvent(0, 1000, 'a'),
    createEvent(1000, 2000, 'b'),
  ]
  const dups = findDuplicates(events)
  expect(dups).toHaveLength(0)
})
