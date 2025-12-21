/**
 * Parses an SBV timestamp string to milliseconds.
 *
 * SBV format allows variable-length hours (H:MM:SS.mmm or HH:MM:SS.mmm).
 *
 * @param s - Timestamp string in SBV format (H:MM:SS.mmm)
 * @returns Time in milliseconds
 * @throws {Error} If the timestamp format is invalid or milliseconds aren't exactly 3 digits
 *
 * @example
 * ```ts
 * parseTime('0:01:23.456') // 83456
 * parseTime('1:30:15.000') // 5415000
 * ```
 */
export function parseTime(s: string): number {
  // SBV format: H:MM:SS.mmm or HH:MM:SS.mmm (variable length hours)
  // Find the separators
  const firstColon = s.indexOf(':')
  if (firstColon === -1) throw new Error(`Invalid SBV timestamp: ${s}`)

  const secondColon = s.indexOf(':', firstColon + 1)
  if (secondColon === -1) throw new Error(`Invalid SBV timestamp: ${s}`)

  const dot = s.indexOf('.', secondColon + 1)
  if (dot === -1) throw new Error(`Invalid SBV timestamp: ${s}`)

  // Validate milliseconds are exactly 3 digits
  const msStr = s.substring(dot + 1)
  if (msStr.length !== 3) throw new Error(`Invalid SBV timestamp: ${s}`)

  // Parse each component
  const h = parseInt(s.substring(0, firstColon), 10)
  const m = parseInt(s.substring(firstColon + 1, secondColon), 10)
  const ss = parseInt(s.substring(secondColon + 1, dot), 10)
  const ms = parseInt(msStr, 10)

  if (isNaN(h) || isNaN(m) || isNaN(ss) || isNaN(ms)) {
    throw new Error(`Invalid SBV timestamp: ${s}`)
  }

  return h * 3600000 + m * 60000 + ss * 1000 + ms
}

/**
 * Formats milliseconds to SBV timestamp format.
 *
 * SBV uses single-digit hours (no leading zero) and period as decimal separator.
 *
 * @param ms - Time in milliseconds
 * @returns Formatted timestamp string (H:MM:SS.mmm)
 *
 * @example
 * ```ts
 * formatTime(83456)   // "0:01:23.456"
 * formatTime(5415000) // "1:30:15.000"
 * ```
 */
export function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000

  // SBV uses single-digit hours (no leading zero), period instead of comma
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
}
