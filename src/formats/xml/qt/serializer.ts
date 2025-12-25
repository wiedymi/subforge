import type { SubtitleDocument } from '../../../core/types.ts'

/**
 * Options for serializing to QuickTime Text format
 */
export interface QTSerializeOptions {
  /** Font family name (default: 'Helvetica') */
  font?: string
  /** Font size in points (default: 12) */
  size?: number
  /** Text color as RGB values 0-255 (default: white [255, 255, 255]) */
  textColor?: [number, number, number]
  /** Background color as RGB values 0-255 (default: black [0, 0, 0]) */
  backColor?: [number, number, number]
  /** Text justification (default: 'center') */
  justify?: 'left' | 'center' | 'right'
  /** Time scale units per second (default: 1000) */
  timeScale?: number
  /** Video width in pixels (default: 320) */
  width?: number
  /** Video height in pixels (default: 60) */
  height?: number
}

/**
 * Serializes a subtitle document to QuickTime Text format
 *
 * @param doc - Subtitle document to serialize
 * @param opts - Serialization options for formatting and display
 * @returns QuickTime Text formatted string
 *
 * @example
 * ```ts
 * const qt = toQT(doc, {
 *   font: 'Arial',
 *   size: 14,
 *   textColor: [255, 255, 255],
 *   justify: 'center'
 * })
 * ```
 */
export function toQT(doc: SubtitleDocument, opts: QTSerializeOptions = {}): string {
  const font = opts.font ?? 'Helvetica'
  const size = opts.size ?? 12
  const textColor = opts.textColor ?? [255, 255, 255]
  const backColor = opts.backColor ?? [0, 0, 0]
  const justify = opts.justify ?? 'center'
  const timeScale = opts.timeScale ?? 1000
  const width = opts.width ?? 320
  const height = opts.height ?? 60

  // Convert RGB (0-255) to QuickTime color (0-65535)
  const formatColor = (rgb: [number, number, number]): string => {
    const r = Math.floor(rgb[0] * 257)
    const g = Math.floor(rgb[1] * 257)
    const b = Math.floor(rgb[2] * 257)
    return `${r}, ${g}, ${b}`
  }

  let result = ''

  // Header
  result += '{QTtext} '
  result += `{font:${font}}\n`
  result += '{plain} '
  result += `{size:${size}} `
  result += `{textColor: ${formatColor(textColor)}}\n`
  result += `{backColor: ${formatColor(backColor)}}\n`
  result += `{justify:${justify}}\n`
  result += `{timeScale:${timeScale}}\n`
  result += `{width:${width}} `
  result += `{height:${height}}\n`
  result += '{timeStamps:absolute}\n\n'

  // Events
  const events = doc.events
  const len = events.length

  for (let i = 0; i < len; i++) {
    const event = events[i]
    if (!event) continue

    const text = event.text ?? ''

    // Format timestamp
    const timestamp = formatTime(event.start)
    result += `[${timestamp}]\n`
    result += text + '\n\n'
  }

  // Add final timestamp to clear subtitle
  if (len > 0) {
    const lastEvent = events[len - 1]
    if (lastEvent) {
      const endTimestamp = formatTime(lastEvent.end)
      result += `[${endTimestamp}]\n`
    }
  }

  return result
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hh = hours.toString().padStart(2, '0')
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')
  const mmm = milliseconds.toString().padStart(3, '0')

  return `${hh}:${mm}:${ss}.${mmm}`
}
