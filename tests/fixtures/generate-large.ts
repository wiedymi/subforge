// Generate large fixture files for stress testing
import { writeFileSync } from 'fs'
import { join } from 'path'
import { createDocument, createEvent } from '../../src/core/document.ts'
import { toSSA } from '../../src/formats/text/ssa/index.ts'
import { toSBV } from '../../src/formats/text/sbv/index.ts'
import { toLRC } from '../../src/formats/text/lrc/index.ts'
import { toMicroDVD } from '../../src/formats/text/microdvd/index.ts'
import { toSAMI } from '../../src/formats/xml/sami/index.ts'
import { toCAP } from '../../src/formats/broadcast/cap/index.ts'

const EVENT_COUNT = 10_000

console.log(`Generating ${EVENT_COUNT.toLocaleString()} events...`)

const doc = createDocument()
doc.info.title = 'Stress Test'

const len = EVENT_COUNT
for (let i = 0; i < len; i++) {
  const start = i * 5000
  const end = start + 4000
  doc.events.push(createEvent(start, end, `Event ${i + 1}: Lorem ipsum dolor`))
}

console.log('Generating fixtures...')

// Generate text-based formats
writeFileSync(join(__dirname, 'large/ssa-10k.ssa'), toSSA(doc))
console.log('✓ ssa-10k.ssa')

writeFileSync(join(__dirname, 'large/sbv-10k.sbv'), toSBV(doc))
console.log('✓ sbv-10k.sbv')

writeFileSync(join(__dirname, 'large/lrc-10k.lrc'), toLRC(doc, { includeMetadata: false }))
console.log('✓ lrc-10k.lrc')

writeFileSync(join(__dirname, 'large/microdvd-10k.sub'), toMicroDVD(doc, { fps: 25 }))
console.log('✓ microdvd-10k.sub')

writeFileSync(join(__dirname, 'large/sami-10k.smi'), toSAMI(doc))
console.log('✓ sami-10k.smi')

writeFileSync(join(__dirname, 'large/cap-10k.cap'), toCAP(doc))
console.log('✓ cap-10k.cap')

console.log('\nDone!')
