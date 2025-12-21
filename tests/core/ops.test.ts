import { test, expect } from 'bun:test'
import {
  shiftEvents,
  scaleEvents,
  sortByTime,
  sortByLayer,
  getEventsAt,
  getEventsBetween,
  searchReplace,
  changeStyle,
  getKaraoke,
  getKaraokeOffset,
  scaleKaraoke,
  retimeKaraoke,
  explodeKaraoke,
  getActiveKaraokeSegment,
  getKaraokeProgress
} from '../../src/core/ops.ts'
import { createEvent, createKaraokeEvent } from '../../src/core/document.ts'

test('shiftEvents shifts all events', () => {
  const events = [
    createEvent(0, 1000, 'a'),
    createEvent(1000, 2000, 'b')
  ]
  shiftEvents(events, 500)
  expect(events[0]!.start).toBe(500)
  expect(events[0]!.end).toBe(1500)
  expect(events[1]!.start).toBe(1500)
})

test('shiftEvents negative shift', () => {
  const events = [createEvent(1000, 2000, 'a')]
  shiftEvents(events, -500)
  expect(events[0]!.start).toBe(500)
})

test('scaleEvents scales from pivot', () => {
  const events = [createEvent(1000, 2000, 'a')]
  scaleEvents(events, 2, 0)
  expect(events[0]!.start).toBe(2000)
  expect(events[0]!.end).toBe(4000)
})

test('scaleEvents with non-zero pivot', () => {
  const events = [createEvent(2000, 4000, 'a')]
  scaleEvents(events, 0.5, 2000)
  expect(events[0]!.start).toBe(2000)
  expect(events[0]!.end).toBe(3000)
})

test('sortByTime sorts by start then end', () => {
  const events = [
    createEvent(2000, 3000, 'b'),
    createEvent(1000, 2000, 'a'),
    createEvent(1000, 1500, 'c')
  ]
  sortByTime(events)
  expect(events[0]!.text).toBe('c')
  expect(events[1]!.text).toBe('a')
  expect(events[2]!.text).toBe('b')
})

test('sortByLayer sorts by layer then time', () => {
  const events = [
    createEvent(0, 1000, 'a', { layer: 1 }),
    createEvent(0, 1000, 'b', { layer: 0 })
  ]
  sortByLayer(events)
  expect(events[0]!.text).toBe('b')
  expect(events[1]!.text).toBe('a')
})

test('getEventsAt returns active events', () => {
  const events = [
    createEvent(0, 1000, 'a'),
    createEvent(500, 1500, 'b'),
    createEvent(2000, 3000, 'c')
  ]
  const active = getEventsAt(events, 750)
  expect(active).toHaveLength(2)
})

test('getEventsBetween returns overlapping events', () => {
  const events = [
    createEvent(0, 500, 'a'),
    createEvent(500, 1500, 'b'),
    createEvent(2000, 3000, 'c')
  ]
  const result = getEventsBetween(events, 400, 600)
  expect(result).toHaveLength(2)
})

test('searchReplace replaces text', () => {
  const events = [createEvent(0, 1000, 'Hello World')]
  const count = searchReplace(events, 'World', 'Universe')
  expect(count).toBe(1)
  expect(events[0]!.text).toBe('Hello Universe')
  expect(events[0]!.dirty).toBe(true)
})

test('searchReplace with regex', () => {
  const events = [createEvent(0, 1000, 'test123test')]
  const count = searchReplace(events, /test/g, 'x')
  expect(count).toBe(2)
  expect(events[0]!.text).toBe('x123x')
})

test('changeStyle changes matching styles', () => {
  const events = [
    createEvent(0, 1000, 'a', { style: 'Default' }),
    createEvent(0, 1000, 'b', { style: 'Sign' })
  ]
  const count = changeStyle(events, 'Default', 'Dialog')
  expect(count).toBe(1)
  expect(events[0]!.style).toBe('Dialog')
  expect(events[1]!.style).toBe('Sign')
})

test('getKaraoke returns karaoke effect', () => {
  const event = createKaraokeEvent(0, 1000, [{ text: 'a', duration: 500 }])
  const k = getKaraoke(event.segments[0]!)
  expect(k).not.toBeNull()
  expect(k!.params.duration).toBe(500)
})

