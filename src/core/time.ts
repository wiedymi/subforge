/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1h 23m 45s", "45s")
 * @example
 * ```ts
 * formatDuration(5000) // '5s'
 * formatDuration(125000) // '2m 5s'
 * formatDuration(3725000) // '1h 2m 5s'
 * ```
 */
export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)

  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Clamps a time value between minimum and maximum bounds.
 * @param ms - Time value in milliseconds
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 * @example
 * ```ts
 * clamp(150, 0, 100) // 100
 * clamp(-50, 0, 100) // 0
 * clamp(50, 0, 100) // 50
 * ```
 */
export function clamp(ms: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, ms))
}

/**
 * Checks if two time ranges overlap.
 * @param start1 - Start time of first range
 * @param end1 - End time of first range
 * @param start2 - Start time of second range
 * @param end2 - End time of second range
 * @returns True if ranges overlap
 * @example
 * ```ts
 * overlap(0, 100, 50, 150) // true
 * overlap(0, 100, 100, 200) // false
 * ```
 */
export function overlap(
  start1: number, end1: number,
  start2: number, end2: number
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Calculates the duration of an event.
 * @param event - Object with start and end times
 * @returns Duration in milliseconds
 * @example
 * ```ts
 * duration({ start: 1000, end: 3000 }) // 2000
 * ```
 */
export function duration(event: { start: number; end: number }): number {
  return event.end - event.start
}
