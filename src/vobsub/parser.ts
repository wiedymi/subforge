// VobSub .idx file parser

/**
 * VobSub index file structure parsed from .idx files
 */
export interface VobSubIndex {
  /** Video dimensions */
  size: { width: number; height: number }
  /** Palette of 16 RGBA colors */
  palette: number[]
  /** Array of subtitle tracks */
  tracks: VobSubTrack[]
}

/**
 * Single subtitle track within a VobSub index
 */
export interface VobSubTrack {
  /** Two-letter language code (e.g., "en", "es") */
  language: string
  /** Track index number */
  index: number
  /** Array of timestamps pointing to subtitle packets */
  timestamps: VobSubTimestamp[]
}

/**
 * Timestamp entry linking to a subtitle packet in the .sub file
 */
export interface VobSubTimestamp {
  /** Presentation time in milliseconds */
  time: number
  /** Byte offset in .sub file */
  filepos: number
}

/**
 * Parse VobSub .idx index file
 * @param content - Text content of .idx file
 * @returns Parsed index structure
 * @example
 * const idxContent = Bun.file('movie.idx').text()
 * const index = parseIdx(idxContent)
 */
export function parseIdx(content: string): VobSubIndex {
  const lines = content.split(/\r?\n/)

  const index: VobSubIndex = {
    size: { width: 720, height: 480 },
    palette: [],
    tracks: [],
  }

  let currentTrack: VobSubTrack | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') {
      continue
    }

    // Parse size
    const sizeMatch = trimmed.match(/^size:\s*(\d+)x(\d+)$/i)
    if (sizeMatch) {
      index.size.width = parseInt(sizeMatch[1], 10)
      index.size.height = parseInt(sizeMatch[2], 10)
      continue
    }

    // Parse palette
    const paletteMatch = trimmed.match(/^palette:\s*(.+)$/i)
    if (paletteMatch) {
      const colors = paletteMatch[1].split(',').map(c => c.trim())
      index.palette = colors.map(parseColor)
      continue
    }

    // Parse track ID
    const idMatch = trimmed.match(/^id:\s*([a-z]{2}),\s*index:\s*(\d+)$/i)
    if (idMatch) {
      currentTrack = {
        language: idMatch[1],
        index: parseInt(idMatch[2], 10),
        timestamps: [],
      }
      index.tracks.push(currentTrack)
      continue
    }

    // Parse timestamp
    const timestampMatch = trimmed.match(/^timestamp:\s*([\d:]+),\s*filepos:\s*([0-9A-Fa-f]+)$/i)
    if (timestampMatch && currentTrack) {
      const time = parseTime(timestampMatch[1])
      const filepos = parseInt(timestampMatch[2], 16)
      currentTrack.timestamps.push({ time, filepos })
      continue
    }
  }

  // Ensure we have a default palette if none was provided
  if (index.palette.length === 0) {
    index.palette = getDefaultPalette()
  }

  return index
}

/**
 * Parse VobSub time format (HH:MM:SS:mmm) to milliseconds
 * @param timeStr - Time string in HH:MM:SS:mmm format
 * @returns Time in milliseconds
 * @throws {Error} If time format is invalid
 * @example
 * const ms = parseTime('01:23:45:678') // 5025678
 */
export function parseTime(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 4) {
    throw new Error(`Invalid time format: ${timeStr}`)
  }

  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  const seconds = parseInt(parts[2], 10)
  const millis = parseInt(parts[3], 10)

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + millis
}

/**
 * Format milliseconds to VobSub time format (HH:MM:SS:mmm)
 * @param ms - Time in milliseconds
 * @returns Formatted time string
 * @example
 * const timeStr = formatTime(5025678) // "01:23:45:678"
 */
export function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${millis.toString().padStart(3, '0')}`
}

/**
 * Parse hex color to RGBA
 */
function parseColor(hex: string): number {
  const cleaned = hex.replace(/^#/, '').trim()

  if (cleaned.length === 6) {
    // RGB format
    const r = parseInt(cleaned.substring(0, 2), 16)
    const g = parseInt(cleaned.substring(2, 4), 16)
    const b = parseInt(cleaned.substring(4, 6), 16)
    return ((r << 24) | (g << 16) | (b << 8) | 0xFF) >>> 0
  } else if (cleaned.length === 8) {
    // RGBA format
    const r = parseInt(cleaned.substring(0, 2), 16)
    const g = parseInt(cleaned.substring(2, 4), 16)
    const b = parseInt(cleaned.substring(4, 6), 16)
    const a = parseInt(cleaned.substring(6, 8), 16)
    return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0
  }

  // Invalid format, return transparent black
  return 0x000000FF
}

/**
 * Format RGBA packed integer to hex color string
 * @param rgba - RGBA color as packed 32-bit integer
 * @returns Hex color string (6 characters, RGB only)
 * @example
 * const hex = formatColor(0xFF8800FF) // "ff8800"
 */
export function formatColor(rgba: number): string {
  const r = (rgba >> 24) & 0xFF
  const g = (rgba >> 16) & 0xFF
  const b = (rgba >> 8) & 0xFF

  return `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Get default VobSub palette (16 colors)
 */
function getDefaultPalette(): number[] {
  return [
    0x000000FF, 0xFFFFFFFF, 0x808080FF, 0xC0C0C0FF,
    0xFF0000FF, 0x00FF00FF, 0x0000FFFF, 0xFFFF00FF,
    0xFF00FFFF, 0x00FFFFFF, 0x800000FF, 0x008000FF,
    0x000080FF, 0x808000FF, 0x800080FF, 0x008080FF,
  ]
}

/**
 * Serialize VobSubIndex to .idx file format
 * @param index - VobSub index structure
 * @returns Text content for .idx file
 * @example
 * const idxContent = serializeIdx(index)
 * Bun.write('output.idx', idxContent)
 */
export function serializeIdx(index: VobSubIndex): string {
  const lines: string[] = []

  lines.push('# VobSub index file, v7 (do not modify this line!)')
  lines.push('')

  // Size
  lines.push(`size: ${index.size.width}x${index.size.height}`)

  // Palette
  const paletteStr = index.palette.map(formatColor).join(', ')
  lines.push(`palette: ${paletteStr}`)
  lines.push('')

  // Tracks
  for (const track of index.tracks) {
    lines.push(`id: ${track.language}, index: ${track.index}`)

    for (const ts of track.timestamps) {
      const timeStr = formatTime(ts.time)
      const fileposStr = ts.filepos.toString(16).padStart(9, '0')
      lines.push(`timestamp: ${timeStr}, filepos: ${fileposStr}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}
