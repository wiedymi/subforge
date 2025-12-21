import { bench, group, run } from 'mitata'
import { createDocument, createEvent } from '../../src/core/document.ts'

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

const EVENT_COUNT = 100_000

// Generate large documents
function generateLargeDoc() {
  const doc = createDocument()
  const len = EVENT_COUNT
  for (let i = 0; i < len; i++) {
    const start = i * 5000
    const end = start + 4000
    doc.events.push(createEvent(start, end, `Event ${i + 1}: Lorem ipsum dolor sit amet`))
  }
  return doc
}

console.log(`Generating document with ${EVENT_COUNT.toLocaleString()} events...`)
const largeDoc = generateLargeDoc()

// Generate serialized formats
console.log('Pre-serializing formats...')
const ssaText = toSSA(largeDoc)
const sbvText = toSBV(largeDoc)
const lrcText = toLRC(largeDoc, { includeMetadata: false })
const microdvdText = toMicroDVD(largeDoc, 25)
const samiText = toSAMI(largeDoc)
const realtextText = toRealText(largeDoc)
const qtText = toQT(largeDoc)
const ttmlText = toTTML(largeDoc, { includeHead: false })
const sccText = toSCC(largeDoc)
const capText = toCAP(largeDoc)
const spruceText = toSpruceSTL(largeDoc)

console.log('Formats ready. Running benchmarks...\n')

group(`100k Events - Parsing`, () => {
  bench('SSA parse 100k', () => parseSSA(ssaText))
  bench('SBV parse 100k', () => parseSBV(sbvText))
  bench('LRC parse 100k', () => parseLRC(lrcText))
  bench('MicroDVD parse 100k', () => parseMicroDVD(microdvdText, 25))
  bench('SAMI parse 100k', () => parseSAMI(samiText))
  bench('RealText parse 100k', () => parseRealText(realtextText))
  bench('QuickTime Text parse 100k', () => parseQT(qtText))
  bench('TTML parse 100k', () => parseTTML(ttmlText))
  bench('SCC parse 100k', () => parseSCC(sccText))
  bench('CAP parse 100k', () => parseCAP(capText))
  bench('Spruce STL parse 100k', () => parseSpruceSTL(spruceText))
})

group(`100k Events - Serialization`, () => {
  bench('SSA serialize 100k', () => toSSA(largeDoc))
  bench('SBV serialize 100k', () => toSBV(largeDoc))
  bench('LRC serialize 100k', () => toLRC(largeDoc, { includeMetadata: false }))
  bench('MicroDVD serialize 100k', () => toMicroDVD(largeDoc, 25))
  bench('SAMI serialize 100k', () => toSAMI(largeDoc))
  bench('RealText serialize 100k', () => toRealText(largeDoc))
  bench('QuickTime Text serialize 100k', () => toQT(largeDoc))
  bench('TTML serialize 100k', () => toTTML(largeDoc, { includeHead: false }))
  bench('SCC serialize 100k', () => toSCC(largeDoc))
  bench('CAP serialize 100k', () => toCAP(largeDoc))
  bench('Spruce STL serialize 100k', () => toSpruceSTL(largeDoc))
})

await run()
