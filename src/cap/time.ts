/**
 * Options for CAP timecode parsing.
 */
export interface CAPTimecodeOptions {
  /** Frames per second (defaults to 25 for PAL) */
  fps?: number
}

/**
 * Parses CAP timecode string to milliseconds.
 *
 * CAP uses frame-accurate timecode format: HH:MM:SS:FF where FF is the frame number.
 * The frame count is converted to milliseconds based on the specified fps.
 *
 * @param s - Timecode string in HH:MM:SS:FF format
 * @param fps - Frames per second for frame-to-time conversion (defaults to 25)
 * @returns Time in milliseconds
 * @throws {Error} If the timecode format is invalid or contains non-numeric values
 *
 * @example
 * ```ts
 * const ms = parseTime('00:00:01:12', 25);
 * // Returns 1480 (1 second + 12 frames at 25fps)
 * ```
 */
export function parseTime(s: string, fps: number = 25): number {
  // CAP format: HH:MM:SS:FF (frames)
  const parts = s.split(':')
  if (parts.length !== 4) throw new Error(`Invalid CAP timecode: ${s}`)

  const h = parseInt(parts[0]!, 10)
  const m = parseInt(parts[1]!, 10)
  const ss = parseInt(parts[2]!, 10)
  const ff = parseInt(parts[3]!, 10)

  if (isNaN(h) || isNaN(m) || isNaN(ss) || isNaN(ff)) {
    throw new Error(`Invalid CAP timecode: ${s}`)
  }

  // Convert frames to milliseconds
  const frameMs = (ff / fps) * 1000
  return h * 3600000 + m * 60000 + ss * 1000 + frameMs
}

/**
 * Formats milliseconds to CAP timecode string.
 *
 * Converts milliseconds to frame-accurate timecode format (HH:MM:SS:FF).
 * The frame number is calculated by converting the remaining milliseconds to frames
 * based on the specified fps.
 *
 * @param ms - Time in milliseconds
 * @param fps - Frames per second for time-to-frame conversion (defaults to 25)
 * @returns Formatted timecode string in HH:MM:SS:FF format
 *
 * @example
 * ```ts
 * const timecode = formatTime(1480, 25);
 * // Returns '00:00:01:12' (1 second + 12 frames)
 * ```
 */
export function formatTime(ms: number, fps: number = 25): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const remainingMs = ms % 1000

  // Convert milliseconds to frames
  const ff = Math.round((remainingMs / 1000) * fps)

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${ff.toString().padStart(2, '0')}`
}

/**
 * Converts video standard name to frames per second.
 *
 * Maps standard video format names to their corresponding frame rates.
 * Supports PAL (25fps) and NTSC (29.97fps). Defaults to PAL for unknown standards.
 *
 * @param standard - Video standard name (case-insensitive: 'PAL' or 'NTSC')
 * @returns Frame rate (25 for PAL, 29.97 for NTSC, 25 for unknown)
 *
 * @example
 * ```ts
 * const fps = videoStandardToFps('NTSC'); // Returns 29.97
 * const palFps = videoStandardToFps('pal'); // Returns 25 (case-insensitive)
 * ```
 */
export function videoStandardToFps(standard: string): number {
  const normalized = standard.toUpperCase()
  if (normalized === 'PAL') return 25
  if (normalized === 'NTSC') return 29.97
  // Default to PAL if unknown
  return 25
}

/**
 * Converts frame rate to video standard name.
 *
 * Determines the video standard based on the frame rate value.
 * Frame rates close to 29.97 are considered NTSC, all others default to PAL.
 *
 * @param fps - Frame rate value
 * @returns Video standard name ('NTSC' or 'PAL')
 *
 * @example
 * ```ts
 * const standard = fpsToVideoStandard(29.97); // Returns 'NTSC'
 * const palStandard = fpsToVideoStandard(25); // Returns 'PAL'
 * ```
 */
export function fpsToVideoStandard(fps: number): string {
  if (Math.abs(fps - 29.97) < 0.1) return 'NTSC'
  return 'PAL'
}
