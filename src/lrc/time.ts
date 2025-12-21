/**
 * Parses an LRC timestamp string to milliseconds.
 *
 * Supports both centisecond (MM:SS.xx) and millisecond (MM:SS.xxx) precision.
 *
 * @param s - Timestamp string in LRC format (MM:SS.xx or MM:SS.xxx)
 * @returns Time in milliseconds
 * @throws {Error} If the timestamp format is invalid
 *
 * @example
 * ```ts
 * parseTime('01:23.45') // 83450 (centiseconds)
 * parseTime('01:23.456') // 83456 (milliseconds)
 * ```
 */
export function parseTime(s: string): number {
  // LRC format: [MM:SS.xx] or [MM:SS.xxx]
  // Returns time in milliseconds
  const colonIdx = s.indexOf(':')
  if (colonIdx === -1) throw new Error(`Invalid LRC timestamp: ${s}`)

  const dotIdx = s.indexOf('.', colonIdx)
  if (dotIdx === -1) throw new Error(`Invalid LRC timestamp: ${s}`)

  const m = parseInt(s.substring(0, colonIdx), 10)
  const ss = parseInt(s.substring(colonIdx + 1, dotIdx), 10)

  // Handle both .xx (centiseconds) and .xxx (milliseconds)
  const fracPart = s.substring(dotIdx + 1)
  let ms: number
  if (fracPart.length === 2) {
    // Centiseconds
    ms = parseInt(fracPart, 10) * 10
  } else if (fracPart.length === 3) {
    // Milliseconds
    ms = parseInt(fracPart, 10)
  } else {
    throw new Error(`Invalid LRC timestamp: ${s}`)
  }

  return m * 60000 + ss * 1000 + ms
}

/**
 * Formats milliseconds to LRC timestamp format.
 *
 * @param ms - Time in milliseconds
 * @param useCentiseconds - Whether to use centiseconds (.xx) instead of milliseconds (.xxx). Default: true
 * @returns Formatted timestamp string (MM:SS.xx or MM:SS.xxx)
 *
 * @example
 * ```ts
 * formatTime(83450, true)  // "01:23.45" (centiseconds)
 * formatTime(83456, false) // "01:23.456" (milliseconds)
 * ```
 */
export function formatTime(ms: number, useCentiseconds = true): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const frac = ms % 1000

  if (useCentiseconds) {
    const centis = Math.floor(frac / 10)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`
  } else {
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${frac.toString().padStart(3, '0')}`
  }
}
