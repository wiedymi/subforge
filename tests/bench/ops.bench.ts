import { bench, run, group } from 'mitata'
import { createDocument, createEvent } from '../../src/core/document.ts'
import {
  shiftEvents,
  scaleEvents,
  sortByTime,
  sortByLayer,
  getEventsAt,
  getEventsBetween,
  searchReplace
} from '../../src/core/ops.ts'
import {
  findByStyle,
  findByText,
  findOverlapping,
  findDuplicates
} from '../../src/core/query.ts'
import type { SubtitleEvent } from '../../src/core/types.ts'

function generateEvents(count: number): SubtitleEvent[] {
  const events: SubtitleEvent[] = []
  for (let i = 0; i < count; i++) {
    const start = Math.floor(Math.random() * 3600000)
    const end = start + Math.floor(Math.random() * 5000) + 1000
    const layer = Math.floor(Math.random() * 5)
    const style = ['Default', 'Sign', 'Title', 'Italic'][Math.floor(Math.random() * 4)]!
    events.push(createEvent(start, end, `Line ${i + 1} with some text`, { layer, style }))
  }
  return events
}

const events1k = generateEvents(1000)
const events10k = generateEvents(10000)
const events100k = generateEvents(100000)

group('shiftEvents', () => {
  bench('1k events', () => {
    const copy = events1k.map(e => ({ ...e }))
    shiftEvents(copy, 1000)
  })
  bench('10k events', () => {
    const copy = events10k.map(e => ({ ...e }))
    shiftEvents(copy, 1000)
  })
  bench('100k events', () => {
    const copy = events100k.map(e => ({ ...e }))
    shiftEvents(copy, 1000)
  })
})

group('scaleEvents', () => {
  bench('1k events', () => {
    const copy = events1k.map(e => ({ ...e }))
    scaleEvents(copy, 1.5)
  })
  bench('10k events', () => {
    const copy = events10k.map(e => ({ ...e }))
    scaleEvents(copy, 1.5)
  })
  bench('100k events', () => {
    const copy = events100k.map(e => ({ ...e }))
    scaleEvents(copy, 1.5)
  })
})

group('sortByTime', () => {
  bench('1k events', () => {
    const copy = [...events1k]
    sortByTime(copy)
  })
  bench('10k events', () => {
    const copy = [...events10k]
    sortByTime(copy)
  })
  bench('100k events', () => {
    const copy = [...events100k]
    sortByTime(copy)
  })
})

group('getEventsAt', () => {
  bench('1k events', () => getEventsAt(events1k, 1800000))
  bench('10k events', () => getEventsAt(events10k, 1800000))
  bench('100k events', () => getEventsAt(events100k, 1800000))
})

group('getEventsBetween', () => {
  bench('1k events', () => getEventsBetween(events1k, 1000000, 2000000))
  bench('10k events', () => getEventsBetween(events10k, 1000000, 2000000))
  bench('100k events', () => getEventsBetween(events100k, 1000000, 2000000))
})

group('findByStyle', () => {
  bench('1k events', () => findByStyle(events1k, 'Sign'))
  bench('10k events', () => findByStyle(events10k, 'Sign'))
  bench('100k events', () => findByStyle(events100k, 'Sign'))
})

group('findByText', () => {
  bench('1k events (string)', () => findByText(events1k, 'line'))
  bench('10k events (string)', () => findByText(events10k, 'line'))
  bench('1k events (regex)', () => findByText(events1k, /Line \d+/))
  bench('10k events (regex)', () => findByText(events10k, /Line \d+/))
})

group('findOverlapping', () => {
  bench('100 events', () => findOverlapping(events1k.slice(0, 100)))
  bench('500 events', () => findOverlapping(events1k.slice(0, 500)))
})

group('searchReplace', () => {
  bench('1k events', () => {
    const copy = events1k.map(e => ({ ...e }))
    searchReplace(copy, 'Line', 'Row')
  })
  bench('10k events', () => {
    const copy = events10k.map(e => ({ ...e }))
    searchReplace(copy, 'Line', 'Row')
  })
})

run()
