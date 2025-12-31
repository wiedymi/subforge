/**
 * Scale/stress testing benchmarks
 * Tests all major formats at 1k, 10k, and 100k event counts
 */

import { bench, group, run } from 'mitata'
import {
  generateDocument,
  generateASS,
  generateSSA,
  generateSRT,
  generateVTT,
  generateSBV,
  generateLRC,
  generateMicroDVD,
  generateSAMI,
  generateCAP,
  generateTTML,
  generateSCC,
  SIZES,
} from './_utils.ts'

// Parsers
import { parseASS, toASS } from '../../src/formats/text/ass/index.ts'
import { parseSSA, toSSA } from '../../src/formats/text/ssa/index.ts'
import { parseSRT, toSRT } from '../../src/formats/text/srt/index.ts'
import { parseVTT, toVTT } from '../../src/formats/text/vtt/index.ts'
import { parseSBV, toSBV } from '../../src/formats/text/sbv/index.ts'
import { parseLRC, toLRC } from '../../src/formats/text/lrc/index.ts'
import { parseMicroDVD, toMicroDVD } from '../../src/formats/text/microdvd/index.ts'
import { parseSAMI, toSAMI } from '../../src/formats/xml/sami/index.ts'
import { parseCAP, toCAP } from '../../src/formats/broadcast/cap/index.ts'
import { parseTTML, toTTML } from '../../src/formats/xml/ttml/index.ts'
import { parseSCC, toSCC } from '../../src/formats/broadcast/scc/index.ts'

// ============================================================================
// Generate Test Data
// ============================================================================

console.log('Generating test data...')

// Documents for serialization
const doc1k = generateDocument(SIZES.medium)
const doc10k = generateDocument(SIZES.large)
const doc100k = generateDocument(SIZES.stress)

// Text format strings - 1k
const ass1k = generateASS(SIZES.medium)
const ssa1k = generateSSA(SIZES.medium)
const srt1k = generateSRT(SIZES.medium)
const vtt1k = generateVTT(SIZES.medium)
const sbv1k = generateSBV(SIZES.medium)
const lrc1k = generateLRC(SIZES.medium)
const microdvd1k = generateMicroDVD(SIZES.medium)
const sami1k = generateSAMI(SIZES.medium)
const cap1k = generateCAP(SIZES.medium)
const ttml1k = generateTTML(SIZES.medium)
const scc1k = generateSCC(SIZES.medium)

// Text format strings - 10k
const ass10k = generateASS(SIZES.large)
const ssa10k = generateSSA(SIZES.large)
const srt10k = generateSRT(SIZES.large)
const vtt10k = generateVTT(SIZES.large)
const sbv10k = generateSBV(SIZES.large)
const lrc10k = generateLRC(SIZES.large)
const microdvd10k = generateMicroDVD(SIZES.large)
const sami10k = generateSAMI(SIZES.large)
const cap10k = generateCAP(SIZES.large)
const ttml10k = generateTTML(SIZES.large)
const scc10k = generateSCC(SIZES.large)

// Text format strings - 100k (stress test)
const ass100k = generateASS(SIZES.stress)
const srt100k = generateSRT(SIZES.stress)
const vtt100k = generateVTT(SIZES.stress)

console.log('Test data generated.')

// ============================================================================
// 1k Events - Parse
// ============================================================================

group('Parse 1k events', () => {
  bench('ASS', () => parseASS(ass1k))
  bench('SSA', () => parseSSA(ssa1k))
  bench('SRT', () => parseSRT(srt1k))
  bench('VTT', () => parseVTT(vtt1k))
  bench('SBV', () => parseSBV(sbv1k))
  bench('LRC', () => parseLRC(lrc1k))
  bench('MicroDVD', () => parseMicroDVD(microdvd1k, { fps: 25 }))
  bench('SAMI', () => parseSAMI(sami1k))
  bench('CAP', () => parseCAP(cap1k))
  bench('TTML', () => parseTTML(ttml1k))
  bench('SCC', () => parseSCC(scc1k))
})

// ============================================================================
// 1k Events - Serialize
// ============================================================================

group('Serialize 1k events', () => {
  bench('ASS', () => toASS(doc1k))
  bench('SSA', () => toSSA(doc1k))
  bench('SRT', () => toSRT(doc1k))
  bench('VTT', () => toVTT(doc1k))
  bench('SBV', () => toSBV(doc1k))
  bench('LRC', () => toLRC(doc1k))
  bench('MicroDVD', () => toMicroDVD(doc1k, { fps: 25 }))
  bench('SAMI', () => toSAMI(doc1k))
  bench('CAP', () => toCAP(doc1k))
  bench('TTML', () => toTTML(doc1k))
  bench('SCC', () => toSCC(doc1k))
})

// ============================================================================
// 10k Events - Parse
// ============================================================================

group('Parse 10k events', () => {
  bench('ASS', () => parseASS(ass10k))
  bench('SSA', () => parseSSA(ssa10k))
  bench('SRT', () => parseSRT(srt10k))
  bench('VTT', () => parseVTT(vtt10k))
  bench('SBV', () => parseSBV(sbv10k))
  bench('LRC', () => parseLRC(lrc10k))
  bench('MicroDVD', () => parseMicroDVD(microdvd10k, { fps: 25 }))
  bench('SAMI', () => parseSAMI(sami10k))
  bench('CAP', () => parseCAP(cap10k))
  bench('TTML', () => parseTTML(ttml10k))
  bench('SCC', () => parseSCC(scc10k))
})

// ============================================================================
// 10k Events - Serialize
// ============================================================================

group('Serialize 10k events', () => {
  bench('ASS', () => toASS(doc10k))
  bench('SSA', () => toSSA(doc10k))
  bench('SRT', () => toSRT(doc10k))
  bench('VTT', () => toVTT(doc10k))
  bench('SBV', () => toSBV(doc10k))
  bench('LRC', () => toLRC(doc10k))
  bench('MicroDVD', () => toMicroDVD(doc10k, { fps: 25 }))
  bench('SAMI', () => toSAMI(doc10k))
  bench('CAP', () => toCAP(doc10k))
  bench('TTML', () => toTTML(doc10k))
  bench('SCC', () => toSCC(doc10k))
})

// ============================================================================
// 100k Events - Parse (Core formats only)
// ============================================================================

group('Parse 100k events', () => {
  bench('ASS', () => parseASS(ass100k))
  bench('SRT', () => parseSRT(srt100k))
  bench('VTT', () => parseVTT(vtt100k))
})

// ============================================================================
// 100k Events - Serialize (Core formats only)
// ============================================================================

group('Serialize 100k events', () => {
  bench('ASS', () => toASS(doc100k))
  bench('SRT', () => toSRT(doc100k))
  bench('VTT', () => toVTT(doc100k))
})

await run()
