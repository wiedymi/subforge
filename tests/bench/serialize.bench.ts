import { bench, run, group } from 'mitata'
import { parseASS, toASS } from '../../src/ass/index.ts'
import { toSRT } from '../../src/srt/index.ts'
import { toVTT } from '../../src/vtt/index.ts'
import { createDocument, createEvent } from '../../src/core/document.ts'
import type { SubtitleDocument } from '../../src/core/types.ts'

const railgunOP = parseASS(await Bun.file('./tests/fixtures/ass/railgun_op.ass').text())
const aot3p2OP = parseASS(await Bun.file('./tests/fixtures/ass/aot3p2_op.ass').text())

function generateDocument(count: number): SubtitleDocument {
  const doc = createDocument()
  for (let i = 0; i < count; i++) {
    const start = i * 100
    const end = start + 5000
    doc.events.push(createEvent(start, end, `Line number ${i + 1}`))
  }
  return doc
}

const doc1k = generateDocument(1000)
const doc10k = generateDocument(10000)
const doc100k = generateDocument(100000)

group('ASS serialization', () => {
  bench('real: railgun_op (5.7k events)', () => toASS(railgunOP))
  bench('real: aot3p2_op (49k events)', () => toASS(aot3p2OP))
  bench('synthetic: 1k events', () => toASS(doc1k))
  bench('synthetic: 10k events', () => toASS(doc10k))
  bench('synthetic: 100k events', () => toASS(doc100k))
})

group('SRT serialization', () => {
  bench('1k events', () => toSRT(doc1k))
  bench('10k events', () => toSRT(doc10k))
  bench('100k events', () => toSRT(doc100k))
})

group('VTT serialization', () => {
  bench('1k events', () => toVTT(doc1k))
  bench('10k events', () => toVTT(doc10k))
  bench('100k events', () => toVTT(doc100k))
})

run()
