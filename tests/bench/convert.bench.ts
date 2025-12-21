import { bench, run, group } from 'mitata'
import { parseASS } from '../../src/ass/index.ts'
import { parseSRT } from '../../src/srt/index.ts'
import { parseVTT } from '../../src/vtt/index.ts'
import { convert } from '../../src/core/convert.ts'

const railgunOP = parseASS(await Bun.file('./tests/fixtures/ass/railgun_op.ass').text())
const aot3p2OP = parseASS(await Bun.file('./tests/fixtures/ass/aot3p2_op.ass').text())

group('ASS to SRT conversion', () => {
  bench('railgun_op (5.7k events)', () => convert(railgunOP, 'srt'))
  bench('aot3p2_op (49k events)', () => convert(aot3p2OP, 'srt'))
})

group('ASS to VTT conversion', () => {
  bench('railgun_op (5.7k events)', () => convert(railgunOP, 'vtt'))
  bench('aot3p2_op (49k events)', () => convert(aot3p2OP, 'vtt'))
})

group('ASS to ASS conversion', () => {
  bench('railgun_op (5.7k events)', () => convert(railgunOP, 'ass'))
  bench('aot3p2_op (49k events)', () => convert(aot3p2OP, 'ass'))
})

run()
