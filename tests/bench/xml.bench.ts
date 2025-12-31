/**
 * XML format benchmarks
 * Covers: TTML, DFXP, SMPTE-TT
 */

import { bench, group } from 'mitata'
import { runBench } from './_run.ts'
import {
  loadFixture,
  generateDocument,
  generateTTML,
  SIZES,
} from './_utils.ts'

import { parseTTML, toTTML } from '../../src/formats/xml/ttml/index.ts'
import { parseDFXP, toDFXP } from '../../src/formats/xml/ttml/index.ts'
import { parseSMPTETT, toSMPTETT } from '../../src/formats/xml/ttml/index.ts'

// ============================================================================
// Load Fixtures
// ============================================================================

const ttmlSimple = await loadFixture('ttml/simple.ttml')

// Synthetic TTML at different scales
const ttml1k = generateTTML(SIZES.medium)
const ttml10k = generateTTML(SIZES.large)
const ttml100k = generateTTML(SIZES.stress)

// Pre-parsed documents for serialization
const doc1k = generateDocument(SIZES.medium)
const doc10k = generateDocument(SIZES.large)
const doc100k = generateDocument(SIZES.stress)

// ============================================================================
// TTML Parsing
// ============================================================================

group('TTML parse', () => {
  if (ttmlSimple) bench('simple (real)', () => parseTTML(ttmlSimple))
  bench('1k events', () => parseTTML(ttml1k))
  bench('10k events', () => parseTTML(ttml10k))
  bench('100k events', () => parseTTML(ttml100k))
})

group('TTML serialize', () => {
  bench('1k events', () => toTTML(doc1k))
  bench('10k events', () => toTTML(doc10k))
  bench('100k events', () => toTTML(doc100k))
})

// ============================================================================
// DFXP Parsing (TTML variant)
// ============================================================================

group('DFXP parse', () => {
  if (ttmlSimple) bench('simple (real)', () => parseDFXP(ttmlSimple))
  bench('1k events', () => parseDFXP(ttml1k))
  bench('10k events', () => parseDFXP(ttml10k))
  bench('100k events', () => parseDFXP(ttml100k))
})

group('DFXP serialize', () => {
  bench('1k events', () => toDFXP(doc1k))
  bench('10k events', () => toDFXP(doc10k))
  bench('100k events', () => toDFXP(doc100k))
})

// ============================================================================
// SMPTE-TT Parsing (TTML variant)
// ============================================================================

group('SMPTE-TT parse', () => {
  if (ttmlSimple) bench('simple (real)', () => parseSMPTETT(ttmlSimple))
  bench('1k events', () => parseSMPTETT(ttml1k))
  bench('10k events', () => parseSMPTETT(ttml10k))
  bench('100k events', () => parseSMPTETT(ttml100k))
})

group('SMPTE-TT serialize', () => {
  bench('1k events', () => toSMPTETT(doc1k))
  bench('10k events', () => toSMPTETT(doc10k))
  bench('100k events', () => toSMPTETT(doc100k))
})

await runBench()
