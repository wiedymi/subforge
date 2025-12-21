// RealText time format: HH:MM:SS.cc

/**
 * Parse RealText time format to milliseconds
 *
 * Format: HH:MM:SS.cc (where cc is centiseconds)
 *
 * @param str - Time string to parse
 * @returns Time in milliseconds
 *
 * @example
 * ```ts
 * parseTime("00:01:30.50") // 90500
 * parseTime("01:00:00.00") // 3600000
 * ```
 */
export function parseTime(str: string): number {
  // Format: HH:MM:SS.cc
  const parts = str.split(':')
  if (parts.length !== 3) return 0

  const hours = parseInt(parts[0]!, 10)
  const minutes = parseInt(parts[1]!, 10)
  const secParts = parts[2]!.split('.')
  const seconds = parseInt(secParts[0]!, 10)
  const centiseconds = secParts[1] ? parseInt(secParts[1].padEnd(2, '0').slice(0, 2), 10) : 0

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + centiseconds * 10
}

/**
 * Format milliseconds to RealText time format
 *
 * @param ms - Time in milliseconds
 * @returns Formatted time string (HH:MM:SS.cc)
 *
 * @example
 * ```ts
 * formatTime(90500)   // "00:01:30.50"
 * formatTime(3600000) // "01:00:00.00"
 * ```
 */
export function formatTime(ms: number): string {
  const totalCentiseconds = Math.floor(ms / 10)
  const hours = Math.floor(totalCentiseconds / 360000)
  const minutes = Math.floor((totalCentiseconds % 360000) / 6000)
  const seconds = Math.floor((totalCentiseconds % 6000) / 100)
  const centiseconds = totalCentiseconds % 100

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
}
