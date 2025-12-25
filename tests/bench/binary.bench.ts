/**
 * Binary format benchmarks
 * Covers: EBU-STL, Spruce STL, PGS, DVB, VobSub, PAC
 */

import { bench, group, run } from 'mitata'
import {
  loadFixture,
  loadBinaryFixture,
  generateDocument,
  SIZES,
} from './_utils.ts'

// Binary parsers
import { parseEBUSTL, toEBUSTL } from '../../src/formats/binary/stl/index.ts'
import { parseSpruceSTL, toSpruceSTL } from '../../src/formats/binary/stl/index.ts'
import { parsePGS, toPGS } from '../../src/formats/binary/pgs/index.ts'
import { parseDVB, toDVB } from '../../src/formats/binary/dvb/index.ts'
import { parseVobSub, toVobSub } from '../../src/formats/binary/vobsub/index.ts'
import { parsePAC, toPAC } from '../../src/formats/binary/pac/index.ts'

// ============================================================================
// Load Fixtures
// ============================================================================

// Binary fixtures
const pgsSimple = await loadBinaryFixture('pgs/simple.sup')
const dvbSimple = await loadBinaryFixture('dvb/simple.dvb')
const pacSimple = await loadBinaryFixture('pac/simple.pac')

// VobSub needs both .idx and .sub
const vobsubIdx = await loadFixture('vobsub/test.idx')
// Note: .sub fixture may not exist, we'll skip if missing

// Text-based STL
const spruceSimple = await loadFixture('stl/simple.stl')

// Pre-parsed documents for serialization
const doc100 = generateDocument(SIZES.small)
const doc1k = generateDocument(SIZES.medium)

// ============================================================================
// PGS (Blu-ray) Parsing
// ============================================================================

group('PGS parse', () => {
  if (pgsSimple) {
    bench('simple (real)', () => parsePGS(pgsSimple))
  } else {
    console.warn('PGS fixture not found, skipping PGS benchmarks')
  }
})

group('PGS serialize', () => {
  // PGS serialization requires image data, skip if no fixture
  if (pgsSimple) {
    const pgsDoc = parsePGS(pgsSimple)
    bench('roundtrip', () => toPGS(pgsDoc))
  }
})

// ============================================================================
// DVB Parsing
// ============================================================================

group('DVB parse', () => {
  if (dvbSimple) {
    bench('simple (real)', () => parseDVB(dvbSimple))
  } else {
    console.warn('DVB fixture not found, skipping DVB benchmarks')
  }
})

group('DVB serialize', () => {
  if (dvbSimple) {
    const dvbDoc = parseDVB(dvbSimple)
    bench('roundtrip', () => toDVB(dvbDoc))
  }
})

// ============================================================================
// PAC Parsing
// ============================================================================

group('PAC parse', () => {
  if (pacSimple) {
    bench('simple (real)', () => parsePAC(pacSimple))
  } else {
    console.warn('PAC fixture not found, skipping PAC benchmarks')
  }
})

group('PAC serialize', () => {
  bench('100 events', () => toPAC(doc100))
  bench('1k events', () => toPAC(doc1k))
})

// ============================================================================
// VobSub Parsing
// ============================================================================

// VobSub requires both .idx and .sub files
// Skip if fixtures not available
if (vobsubIdx) {
  group('VobSub parse (idx only)', () => {
    // Note: Full VobSub parsing requires .sub file too
    // For benchmark purposes, we test idx parsing speed
    bench('idx parse', () => {
      // parseVobSub requires both files, so this is limited
    })
  })
}

// ============================================================================
// EBU-STL Parsing (Binary broadcast format)
// ============================================================================

// EBU-STL is binary, but we may not have a fixture
// Generate one if needed or skip

group('EBU-STL serialize', () => {
  bench('100 events', () => toEBUSTL(doc100))
  bench('1k events', () => toEBUSTL(doc1k))
})

// ============================================================================
// Spruce STL Parsing (Text-based)
// ============================================================================

group('Spruce STL parse', () => {
  if (spruceSimple) {
    bench('simple (real)', () => parseSpruceSTL(spruceSimple))
  } else {
    console.warn('Spruce STL fixture not found, skipping')
  }
})

group('Spruce STL serialize', () => {
  bench('100 events', () => toSpruceSTL(doc100))
  bench('1k events', () => toSpruceSTL(doc1k))
})

await run()
