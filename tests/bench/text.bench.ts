/**
 * Text format benchmarks
 * Covers: ASS, SSA, SRT, VTT, SBV, LRC, MicroDVD, QT, SAMI, RealText, CAP
 */

import { bench, group, run } from 'mitata'
import {
  loadFixture,
  loadFixtureOrGenerate,
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

const srt1k = generateSRT(SIZES.medium)
const srt10k = generateSRT(SIZES.large)

const vtt1k = generateVTT(SIZES.medium)
const vtt10k = generateVTT(SIZES.large)

const sbv1k = generateSBV(SIZES.medium)
const lrc1k = generateLRC(SIZES.medium)
const microdvd1k = generateMicroDVD(SIZES.medium)
const sami1k = generateSAMI(SIZES.medium)
const cap1k = generateCAP(SIZES.medium)

// Pre-parsed documents for serialization
const doc1k = generateDocument(SIZES.medium)
const doc10k = generateDocument(SIZES.large)

// ============================================================================
// ASS Parsing
// ============================================================================

group('ASS parse', () => {
  if (assRailgun) bench('railgun_op (real)', () => parseASS(assRailgun))
  if (assAOT) bench('aot3p2_op (real)', () => parseASS(assAOT))
  if (assBenchmark) bench('benchmark (real)', () => parseASS(assBenchmark))
  bench('1k events', () => parseASS(ass1k))
  bench('10k events', () => parseASS(ass10k))
})

group('ASS serialize', () => {
  bench('1k events', () => toASS(doc1k))
  bench('10k events', () => toASS(doc10k))
})

// ============================================================================
// SSA Parsing
// ============================================================================

group('SSA parse', () => {
  if (ssaSimple) bench('simple (real)', () => parseSSA(ssaSimple))
  bench('1k events', () => parseSSA(generateSSA(SIZES.medium)))
})

group('SSA serialize', () => {
  bench('1k events', () => toSSA(doc1k))
})

// ============================================================================
// SRT Parsing
// ============================================================================

group('SRT parse', () => {
  bench('1k events', () => parseSRT(srt1k))
  bench('10k events', () => parseSRT(srt10k))
})

group('SRT serialize', () => {
  bench('1k events', () => toSRT(doc1k))
  bench('10k events', () => toSRT(doc10k))
})

// ============================================================================
// VTT Parsing
// ============================================================================

group('VTT parse', () => {
  bench('1k events', () => parseVTT(vtt1k))
  bench('10k events', () => parseVTT(vtt10k))
})

group('VTT serialize', () => {
  bench('1k events', () => toVTT(doc1k))
  bench('10k events', () => toVTT(doc10k))
})

// ============================================================================
// SBV Parsing
// ============================================================================

group('SBV parse', () => {
  if (sbvSimple) bench('simple (real)', () => parseSBV(sbvSimple))
  bench('1k events', () => parseSBV(sbv1k))
})

group('SBV serialize', () => {
  bench('1k events', () => toSBV(doc1k))
})

// ============================================================================
// LRC Parsing
// ============================================================================

group('LRC parse', () => {
  if (lrcSimple) bench('simple (real)', () => parseLRC(lrcSimple))
  bench('1k events', () => parseLRC(lrc1k))
})

group('LRC serialize', () => {
  bench('1k events', () => toLRC(doc1k))
})

// ============================================================================
// MicroDVD Parsing
// ============================================================================

group('MicroDVD parse', () => {
  if (microdvdSimple) bench('simple (real)', () => parseMicroDVD(microdvdSimple, 25))
  bench('1k events', () => parseMicroDVD(microdvd1k, 25))
})

group('MicroDVD serialize', () => {
  bench('1k events', () => toMicroDVD(doc1k, 25))
})

// ============================================================================
// SAMI Parsing
// ============================================================================

group('SAMI parse', () => {
  if (samiSimple) bench('simple (real)', () => parseSAMI(samiSimple))
  bench('1k events', () => parseSAMI(sami1k))
})

group('SAMI serialize', () => {
  bench('1k events', () => toSAMI(doc1k))
})

// ============================================================================
// CAP Parsing
// ============================================================================

group('CAP parse', () => {
  if (capSimple) bench('simple (real)', () => parseCAP(capSimple))
  bench('1k events', () => parseCAP(cap1k))
})

group('CAP serialize', () => {
  bench('1k events', () => toCAP(doc1k))
})

// ============================================================================
// QuickTime Text Parsing
// ============================================================================

group('QT parse', () => {
  if (qtSimple) bench('simple (real)', () => parseQT(qtSimple))
  bench('1k events', () => parseQT(generateQT(SIZES.medium)))
})

group('QT serialize', () => {
  bench('1k events', () => toQT(doc1k))
})

// ============================================================================
// RealText Parsing
// ============================================================================

group('RealText parse', () => {
  if (realtextSimple) bench('simple (real)', () => parseRealText(realtextSimple))
  bench('1k events', () => parseRealText(generateRealText(SIZES.medium)))
})

group('RealText serialize', () => {
  bench('1k events', () => toRealText(doc1k))
})

await run()
