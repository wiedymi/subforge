/**
 * Parses an SRT timestamp string into milliseconds.
 *
 * SRT timestamps use the format HH:MM:SS,mmm where the comma separates
 * seconds from milliseconds. Uses optimized character code arithmetic
 * for performance.
 *
 * @param s - Timestamp string in SRT format (must be exactly 12 characters)
 * @returns Time in milliseconds
 * @throws {Error} If the timestamp is not exactly 12 characters
 *
 * @example
 * ```ts
 * const ms = parseTime('01:23:45,678');
 * console.log(ms); // 5025678
 * ```
 */
export function parseTime(s: string): number {
  // Fast path: HH:MM:SS,mmm (exactly 12 chars)
  // Use direct charCode math instead of parseInt/slice
  if (s.length !== 12) throw new Error(`Invalid SRT timestamp: ${s}`)

  const h = (s.charCodeAt(0) - 48) * 10 + (s.charCodeAt(1) - 48)
  const m = (s.charCodeAt(3) - 48) * 10 + (s.charCodeAt(4) - 48)
  const ss = (s.charCodeAt(6) - 48) * 10 + (s.charCodeAt(7) - 48)
  const ms = (s.charCodeAt(9) - 48) * 100 + (s.charCodeAt(10) - 48) * 10 + (s.charCodeAt(11) - 48)

  return h * 3600000 + m * 60000 + ss * 1000 + ms
}

/**
 * Formats milliseconds into an SRT timestamp string.
 *
 * Generates timestamps in SRT format: HH:MM:SS,mmm with zero-padding
 * and comma separator before milliseconds.
 *
 * @param ms - Time in milliseconds
 * @returns Formatted timestamp string
 *
 * @example
 * ```ts
 * const timestamp = formatTime(5025678);
 * console.log(timestamp); // "01:23:45,678"
 * ```
 */
export function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`
}
