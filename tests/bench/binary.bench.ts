/**
 * Binary format benchmarks
 * Covers: EBU-STL, Spruce STL, PGS, DVB, VobSub, PAC
 */

import { bench, group, run } from 'mitata'
import {
  loadFixture,
  loadBinaryFixture,
  generateDocument,
  generateDVB,
  generatePGS,
  generateVobSubIdx,
  SIZES,
} from './_utils.ts'

// Binary parsers
import { parseEBUSTL, toEBUSTL } from '../../src/formats/binary/stl/index.ts'
import { parseSpruceSTL, toSpruceSTL } from '../../src/formats/binary/stl/index.ts'
import { parsePGS, toPGS } from '../../src/formats/binary/pgs/index.ts'
import { parseDVB, toDVB } from '../../src/formats/binary/dvb/index.ts'
import { parseVobSub, toVobSub } from '../../src/formats/binary/vobsub/index.ts'
import { parseIdx } from '../../src/formats/binary/vobsub/parser.ts'
import { parsePAC, toPAC } from '../../src/formats/binary/pac/index.ts'

// ============================================================================
// Load Fixtures
// ============================================================================

// Pre-parsed documents for serialization
const doc1k = generateDocument(SIZES.medium)
const doc10k = generateDocument(SIZES.large)
const doc100k = generateDocument(SIZES.stress)

// Binary fixtures
const ebuSimple = await loadBinaryFixture('stl/simple.stl')
const pgsSimple = await loadBinaryFixture('pgs/simple.sup')
const dvbSimple = await loadBinaryFixture('dvb/simple.dvb')
const pacSimple = await loadBinaryFixture('pac/simple.pac')

// VobSub needs both .idx and .sub
const vobsubIdx = await loadFixture('vobsub/test.idx')
// Note: .sub fixture may not exist, we'll skip if missing

// Text-based STL (Spruce)
const spruceFixture = await loadFixture('stl/spruce.stl')
const spruceSample = spruceFixture ?? toSpruceSTL(doc1k)
if (!spruceFixture) {
  console.warn('Spruce STL fixture not found, using generated data')
}

// Generated inputs for parse benchmarks
const ebu1k = toEBUSTL(doc1k)
const ebu10k = toEBUSTL(doc10k)
const ebu100k = toEBUSTL(doc100k)

const pac1k = toPAC(doc1k)
const pac10k = toPAC(doc10k)
const pac100k = toPAC(doc100k)

const spruce1k = toSpruceSTL(doc1k)
const spruce10k = toSpruceSTL(doc10k)
const spruce100k = toSpruceSTL(doc100k)

const pgs1k = generatePGS(SIZES.medium)
const pgs10k = generatePGS(SIZES.large)
const pgs100k = generatePGS(SIZES.stress)

const dvb1k = generateDVB(SIZES.medium)
const dvb10k = generateDVB(SIZES.large)
const dvb100k = generateDVB(SIZES.stress)

const vobsubIdx1k = generateVobSubIdx(SIZES.medium)
const vobsubIdx10k = generateVobSubIdx(SIZES.large)
const vobsubIdx100k = generateVobSubIdx(SIZES.stress)

// ============================================================================
// PGS (Blu-ray) Parsing
// ============================================================================

group('PGS parse', () => {
  if (pgsSimple) {
    bench('simple (real)', () => parsePGS(pgsSimple))
  } else {
    console.warn('PGS fixture not found, skipping PGS benchmarks')
  }
  bench('1k events', () => parsePGS(pgs1k))
  bench('10k events', () => parsePGS(pgs10k))
  bench('100k events', () => parsePGS(pgs100k))
})

group('PGS serialize', () => {
  // PGS serialization requires image data, skip if no fixture
  if (pgsSimple) {
    const pgsDoc = parsePGS(pgsSimple).document
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
  bench('1k events', () => parseDVB(dvb1k))
  bench('10k events', () => parseDVB(dvb10k))
  bench('100k events', () => parseDVB(dvb100k))
})

group('DVB serialize', () => {
  if (dvbSimple) {
    const dvbDoc = parseDVB(dvbSimple).document
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
  bench('1k events', () => parsePAC(pac1k))
  bench('10k events', () => parsePAC(pac10k))
  bench('100k events', () => parsePAC(pac100k))
})

group('PAC serialize', () => {
  bench('1k events', () => toPAC(doc1k))
  bench('10k events', () => toPAC(doc10k))
  bench('100k events', () => toPAC(doc100k))
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
    bench('idx parse', () => parseIdx(vobsubIdx))
    bench('1k events', () => parseIdx(vobsubIdx1k))
    bench('10k events', () => parseIdx(vobsubIdx10k))
    bench('100k events', () => parseIdx(vobsubIdx100k))
  })
}

// ============================================================================
// EBU-STL Parsing (Binary broadcast format)
// ============================================================================

// EBU-STL is binary, but we may not have a fixture
// Generate one if needed or skip

group('EBU-STL serialize', () => {
  bench('1k events', () => toEBUSTL(doc1k))
  bench('10k events', () => toEBUSTL(doc10k))
  bench('100k events', () => toEBUSTL(doc100k))
})

group('EBU-STL parse', () => {
  if (ebuSimple) {
    bench('simple (real)', () => parseEBUSTL(ebuSimple))
  } else {
    console.warn('EBU-STL fixture not found, skipping')
  }
  bench('1k events', () => parseEBUSTL(ebu1k))
  bench('10k events', () => parseEBUSTL(ebu10k))
  bench('100k events', () => parseEBUSTL(ebu100k))
})

// ============================================================================
// Spruce STL Parsing (Text-based)
// ============================================================================

group('Spruce STL parse', () => {
  bench('sample', () => parseSpruceSTL(spruceSample))
  bench('1k events', () => parseSpruceSTL(spruce1k))
  bench('10k events', () => parseSpruceSTL(spruce10k))
  bench('100k events', () => parseSpruceSTL(spruce100k))
})

group('Spruce STL serialize', () => {
  bench('1k events', () => toSpruceSTL(doc1k))
  bench('10k events', () => toSpruceSTL(doc10k))
  bench('100k events', () => toSpruceSTL(doc100k))
})

await run()
