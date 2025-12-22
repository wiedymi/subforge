/**
 * Core operations benchmarks
 * Covers: shifting, scaling, sorting, querying, search/replace
 */

import { bench, group, run } from 'mitata'
import { generateRandomEvents, SIZES } from './_utils.ts'
import {
  shiftEvents,
  scaleEvents,
  sortByTime,
  sortByLayer,
  getEventsAt,
  getEventsBetween,
  searchReplace,
} from '../../src/core/ops.ts'
import {
  findByStyle,
  findByText,
  findByActor,
  findOverlapping,
  findDuplicates,
} from '../../src/core/query.ts'

// ============================================================================
// Generate Test Data
// ============================================================================

const events100 = generateRandomEvents(SIZES.small)
const events1k = generateRandomEvents(SIZES.medium)
const events10k = generateRandomEvents(SIZES.large)
const events100k = generateRandomEvents(SIZES.stress)

// ============================================================================
// Timing Operations
// ============================================================================

group('shiftEvents', () => {
  bench('100 events', () => {
    const copy = events100.map(e => ({ ...e }))
    shiftEvents(copy, 1000)
  })
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
  bench('100 events', () => {
    const copy = events100.map(e => ({ ...e }))
    scaleEvents(copy, 1.5)
  })
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

// ============================================================================
// Sorting Operations
// ============================================================================

group('sortByTime', () => {
  bench('100 events', () => {
    const copy = [...events100]
    sortByTime(copy)
  })
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

group('sortByLayer', () => {
  bench('100 events', () => {
    const copy = [...events100]
    sortByLayer(copy)
  })
  bench('1k events', () => {
    const copy = [...events1k]
    sortByLayer(copy)
  })
  bench('10k events', () => {
    const copy = [...events10k]
    sortByLayer(copy)
  })
})

// ============================================================================
// Query Operations
// ============================================================================

group('getEventsAt', () => {
  bench('100 events', () => getEventsAt(events100, 1800000))
  bench('1k events', () => getEventsAt(events1k, 1800000))
  bench('10k events', () => getEventsAt(events10k, 1800000))
  bench('100k events', () => getEventsAt(events100k, 1800000))
})

group('getEventsBetween', () => {
  bench('100 events', () => getEventsBetween(events100, 1000000, 2000000))
  bench('1k events', () => getEventsBetween(events1k, 1000000, 2000000))
  bench('10k events', () => getEventsBetween(events10k, 1000000, 2000000))
  bench('100k events', () => getEventsBetween(events100k, 1000000, 2000000))
})

group('findByStyle', () => {
  bench('100 events', () => findByStyle(events100, 'Sign'))
  bench('1k events', () => findByStyle(events1k, 'Sign'))
  bench('10k events', () => findByStyle(events10k, 'Sign'))
  bench('100k events', () => findByStyle(events100k, 'Sign'))
})

group('findByActor', () => {
  bench('1k events', () => findByActor(events1k, 'Actor'))
  bench('10k events', () => findByActor(events10k, 'Actor'))
})

group('findByText (string)', () => {
  bench('100 events', () => findByText(events100, 'Line'))
  bench('1k events', () => findByText(events1k, 'Line'))
  bench('10k events', () => findByText(events10k, 'Line'))
})

group('findByText (regex)', () => {
  bench('100 events', () => findByText(events100, /Line \d+/))
  bench('1k events', () => findByText(events1k, /Line \d+/))
  bench('10k events', () => findByText(events10k, /Line \d+/))
})

group('findOverlapping', () => {
  // O(n²) algorithm, so we test smaller sets
  bench('100 events', () => findOverlapping(events100))
  bench('500 events', () => findOverlapping(events1k.slice(0, 500)))
  bench('1k events', () => findOverlapping(events1k))
})

group('findDuplicates', () => {
  bench('100 events', () => findDuplicates(events100))
  bench('1k events', () => findDuplicates(events1k))
  bench('10k events', () => findDuplicates(events10k))
})

// ============================================================================
// Text Operations
// ============================================================================

group('searchReplace', () => {
  bench('100 events', () => {
    const copy = events100.map(e => ({ ...e }))
    searchReplace(copy, 'Line', 'Row')
  })
  bench('1k events', () => {
    const copy = events1k.map(e => ({ ...e }))
    searchReplace(copy, 'Line', 'Row')
  })
  bench('10k events', () => {
    const copy = events10k.map(e => ({ ...e }))
    searchReplace(copy, 'Line', 'Row')
  })
})

group('searchReplace (regex)', () => {
  bench('1k events', () => {
    const copy = events1k.map(e => ({ ...e }))
    searchReplace(copy, /Line (\d+)/, 'Row $1')
  })
  bench('10k events', () => {
    const copy = events10k.map(e => ({ ...e }))
    searchReplace(copy, /Line (\d+)/, 'Row $1')
  })
})

await run()
