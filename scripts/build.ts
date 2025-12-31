import { mkdir, rm } from 'node:fs/promises'

const entrypoints = [
  'src/index.ts',
  'src/core/index.ts',
  'src/formats/text/ass/index.ts',
  'src/formats/text/ssa/index.ts',
  'src/formats/text/srt/index.ts',
  'src/formats/text/vtt/index.ts',
  'src/formats/text/sbv/index.ts',
  'src/formats/text/lrc/index.ts',
  'src/formats/text/microdvd/index.ts',
  'src/formats/xml/ttml/index.ts',
  'src/formats/xml/sami/index.ts',
  'src/formats/xml/realtext/index.ts',
  'src/formats/xml/qt/index.ts',
  'src/formats/binary/stl/index.ts',
  'src/formats/binary/pgs/index.ts',
  'src/formats/binary/dvb/index.ts',
  'src/formats/binary/vobsub/index.ts',
  'src/formats/binary/pac/index.ts',
  'src/formats/broadcast/scc/index.ts',
  'src/formats/broadcast/cap/index.ts',
  'src/formats/broadcast/teletext/index.ts',
]

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })

const result = await Bun.build({
  entrypoints,
  outdir: 'dist',
  format: 'esm',
  target: 'browser',
  root: 'src',
  splitting: false,
  sourcemap: 'external',
  minify: false,
})

if (!result.success) {
  for (const message of result.logs) {
    console.error(message)
  }
  process.exit(1)
}
