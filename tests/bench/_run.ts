import { run } from 'mitata'

function parseNumberEnv(key: string): number | undefined {
  const raw = process.env[key]
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

function parseBooleanEnv(key: string): boolean | undefined {
  const raw = process.env[key]
  if (!raw) return undefined
  if (raw === '1' || raw.toLowerCase() === 'true') return true
  if (raw === '0' || raw.toLowerCase() === 'false') return false
  return undefined
}

export function runBench() {
  const filterRaw = process.env.MITATA_FILTER
  const formatRaw = process.env.MITATA_FORMAT

  const opts: Parameters<typeof run>[0] = {}

  if (filterRaw) opts.filter = new RegExp(filterRaw)
  if (formatRaw) opts.format = formatRaw as NonNullable<typeof opts.format>

  const colors = parseBooleanEnv('MITATA_COLORS')
  if (colors !== undefined) opts.colors = colors

  const warmupSamples = parseNumberEnv('MITATA_WARMUP_SAMPLES')
  if (warmupSamples !== undefined) opts.warmup_samples = warmupSamples

  const warmupThreshold = parseNumberEnv('MITATA_WARMUP_THRESHOLD')
  if (warmupThreshold !== undefined) opts.warmup_threshold = warmupThreshold

  const minSamples = parseNumberEnv('MITATA_MIN_SAMPLES')
  if (minSamples !== undefined) opts.min_samples = minSamples

  const maxSamples = parseNumberEnv('MITATA_MAX_SAMPLES')
  if (maxSamples !== undefined) opts.max_samples = maxSamples

  const minCpuTime = parseNumberEnv('MITATA_MIN_CPU_TIME')
  if (minCpuTime !== undefined) opts.min_cpu_time = minCpuTime

  const batchSamples = parseNumberEnv('MITATA_BATCH_SAMPLES')
  if (batchSamples !== undefined) opts.batch_samples = batchSamples

  const batchThreshold = parseNumberEnv('MITATA_BATCH_THRESHOLD')
  if (batchThreshold !== undefined) opts.batch_threshold = batchThreshold

  const samplesThreshold = parseNumberEnv('MITATA_SAMPLES_THRESHOLD')
  if (samplesThreshold !== undefined) opts.samples_threshold = samplesThreshold

  return run(opts)
}
