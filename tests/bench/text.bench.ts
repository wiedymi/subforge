/**
 * Text format benchmarks
 * Covers: ASS, SSA, SRT, VTT, SBV, LRC, MicroDVD, QT, SAMI, RealText, CAP
 */

import { bench, group, run } from 'mitata'
import {
  loadFixture,
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
  generateQT,
  generateRealText,
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
import { parseQT, toQT } from '../../src/formats/xml/qt/index.ts'
import { parseRealText, toRealText } from '../../src/formats/xml/realtext/index.ts'

// ============================================================================
// Load Fixtures
// ============================================================================

// Real-world ASS files
const assRailgun = await loadFixture('ass/railgun_op.ass')
const assAOT = await loadFixture('ass/aot3p2_op.ass')
const assBenchmark = await loadFixture('ass/benchmark.ass')

// Simple fixtures
const ssaSimple = await loadFixture('ssa/simple.ssa')
const sbvSimple = await loadFixture('sbv/simple.sbv')
const lrcSimple = await loadFixture('lrc/simple.lrc')
const microdvdSimple = await loadFixture('microdvd/simple.sub')
const samiSimple = await loadFixture('sami/simple.smi')
const capSimple = await loadFixture('cap/simple.cap')
const qtSimple = await loadFixture('qt/simple.qt')
const realtextSimple = await loadFixture('realtext/simple.rt')

// Synthetic data at different scales
const ass1k = generateASS(SIZES.medium)
const ass10k = generateASS(SIZES.large)
const ass100k = generateASS(SIZES.stress)

const ssa1k = generateSSA(SIZES.medium)
const ssa10k = generateSSA(SIZES.large)
const ssa100k = generateSSA(SIZES.stress)

const srt1k = generateSRT(SIZES.medium)
const srt10k = generateSRT(SIZES.large)
const srt100k = generateSRT(SIZES.stress)

const vtt1k = generateVTT(SIZES.medium)
const vtt10k = generateVTT(SIZES.large)
const vtt100k = generateVTT(SIZES.stress)

const sbv1k = generateSBV(SIZES.medium)
const sbv10k = generateSBV(SIZES.large)
const sbv100k = generateSBV(SIZES.stress)

const lrc1k = generateLRC(SIZES.medium)
const lrc10k = generateLRC(SIZES.large)
const lrc100k = generateLRC(SIZES.stress)

const microdvd1k = generateMicroDVD(SIZES.medium)
const microdvd10k = generateMicroDVD(SIZES.large)
const microdvd100k = generateMicroDVD(SIZES.stress)

const sami1k = generateSAMI(SIZES.medium)
const sami10k = generateSAMI(SIZES.large)
const sami100k = generateSAMI(SIZES.stress)

const cap1k = generateCAP(SIZES.medium)
const cap10k = generateCAP(SIZES.large)
const cap100k = generateCAP(SIZES.stress)

const qt1k = generateQT(SIZES.medium)
const qt10k = generateQT(SIZES.large)
const qt100k = generateQT(SIZES.stress)

const realtext1k = generateRealText(SIZES.medium)
const realtext10k = generateRealText(SIZES.large)
const realtext100k = generateRealText(SIZES.stress)

// Pre-parsed documents for serialization
const doc1k = generateDocument(SIZES.medium)
const doc10k = generateDocument(SIZES.large)
const doc100k = generateDocument(SIZES.stress)

// ============================================================================
// ASS Parsing
// ============================================================================

group('ASS parse', () => {
  if (assRailgun) bench('railgun_op (real)', () => parseASS(assRailgun))
  if (assAOT) bench('aot3p2_op (real)', () => parseASS(assAOT))
  if (assBenchmark) bench('benchmark (real)', () => parseASS(assBenchmark))
  bench('1k events', () => parseASS(ass1k))
  bench('10k events', () => parseASS(ass10k))
  bench('100k events', () => parseASS(ass100k))
})

group('ASS serialize', () => {
  bench('1k events', () => toASS(doc1k))
  bench('10k events', () => toASS(doc10k))
  bench('100k events', () => toASS(doc100k))
})

// ============================================================================
// SSA Parsing
// ============================================================================

group('SSA parse', () => {
  if (ssaSimple) bench('simple (real)', () => parseSSA(ssaSimple))
  bench('1k events', () => parseSSA(ssa1k))
  bench('10k events', () => parseSSA(ssa10k))
  bench('100k events', () => parseSSA(ssa100k))
})

group('SSA serialize', () => {
  bench('1k events', () => toSSA(doc1k))
  bench('10k events', () => toSSA(doc10k))
  bench('100k events', () => toSSA(doc100k))
})

// ============================================================================
// SRT Parsing
// ============================================================================

group('SRT parse', () => {
  bench('1k events', () => parseSRT(srt1k))
  bench('10k events', () => parseSRT(srt10k))
  bench('100k events', () => parseSRT(srt100k))
})

group('SRT serialize', () => {
  bench('1k events', () => toSRT(doc1k))
  bench('10k events', () => toSRT(doc10k))
  bench('100k events', () => toSRT(doc100k))
})

// ============================================================================
// VTT Parsing
// ============================================================================

group('VTT parse', () => {
  bench('1k events', () => parseVTT(vtt1k))
  bench('10k events', () => parseVTT(vtt10k))
  bench('100k events', () => parseVTT(vtt100k))
})

group('VTT serialize', () => {
  bench('1k events', () => toVTT(doc1k))
  bench('10k events', () => toVTT(doc10k))
  bench('100k events', () => toVTT(doc100k))
})

// ============================================================================
// SBV Parsing
// ============================================================================

group('SBV parse', () => {
  if (sbvSimple) bench('simple (real)', () => parseSBV(sbvSimple))
  bench('1k events', () => parseSBV(sbv1k))
  bench('10k events', () => parseSBV(sbv10k))
  bench('100k events', () => parseSBV(sbv100k))
})

group('SBV serialize', () => {
  bench('1k events', () => toSBV(doc1k))
  bench('10k events', () => toSBV(doc10k))
  bench('100k events', () => toSBV(doc100k))
})

// ============================================================================
// LRC Parsing
// ============================================================================

group('LRC parse', () => {
  if (lrcSimple) bench('simple (real)', () => parseLRC(lrcSimple))
  bench('1k events', () => parseLRC(lrc1k))
  bench('10k events', () => parseLRC(lrc10k))
  bench('100k events', () => parseLRC(lrc100k))
})

group('LRC serialize', () => {
  bench('1k events', () => toLRC(doc1k))
  bench('10k events', () => toLRC(doc10k))
  bench('100k events', () => toLRC(doc100k))
})

// ============================================================================
// MicroDVD Parsing
// ============================================================================

group('MicroDVD parse', () => {
  if (microdvdSimple) bench('simple (real)', () => parseMicroDVD(microdvdSimple, 25))
  bench('1k events', () => parseMicroDVD(microdvd1k, 25))
  bench('10k events', () => parseMicroDVD(microdvd10k, 25))
  bench('100k events', () => parseMicroDVD(microdvd100k, 25))
})

group('MicroDVD serialize', () => {
  bench('1k events', () => toMicroDVD(doc1k, 25))
  bench('10k events', () => toMicroDVD(doc10k, 25))
  bench('100k events', () => toMicroDVD(doc100k, 25))
})

// ============================================================================
// SAMI Parsing
// ============================================================================

group('SAMI parse', () => {
  if (samiSimple) bench('simple (real)', () => parseSAMI(samiSimple))
  bench('1k events', () => parseSAMI(sami1k))
  bench('10k events', () => parseSAMI(sami10k))
  bench('100k events', () => parseSAMI(sami100k))
})

group('SAMI serialize', () => {
  bench('1k events', () => toSAMI(doc1k))
  bench('10k events', () => toSAMI(doc10k))
  bench('100k events', () => toSAMI(doc100k))
})

// ============================================================================
// CAP Parsing
// ============================================================================

group('CAP parse', () => {
  if (capSimple) bench('simple (real)', () => parseCAP(capSimple))
  bench('1k events', () => parseCAP(cap1k))
  bench('10k events', () => parseCAP(cap10k))
  bench('100k events', () => parseCAP(cap100k))
})

group('CAP serialize', () => {
  bench('1k events', () => toCAP(doc1k))
  bench('10k events', () => toCAP(doc10k))
  bench('100k events', () => toCAP(doc100k))
})

// ============================================================================
// QuickTime Text Parsing
// ============================================================================

group('QT parse', () => {
  if (qtSimple) bench('simple (real)', () => parseQT(qtSimple))
  bench('1k events', () => parseQT(qt1k))
  bench('10k events', () => parseQT(qt10k))
  bench('100k events', () => parseQT(qt100k))
})

group('QT serialize', () => {
  bench('1k events', () => toQT(doc1k))
  bench('10k events', () => toQT(doc10k))
  bench('100k events', () => toQT(doc100k))
})

// ============================================================================
// RealText Parsing
// ============================================================================

group('RealText parse', () => {
  if (realtextSimple) bench('simple (real)', () => parseRealText(realtextSimple))
  bench('1k events', () => parseRealText(realtext1k))
  bench('10k events', () => parseRealText(realtext10k))
  bench('100k events', () => parseRealText(realtext100k))
})

group('RealText serialize', () => {
  bench('1k events', () => toRealText(doc1k))
  bench('10k events', () => toRealText(doc10k))
  bench('100k events', () => toRealText(doc100k))
})

await run()
