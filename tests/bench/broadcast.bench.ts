/**
 * Broadcast format benchmarks
 * Covers: SCC (CEA-608), Teletext
 */

import { bench, group, run } from 'mitata'
import {
  loadFixture,
  generateDocument,
  generateSCC,
  SIZES,
} from './_utils.ts'

import { parseSCC, toSCC, decodeCEA608, encodeCEA608Text } from '../../src/scc/index.ts'
import { parseTeletext, toTeletext } from '../../src/teletext/index.ts'

// ============================================================================
// Load Fixtures
// ============================================================================

const sccSimple = await loadFixture('scc/simple.scc')
const teletextSimple = await loadFixture('teletext/simple.ttx')

// Synthetic SCC data
const scc100 = generateSCC(SIZES.small)
const scc1k = generateSCC(SIZES.medium)

// Pre-parsed documents for serialization
const doc100 = generateDocument(SIZES.small)
const doc1k = generateDocument(SIZES.medium)

// ============================================================================
// SCC Parsing
// ============================================================================

group('SCC parse', () => {
  if (sccSimple) bench('simple (real)', () => parseSCC(sccSimple))
  bench('100 events', () => parseSCC(scc100))
  bench('1k events', () => parseSCC(scc1k))
})

group('SCC serialize', () => {
  bench('100 events', () => toSCC(doc100))
  bench('1k events', () => toSCC(doc1k))
})

// ============================================================================
// CEA-608 Encoding/Decoding
// ============================================================================

// Sample CEA-608 byte pairs
const cea608Samples = [
  [0x94, 0x20], // Resume caption loading
  [0xc8, 0xe9], // "Hi"
  [0x80, 0x80], // Null
]

group('CEA-608 decode', () => {
  bench('decode pair', () => {
    for (const [b1, b2] of cea608Samples) {
      decodeCEA608(b1, b2)
    }
  })
})

group('CEA-608 encode', () => {
  bench('encode text', () => encodeCEA608Text('Hello World'))
  bench('encode long', () => encodeCEA608Text('This is a longer caption that spans multiple characters'))
})

// ============================================================================
// Teletext Parsing
// ============================================================================

group('Teletext parse', () => {
  if (teletextSimple) {
    bench('simple (real)', () => parseTeletext(teletextSimple))
  } else {
    console.warn('Teletext fixture not found, skipping')
  }
})

group('Teletext serialize', () => {
  bench('100 events', () => toTeletext(doc100))
  bench('1k events', () => toTeletext(doc1k))
})

await run()
