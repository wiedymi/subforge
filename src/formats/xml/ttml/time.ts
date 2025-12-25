// TTML time expression parsing
// Supports: clock-time (HH:MM:SS.mmm), offset-time (123.45s, 1000ms, 1.5h)

/**
 * Parse TTML time expression to milliseconds
 *
 * Supports two formats:
 * - Clock time: HH:MM:SS.mmm or HH:MM:SS:frames
 * - Offset time: 123s, 123ms, 123h, 123m
 *
 * @param timeStr - Time string to parse
 * @returns Time in milliseconds
 *
 * @example
 * ```ts
 * parseTime("00:01:30.500") // 90500
 * parseTime("90.5s")         // 90500
 * parseTime("1.5m")          // 90000
 * ```
 */
export function parseTime(timeStr: string): number {
  if (!timeStr) return 0

  const trimmed = timeStr.trim()

  // Clock time format: HH:MM:SS.mmm or HH:MM:SS:frames
  if (trimmed.includes(':')) {
    return parseClockTime(trimmed)
  }

  // Offset time format: 123s, 123ms, 123h, 123m
  return parseOffsetTime(trimmed)
}

function parseClockTime(timeStr: string): number {
  // Split by colon
  const parts = timeStr.split(':')
  if (parts.length < 2) return 0

  const hours = parseInt(parts[0]) || 0
  const minutes = parseInt(parts[1]) || 0

  // Seconds part may contain . or : for frames/subseconds
  let seconds = 0
  let ms = 0

  if (parts.length >= 3) {
    const secPart = parts[2]

    // Check for frames (HH:MM:SS:FF format)
    if (parts.length === 4) {
      seconds = parseInt(secPart) || 0
      // Frames - assume 30fps for now
      const frames = parseInt(parts[3]) || 0
      ms = Math.round((frames / 30) * 1000)
    } else if (secPart.includes('.')) {
      // Fractional seconds
      const [sec, frac] = secPart.split('.')
      seconds = parseInt(sec) || 0

      // Pad or truncate to 3 digits
      const fracPadded = (frac + '000').substring(0, 3)
      ms = parseInt(fracPadded) || 0
    } else {
      seconds = parseInt(secPart) || 0
    }
  }

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms
}

function parseOffsetTime(timeStr: string): number {
  // Match number followed by optional unit
  const match = timeStr.match(/^([0-9.]+)(ms|s|m|h)?$/)
  if (!match) return 0

  const value = parseFloat(match[1])
  const unit = match[2] || 's' // Default to seconds

  switch (unit) {
    case 'h':
      return Math.round(value * 3600000)
    case 'm':
      return Math.round(value * 60000)
    case 's':
      return Math.round(value * 1000)
    case 'ms':
      return Math.round(value)
    default:
      return Math.round(value * 1000)
  }
}

/**
 * Format milliseconds to TTML time expression
 *
 * @param ms - Time in milliseconds
 * @param format - Output format: 'clock' for HH:MM:SS.mmm or 'offset' for seconds (default: 'clock')
 * @returns Formatted time string
 *
 * @example
 * ```ts
 * formatTime(90500, 'clock')  // "00:01:30.500"
 * formatTime(90500, 'offset') // "90.500s"
 * ```
 */
export function formatTime(ms: number, format: 'clock' | 'offset' = 'clock'): string {
  if (format === 'offset') {
    return `${(ms / 1000).toFixed(3)}s`
  }

  // Clock time format
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(millis, 3)}`
}

function pad(num: number, len: number): string {
  return num.toString().padStart(len, '0')
}

/**
 * Parse TTML duration attribute to milliseconds
 *
 * @param durStr - Duration string (e.g., "2.5s", "1500ms")
 * @returns Duration in milliseconds
 *
 * @example
 * ```ts
 * parseDuration("2.5s")   // 2500
 * parseDuration("1500ms") // 1500
 * ```
 */
export function parseDuration(durStr: string): number {
  return parseOffsetTime(durStr)
}
