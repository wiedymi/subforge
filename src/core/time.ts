export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)

  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function clamp(ms: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, ms))
}

export function overlap(
  start1: number, end1: number,
  start2: number, end2: number
): boolean {
  return start1 < end2 && start2 < end1
}

export function duration(event: { start: number; end: number }): number {
  return event.end - event.start
}
