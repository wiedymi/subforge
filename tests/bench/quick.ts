/**
 * Quick single-pass parse benchmarks for 100k events.
 * Prints a compact, no-warmup matrix for fast iteration.
 */

import {
  generateASS,
  generateSSA,
  generateSBV,
  generateLRC,
  generateSAMI,
  generateCAP,
  generateQT,
  generateRealText,
  generateTTML,
  generateSCC,
  generateDVB,
  generatePGS,
  generateVobSubIdx,
  generateDocument,
  SIZES,
} from './_utils.ts'

import { parseASS } from '../../src/formats/text/ass/index.ts'
import { parseSSA } from '../../src/formats/text/ssa/index.ts'
import { parseSBV } from '../../src/formats/text/sbv/index.ts'
import { parseLRC } from '../../src/formats/text/lrc/index.ts'
import { parseSAMI } from '../../src/formats/xml/sami/index.ts'
import { parseCAP } from '../../src/formats/broadcast/cap/index.ts'
import { parseQT } from '../../src/formats/xml/qt/index.ts'
import { parseRealText } from '../../src/formats/xml/realtext/index.ts'
import { parseTTML, parseDFXP, parseSMPTETT } from '../../src/formats/xml/ttml/index.ts'
import { parseSCC } from '../../src/formats/broadcast/scc/index.ts'
import { parseTeletext, toTeletext } from '../../src/formats/broadcast/teletext/index.ts'
import { parseSpruceSTL, toSpruceSTL, parseEBUSTL, toEBUSTL } from '../../src/formats/binary/stl/index.ts'
import { parsePGS } from '../../src/formats/binary/pgs/index.ts'
import { parseDVB } from '../../src/formats/binary/dvb/index.ts'
import { parseIdx } from '../../src/formats/binary/vobsub/parser.ts'
import { parsePAC, toPAC } from '../../src/formats/binary/pac/index.ts'

type Result = { name: string; ms: number }

const COUNT = SIZES.stress
const results: Result[] = []

const filterArg = Bun.argv[2]
const filter = filterArg ? new Set(filterArg.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) : null
const shouldRun = (name: string): boolean => !filter || filter.has(name.toLowerCase())

const bench = (name: string, fn: () => void): void => {
  const t0 = performance.now()
  fn()
  results.push({ name, ms: performance.now() - t0 })
}

// Pre-generate inputs to keep timing focused on parsing
const ass = generateASS(COUNT)
const ssa = generateSSA(COUNT)
const sbv = generateSBV(COUNT)
const lrc = generateLRC(COUNT)
const sami = generateSAMI(COUNT)
const cap = generateCAP(COUNT)
const qt = generateQT(COUNT)
const real = generateRealText(COUNT)
const ttml = generateTTML(COUNT)
const scc = generateSCC(COUNT)

const dvb = generateDVB(COUNT)
const pgs = generatePGS(COUNT)
const vobIdx = generateVobSubIdx(COUNT)

const doc = generateDocument(COUNT)
const tele = toTeletext(doc)
const spruce = toSpruceSTL(doc)
const ebu = toEBUSTL(doc)
const pac = toPAC(doc)

// Text/XML formats
if (shouldRun('ASS')) bench('ASS', () => parseASS(ass))
if (shouldRun('SSA')) bench('SSA', () => parseSSA(ssa))
if (shouldRun('SBV')) bench('SBV', () => parseSBV(sbv))
if (shouldRun('LRC')) bench('LRC', () => parseLRC(lrc))
if (shouldRun('SAMI')) bench('SAMI', () => parseSAMI(sami))
if (shouldRun('CAP')) bench('CAP', () => parseCAP(cap))
if (shouldRun('QT')) bench('QT', () => parseQT(qt))
if (shouldRun('RealText')) bench('RealText', () => parseRealText(real))
if (shouldRun('TTML')) bench('TTML', () => parseTTML(ttml))
if (shouldRun('DFXP')) bench('DFXP', () => parseDFXP(ttml))
if (shouldRun('SMPTE-TT')) bench('SMPTE-TT', () => parseSMPTETT(ttml))
if (shouldRun('SCC')) bench('SCC', () => parseSCC(scc))

// Broadcast/Binary formats
if (shouldRun('Teletext')) bench('Teletext', () => parseTeletext(tele))
if (shouldRun('Spruce STL')) bench('Spruce STL', () => parseSpruceSTL(spruce))
if (shouldRun('EBU-STL')) bench('EBU-STL', () => parseEBUSTL(ebu))
if (shouldRun('PAC')) bench('PAC', () => parsePAC(pac))
if (shouldRun('PGS')) bench('PGS', () => parsePGS(pgs))
if (shouldRun('DVB')) bench('DVB', () => parseDVB(dvb))
if (shouldRun('VobSub idx')) bench('VobSub idx', () => parseIdx(vobIdx))

results.sort((a, b) => a.ms - b.ms)

for (const { name, ms } of results) {
  console.log(`${name}\t${ms.toFixed(2)} ms`)
}
