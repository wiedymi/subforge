/**
 * XML format benchmarks
 * Covers: TTML, DFXP, SMPTE-TT
 */

import { bench, group, run } from 'mitata'
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
const ttml100 = generateTTML(SIZES.small)
const ttml1k = generateTTML(SIZES.medium)
const ttml10k = generateTTML(SIZES.large)

// Pre-parsed documents for serialization
const doc1k = generateDocument(SIZES.medium)
const doc10k = generateDocument(SIZES.large)

// ============================================================================
// TTML Parsing
// ============================================================================

group('TTML parse', () => {
  if (ttmlSimple) bench('simple (real)', () => parseTTML(ttmlSimple))
  bench('100 events', () => parseTTML(ttml100))
  bench('1k events', () => parseTTML(ttml1k))
  bench('10k events', () => parseTTML(ttml10k))
})

group('TTML serialize', () => {
  bench('1k events', () => toTTML(doc1k))
  bench('10k events', () => toTTML(doc10k))
})

// ============================================================================
// DFXP Parsing (TTML variant)
// ============================================================================

group('DFXP parse', () => {
  if (ttmlSimple) bench('simple (real)', () => parseDFXP(ttmlSimple))
  bench('1k events', () => parseDFXP(ttml1k))
})

group('DFXP serialize', () => {
  bench('1k events', () => toDFXP(doc1k))
})

// ============================================================================
// SMPTE-TT Parsing (TTML variant)
// ============================================================================

group('SMPTE-TT parse', () => {
  if (ttmlSimple) bench('simple (real)', () => parseSMPTETT(ttmlSimple))
  bench('1k events', () => parseSMPTETT(ttml1k))
})

group('SMPTE-TT serialize', () => {
  bench('1k events', () => toSMPTETT(doc1k))
})

await run()
