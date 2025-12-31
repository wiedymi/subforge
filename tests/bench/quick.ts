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
  generateVobSub,
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
import { parseVobSub } from '../../src/formats/binary/vobsub/index.ts'
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

const ass = shouldRun('ASS') ? generateASS(COUNT) : null
const ssa = shouldRun('SSA') ? generateSSA(COUNT) : null
const sbv = shouldRun('SBV') ? generateSBV(COUNT) : null
const lrc = shouldRun('LRC') ? generateLRC(COUNT) : null
const sami = shouldRun('SAMI') ? generateSAMI(COUNT) : null
const cap = shouldRun('CAP') ? generateCAP(COUNT) : null
const qt = shouldRun('QT') ? generateQT(COUNT) : null
const real = shouldRun('RealText') ? generateRealText(COUNT) : null
const scc = shouldRun('SCC') ? generateSCC(COUNT) : null

const needsTTML = shouldRun('TTML') || shouldRun('DFXP') || shouldRun('SMPTE-TT')
const ttml = needsTTML ? generateTTML(COUNT) : null

const dvb = shouldRun('DVB') ? generateDVB(COUNT) : null
const pgs = shouldRun('PGS') ? generatePGS(COUNT) : null
const vobIdx = shouldRun('VobSub idx') ? generateVobSubIdx(COUNT) : null
const vob = (shouldRun('VobSub') || shouldRun('VobSub rle') || shouldRun('VobSub none'))
  ? generateVobSub(COUNT)
  : null

const needsDoc = shouldRun('Teletext') || shouldRun('Spruce STL') || shouldRun('EBU-STL') || shouldRun('PAC')
const doc = needsDoc ? generateDocument(COUNT) : null
const tele = doc && shouldRun('Teletext') ? toTeletext(doc) : null
const spruce = doc && shouldRun('Spruce STL') ? toSpruceSTL(doc) : null
const ebu = doc && shouldRun('EBU-STL') ? toEBUSTL(doc) : null
const pac = doc && shouldRun('PAC') ? toPAC(doc) : null
const shouldRunVobSub = shouldRun('VobSub') || shouldRun('VobSub rle') || shouldRun('VobSub none')
const vobParsed = vob && shouldRunVobSub ? parseIdx(vob.idx) : null

// Text/XML formats
if (ass) bench('ASS', () => parseASS(ass))
if (ssa) bench('SSA', () => parseSSA(ssa))
if (sbv) bench('SBV', () => parseSBV(sbv))
if (lrc) bench('LRC', () => parseLRC(lrc))
if (sami) bench('SAMI', () => parseSAMI(sami))
if (cap) bench('CAP', () => parseCAP(cap))
if (qt) bench('QT', () => parseQT(qt))
if (real) bench('RealText', () => parseRealText(real))
if (ttml && shouldRun('TTML')) bench('TTML', () => parseTTML(ttml))
if (ttml && shouldRun('DFXP')) bench('DFXP', () => parseDFXP(ttml))
if (ttml && shouldRun('SMPTE-TT')) bench('SMPTE-TT', () => parseSMPTETT(ttml))
if (scc) bench('SCC', () => parseSCC(scc))

// Broadcast/Binary formats
if (tele) bench('Teletext', () => parseTeletext(tele))
if (spruce) bench('Spruce STL', () => parseSpruceSTL(spruce))
if (ebu) bench('EBU-STL', () => parseEBUSTL(ebu))
if (pac) bench('PAC', () => parsePAC(pac))
if (pgs) bench('PGS', () => parsePGS(pgs))
if (dvb) bench('DVB', () => parseDVB(dvb))
if (vobIdx) bench('VobSub idx', () => parseIdx(vobIdx))
if (vobParsed && shouldRun('VobSub')) bench('VobSub', () => parseVobSub(vobParsed, vob.sub))
if (vobParsed && shouldRun('VobSub rle')) bench('VobSub rle', () => parseVobSub(vobParsed, vob.sub, { decode: 'rle' }))
if (vobParsed && shouldRun('VobSub none')) bench('VobSub none', () => parseVobSub(vobParsed, vob.sub, { decode: 'none' }))

results.sort((a, b) => a.ms - b.ms)

for (const { name, ms } of results) {
  console.log(`${name}\t${ms.toFixed(2)} ms`)
}
