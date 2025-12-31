/**
 * Runs quick.ts per-format in isolated processes to avoid GC drift.
 * Outputs a compact matrix for 100k parse performance.
 */

type Result = { name: string; ms: number; error?: string }

const formats = [
  'ASS',
  'SSA',
  'SBV',
  'LRC',
  'SAMI',
  'CAP',
  'QT',
  'RealText',
  'TTML',
  'DFXP',
  'SMPTE-TT',
  'SCC',
  'Teletext',
  'Spruce STL',
  'EBU-STL',
  'PAC',
  'PGS',
  'DVB',
  'VobSub idx',
  'VobSub',
  'VobSub rle',
  'VobSub none',
]

const args = Bun.argv.slice(2)
const sort = args.includes('--sort')
const onlyArg = args.find(arg => arg.startsWith('--only='))
const onlySet = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(',').map(s => s.trim()).filter(Boolean))
  : null

const results: Result[] = []

for (const name of formats) {
  if (onlySet && !onlySet.has(name)) continue

  const proc = Bun.spawnSync({
    cmd: ['bun', 'tests/bench/quick.ts', name],
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (proc.exitCode !== 0) {
    results.push({ name, ms: NaN, error: proc.stderr.toString().trim() || 'failed' })
    continue
  }

  const out = proc.stdout.toString().trim()
  const line = out.split('\n').pop() || ''
  const parts = line.split('\t')
  if (parts.length !== 2) {
    results.push({ name, ms: NaN, error: out || 'unexpected output' })
    continue
  }
  const msStr = parts[1].replace(' ms', '').trim()
  const ms = Number(msStr)
  if (!Number.isFinite(ms)) {
    results.push({ name, ms: NaN, error: out || 'invalid ms' })
    continue
  }

  results.push({ name, ms })
}

if (sort) {
  results.sort((a, b) => a.ms - b.ms)
}

for (const r of results) {
  if (r.error) {
    console.log(`${r.name}\tERROR: ${r.error}`)
  } else {
    console.log(`${r.name}\t${r.ms.toFixed(2)} ms`)
  }
}
