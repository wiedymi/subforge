import { mkdir, rm, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

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

const start = performance.now()

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })

const result = await Bun.build({
  entrypoints,
  outdir: 'dist',
  format: 'esm',
  target: 'browser',
  root: 'src',
  splitting: false,
  sourcemap: 'none',
  minify: false,
})

if (!result.success) {
  for (const message of result.logs) {
    console.error(message)
  }
  process.exit(1)
}

type FileStat = { path: string; size: number }

async function walk(dir: string, out: FileStat[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath, out)
      continue
    }
    const info = await stat(fullPath)
    out.push({ path: fullPath, size: info.size })
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(2)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}

const files: FileStat[] = []
await walk('dist', files)
const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
const mapFiles = files.filter(file => file.path.endsWith('.map'))
const topFiles = files
  .slice()
  .sort((a, b) => b.size - a.size)
  .slice(0, 8)

const durationMs = performance.now() - start
console.log(`Build complete in ${(durationMs / 1000).toFixed(2)}s`)
console.log(`Entry points: ${entrypoints.length}`)
console.log(`Files: ${files.length} (maps: ${mapFiles.length})`)
console.log(`Total size: ${formatBytes(totalBytes)}`)
console.log('Largest files:')
for (const file of topFiles) {
  const rel = file.path.startsWith('dist') ? file.path : `dist/${file.path}`
  console.log(`- ${rel}: ${formatBytes(file.size)}`)
}
