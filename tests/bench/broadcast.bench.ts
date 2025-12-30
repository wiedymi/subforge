/**
 * Broadcast format benchmarks
 * Covers: SCC (CEA-608), Teletext
 */

import { bench, group, run } from 'mitata'
import {
  loadBinaryFixture,
  loadFixture,
  generateDocument,
  generateSCC,
  SIZES,
} from './_utils.ts'

import { parseSCC, toSCC, decodeCEA608, encodeCEA608Text } from '../../src/formats/broadcast/scc/index.ts'
import { parseTeletext, toTeletext } from '../../src/formats/broadcast/teletext/index.ts'

// ============================================================================
// Load Fixtures
// ============================================================================

const sccSimple = await loadFixture('scc/simple.scc')
const teletextSimple = await loadBinaryFixture('teletext/simple.ttx')

// Synthetic SCC data
const scc1k = generateSCC(SIZES.medium)
const scc10k = generateSCC(SIZES.large)
const scc100k = generateSCC(SIZES.stress)

// Pre-parsed documents for serialization
const doc1k = generateDocument(SIZES.medium)
const doc10k = generateDocument(SIZES.large)
const doc100k = generateDocument(SIZES.stress)

const teletext1k = toTeletext(doc1k)
const teletext10k = toTeletext(doc10k)
const teletext100k = toTeletext(doc100k)

// ============================================================================
// SCC Parsing
// ============================================================================

group('SCC parse', () => {
  if (sccSimple) bench('simple (real)', () => parseSCC(sccSimple))
  bench('1k events', () => parseSCC(scc1k))
  bench('10k events', () => parseSCC(scc10k))
  bench('100k events', () => parseSCC(scc100k))
})

group('SCC serialize', () => {
  bench('1k events', () => toSCC(doc1k))
  bench('10k events', () => toSCC(doc10k))
  bench('100k events', () => toSCC(doc100k))
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
  if (teletextSimple) bench('simple (real)', () => parseTeletext(teletextSimple))
  bench('1k events', () => parseTeletext(teletext1k))
  bench('10k events', () => parseTeletext(teletext10k))
  bench('100k events', () => parseTeletext(teletext100k))
})

group('Teletext serialize', () => {
  bench('1k events', () => toTeletext(doc1k))
  bench('10k events', () => toTeletext(doc10k))
  bench('100k events', () => toTeletext(doc100k))
})

await run()