test('getKaraokeOffset calculates offset', () => {
  const event = createKaraokeEvent(0, 2000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 300 },
    { text: 'c', duration: 200 }
  ])
  expect(getKaraokeOffset(event.segments, 0)).toBe(0)
  expect(getKaraokeOffset(event.segments, 1)).toBe(500)
  expect(getKaraokeOffset(event.segments, 2)).toBe(800)
})

test('scaleKaraoke scales durations', () => {
  const event = createKaraokeEvent(0, 2000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 500 }
  ])
  scaleKaraoke(event.segments, 2)
  expect(getKaraoke(event.segments[0]!)!.params.duration).toBe(1000)
})

test('explodeKaraoke creates separate events', () => {
  const event = createKaraokeEvent(0, 1000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 500 }
  ])
  const exploded = explodeKaraoke(event)
  expect(exploded).toHaveLength(2)
  expect(exploded[0]!.start).toBe(0)
  expect(exploded[0]!.end).toBe(500)
  expect(exploded[1]!.start).toBe(500)
  expect(exploded[1]!.end).toBe(1000)
})

test('getKaraokeProgress returns 0 at start', () => {
  const event = createKaraokeEvent(0, 1000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 500 }
  ])
  expect(getKaraokeProgress(event.segments, 0)).toBe(0)
})

test('getKaraokeProgress returns 1 at end', () => {
  const event = createKaraokeEvent(0, 1000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 500 }
  ])
  expect(getKaraokeProgress(event.segments, 1000)).toBe(1)
})

test('getKaraokeProgress returns 0.5 at midpoint', () => {
  const event = createKaraokeEvent(0, 1000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 500 }
  ])
  expect(getKaraokeProgress(event.segments, 500)).toBe(0.5)
})

// Coverage: retimeKaraoke (lines 107-115)
test('retimeKaraoke updates durations', () => {
  const event = createKaraokeEvent(0, 1000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 500 }
  ])
  retimeKaraoke(event.segments, [200, 800])
  expect(getKaraoke(event.segments[0]!)!.params.duration).toBe(200)
  expect(getKaraoke(event.segments[1]!)!.params.duration).toBe(800)
})

test('retimeKaraoke with fewer durations than segments', () => {
  const event = createKaraokeEvent(0, 1000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 300 },
    { text: 'c', duration: 200 }
  ])
  retimeKaraoke(event.segments, [100, 200])
  expect(getKaraoke(event.segments[0]!)!.params.duration).toBe(100)
  expect(getKaraoke(event.segments[1]!)!.params.duration).toBe(200)
  expect(getKaraoke(event.segments[2]!)!.params.duration).toBe(200) // unchanged
})

// Coverage: getActiveKaraokeSegment (lines 142-156)
test('getActiveKaraokeSegment returns active segment', () => {
  const event = createKaraokeEvent(0, 1000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 500 }
  ])
  const active = getActiveKaraokeSegment(event.segments, 250)
  expect(active).not.toBeNull()
  expect(active!.text).toBe('a')
})

test('getActiveKaraokeSegment returns second segment', () => {
  const event = createKaraokeEvent(0, 1000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 500 }
  ])
  const active = getActiveKaraokeSegment(event.segments, 750)
  expect(active).not.toBeNull()
  expect(active!.text).toBe('b')
})

test('getActiveKaraokeSegment returns null past end', () => {
  const event = createKaraokeEvent(0, 1000, [
    { text: 'a', duration: 500 },
    { text: 'b', duration: 500 }
  ])
  const active = getActiveKaraokeSegment(event.segments, 1500)
  expect(active).toBeNull()
})

// Coverage: explodeKaraoke with no karaoke (line 121)
test('explodeKaraoke returns original event when no karaoke', () => {
  const event = createEvent(0, 1000, 'Hello')
  const exploded = explodeKaraoke(event)
  expect(exploded).toHaveLength(1)
  expect(exploded[0]).toBe(event)
})

// Coverage: getKaraokeProgress with no durations (line 167)
test('getKaraokeProgress returns 0 when no karaoke', () => {
  const segments = [{ text: 'Hello', style: null, effects: [] }]
  expect(getKaraokeProgress(segments, 500)).toBe(0)
})
