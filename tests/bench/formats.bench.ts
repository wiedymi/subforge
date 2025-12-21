import { bench, group, run } from 'mitata'
import { readFileSync } from 'fs'
import { join } from 'path'

// Import all parsers and serializers
import { parseSSA, toSSA } from '../../src/ssa/index.ts'
import { parseSBV, toSBV } from '../../src/sbv/index.ts'
import { parseLRC, toLRC } from '../../src/lrc/index.ts'
import { parseMicroDVD, toMicroDVD } from '../../src/microdvd/index.ts'
import { parseSAMI, toSAMI } from '../../src/sami/index.ts'
import { parseRealText, toRealText } from '../../src/realtext/index.ts'
import { parseQT, toQT } from '../../src/qt/index.ts'
import { parseTTML, toTTML } from '../../src/ttml/index.ts'
import { parseSCC, toSCC } from '../../src/scc/index.ts'
import { parseCAP, toCAP } from '../../src/cap/index.ts'
import { parseSpruceSTL, toSpruceSTL } from '../../src/stl/index.ts'

// Sample data
const ssaSample = readFileSync(join(__dirname, '../fixtures/ssa/simple.ssa'), 'utf-8')
const sbvSample = readFileSync(join(__dirname, '../fixtures/sbv/simple.sbv'), 'utf-8')
const lrcSample = readFileSync(join(__dirname, '../fixtures/lrc/simple.lrc'), 'utf-8')
const microdvdSample = readFileSync(join(__dirname, '../fixtures/microdvd/simple.sub'), 'utf-8')
const samiSample = readFileSync(join(__dirname, '../fixtures/sami/simple.smi'), 'utf-8')
const realtextSample = readFileSync(join(__dirname, '../fixtures/realtext/simple.rt'), 'utf-8')
const qtSample = readFileSync(join(__dirname, '../fixtures/qt/simple.qt'), 'utf-8')
const ttmlSample = readFileSync(join(__dirname, '../fixtures/ttml/simple.ttml'), 'utf-8')
const sccSample = readFileSync(join(__dirname, '../fixtures/scc/simple.scc'), 'utf-8')
const capSample = readFileSync(join(__dirname, '../fixtures/cap/simple.cap'), 'utf-8')

// Pre-parse for serialization benchmarks
const ssaDoc = parseSSA(ssaSample)
const sbvDoc = parseSBV(sbvSample)
const lrcDoc = parseLRC(lrcSample)
const microdvdDoc = parseMicroDVD(microdvdSample, 25)
const samiDoc = parseSAMI(samiSample)
const realtextDoc = parseRealText(realtextSample)
const qtDoc = parseQT(qtSample)
const ttmlDoc = parseTTML(ttmlSample)
const sccDoc = parseSCC(sccSample)
const capDoc = parseCAP(capSample)

group('Format Parsing', () => {
  bench('SSA parse', () => parseSSA(ssaSample))
  bench('SBV parse', () => parseSBV(sbvSample))
  bench('LRC parse', () => parseLRC(lrcSample))
  bench('MicroDVD parse', () => parseMicroDVD(microdvdSample, 25))
  bench('SAMI parse', () => parseSAMI(samiSample))
  bench('RealText parse', () => parseRealText(realtextSample))
  bench('QuickTime Text parse', () => parseQT(qtSample))
  bench('TTML parse', () => parseTTML(ttmlSample))
  bench('SCC parse', () => parseSCC(sccSample))
  bench('CAP parse', () => parseCAP(capSample))
})

group('Format Serialization', () => {
  bench('SSA serialize', () => toSSA(ssaDoc))
  bench('SBV serialize', () => toSBV(sbvDoc))
  bench('LRC serialize', () => toLRC(lrcDoc))
  bench('MicroDVD serialize', () => toMicroDVD(microdvdDoc, 25))
  bench('SAMI serialize', () => toSAMI(samiDoc))
  bench('RealText serialize', () => toRealText(realtextDoc))
  bench('QuickTime Text serialize', () => toQT(qtDoc))
  bench('TTML serialize', () => toTTML(ttmlDoc))
  bench('SCC serialize', () => toSCC(sccDoc))
  bench('CAP serialize', () => toCAP(capDoc))
})

await run()
