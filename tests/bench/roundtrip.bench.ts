/**
 * Roundtrip benchmarks
 * Tests parse → serialize → parse cycles for format integrity
 */

import { bench, group, run } from 'mitata'
import {
  loadFixture,
  generateASS,
  generateSRT,
  generateVTT,
  generateTTML,
  SIZES,
} from './_utils.ts'

// Core formats with full roundtrip support
import { parseASS, toASS } from '../../src/formats/text/ass/index.ts'
import { parseSRT, toSRT } from '../../src/formats/text/srt/index.ts'
import { parseVTT, toVTT } from '../../src/formats/text/vtt/index.ts'
import { parseTTML, toTTML } from '../../src/formats/xml/ttml/index.ts'
import { parseSBV, toSBV } from '../../src/formats/text/sbv/index.ts'
import { parseLRC, toLRC } from '../../src/formats/text/lrc/index.ts'

// ============================================================================
// Load Real Fixtures
// ============================================================================

const assRailgun = await loadFixture('ass/railgun_op.ass')
const assAOT = await loadFixture('ass/aot3p2_op.ass')

// ============================================================================
// Generate Synthetic Data
// ============================================================================

const ass1k = generateASS(SIZES.medium)
const srt1k = generateSRT(SIZES.medium)
const vtt1k = generateVTT(SIZES.medium)
const ttml1k = generateTTML(SIZES.medium)

// ============================================================================
// ASS Roundtrip
// ============================================================================

group('ASS roundtrip', () => {
  if (assRailgun) {
    bench('railgun_op (real)', () => {
      const doc = parseASS(assRailgun).document
      const str = toASS(doc)
      parseASS(str)
    })
  }

  if (assAOT) {
    bench('aot3p2_op (real)', () => {
      const doc = parseASS(assAOT).document
      const str = toASS(doc)
      parseASS(str)
    })
  }

  bench('1k synthetic', () => {
    const doc = parseASS(ass1k).document
    const str = toASS(doc)
    parseASS(str)
  })
})

// ============================================================================
// SRT Roundtrip
// ============================================================================

group('SRT roundtrip', () => {
  bench('1k events', () => {
    const doc = parseSRT(srt1k).document
    const str = toSRT(doc)
    parseSRT(str)
  })
})

// ============================================================================
// VTT Roundtrip
// ============================================================================

group('VTT roundtrip', () => {
  bench('1k events', () => {
    const doc = parseVTT(vtt1k).document
    const str = toVTT(doc)
    parseVTT(str)
  })
})

// ============================================================================
// TTML Roundtrip
// ============================================================================

group('TTML roundtrip', () => {
  bench('1k events', () => {
    const doc = parseTTML(ttml1k).document
    const str = toTTML(doc)
    parseTTML(str)
  })
})

// ============================================================================
// Cross-format Roundtrip (ASS → X → ASS)
// ============================================================================

group('ASS → SRT → ASS', () => {
  bench('1k events', () => {
    const doc = parseASS(ass1k).document
    const srt = toSRT(doc)
    const doc2 = parseSRT(srt).document
    toASS(doc2)
  })
})

group('ASS → VTT → ASS', () => {
  bench('1k events', () => {
    const doc = parseASS(ass1k).document
    const vtt = toVTT(doc)
    const doc2 = parseVTT(vtt).document
    toASS(doc2)
  })
})

group('SRT → VTT → SRT', () => {
  bench('1k events', () => {
    const doc = parseSRT(srt1k).document
    const vtt = toVTT(doc)
    const doc2 = parseVTT(vtt).document
    toSRT(doc2)
  })
})

// ============================================================================
// Multi-hop Conversion
// ============================================================================

group('ASS → SRT → VTT → TTML', () => {
  bench('1k events', () => {
    const doc1 = parseASS(ass1k).document
    const srt = toSRT(doc1)
    const doc2 = parseSRT(srt).document
    const vtt = toVTT(doc2)
    const doc3 = parseVTT(vtt).document
    toTTML(doc3)
  })
})

await run()
