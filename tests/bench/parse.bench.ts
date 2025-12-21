import { bench, run, group } from 'mitata'
import { parseASS } from '../../src/ass/index.ts'
import { parseSRT } from '../../src/srt/index.ts'
import { parseVTT } from '../../src/vtt/index.ts'

const realASS = await Bun.file('./tests/fixtures/ass/benchmark.ass').text()
const railgunOP = await Bun.file('./tests/fixtures/ass/railgun_op.ass').text()
const aot3p2OP = await Bun.file('./tests/fixtures/ass/aot3p2_op.ass').text()

function generateASS(count: number): string {
  const lines = [
    '[Script Info]',
    'Title: Benchmark',
    'PlayResX: 1920',
    'PlayResY: 1080',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]

  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * 100)
    const end = start + 5000
    const h = Math.floor(start / 3600000)
    const m = Math.floor((start % 3600000) / 60000)
    const s = Math.floor((start % 60000) / 1000)
    const cs = Math.floor((start % 1000) / 10)
    const startStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`

    const endMs = end
    const eh = Math.floor(endMs / 3600000)
    const em = Math.floor((endMs % 3600000) / 60000)
    const es = Math.floor((endMs % 60000) / 1000)
    const ecs = Math.floor((endMs % 1000) / 10)
    const endStr = `${eh}:${em.toString().padStart(2, '0')}:${es.toString().padStart(2, '0')}.${ecs.toString().padStart(2, '0')}`

    lines.push(`Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,Line number ${i + 1}`)
  }

  return lines.join('\n')
}

function generateSRT(count: number): string {
  const lines: string[] = []

  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * 100)
    const end = start + 5000

    const formatTime = (ms: number) => {
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      const millis = ms % 1000
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`
    }

    lines.push(`${i + 1}`)
    lines.push(`${formatTime(start)} --> ${formatTime(end)}`)
    lines.push(`Line number ${i + 1}`)
    lines.push('')
  }

  return lines.join('\n')
}

function generateVTT(count: number): string {
  const lines = ['WEBVTT', '']

  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * 100)
    const end = start + 5000

    const formatTime = (ms: number) => {
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      const millis = ms % 1000
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
    }

    lines.push(`${formatTime(start)} --> ${formatTime(end)}`)
    lines.push(`Line number ${i + 1}`)
    lines.push('')
  }

  return lines.join('\n')
}

const ass1k = generateASS(1000)
const ass10k = generateASS(10000)
const ass100k = generateASS(100000)

const srt1k = generateSRT(1000)
const srt10k = generateSRT(10000)
const srt100k = generateSRT(100000)

const vtt1k = generateVTT(1000)
const vtt10k = generateVTT(10000)
const vtt100k = generateVTT(100000)

group('ASS parsing', () => {
  bench('real: benchmark.ass (18k lines)', () => parseASS(realASS))
  bench('real: railgun_op.ass (5.7k lines)', () => parseASS(railgunOP))
  bench('real: aot3p2_op.ass (49k lines)', () => parseASS(aot3p2OP))
  bench('synthetic: 1k events', () => parseASS(ass1k))
  bench('synthetic: 10k events', () => parseASS(ass10k))
  bench('synthetic: 100k events', () => parseASS(ass100k))
})

group('SRT parsing', () => {
  bench('1k events', () => parseSRT(srt1k))
  bench('10k events', () => parseSRT(srt10k))
  bench('100k events', () => parseSRT(srt100k))
})

group('VTT parsing', () => {
  bench('1k events', () => parseVTT(vtt1k))
  bench('10k events', () => parseVTT(vtt10k))
  bench('100k events', () => parseVTT(vtt100k))
})

run()
