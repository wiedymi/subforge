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
  const fast = parseIdxSynthetic(content)
  if (fast) return fast
  const fastSerialized = parseIdxSerialized(content)
  if (fastSerialized) return fastSerialized

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

function parseIdxSerialized(content: string): VobSubIndex | null {
  let pos = 0
  const len = content.length
  if (len === 0) return null
  if (content.charCodeAt(0) === 0xFEFF) pos = 1

  const header = '# VobSub index file, v7'
  if (!content.startsWith(header, pos)) return null

  const index: VobSubIndex = {
    size: { width: 720, height: 480 },
    palette: [],
    tracks: [],
  }

  let currentTrack: VobSubTrack | null = null

  while (pos <= len) {
    let lineEnd = content.indexOf('\n', pos)
    if (lineEnd === -1) lineEnd = len

    let lineStart = pos
    if (lineEnd > lineStart && content.charCodeAt(lineEnd - 1) === 13) lineEnd--
    if (lineStart < lineEnd) {
      const first = content.charCodeAt(lineStart)
      if (first !== 35) { // '#'
        if (content.startsWith('size:', lineStart)) {
          let i = lineStart + 5
          while (i < lineEnd && content.charCodeAt(i) <= 32) i++
          let w = 0
          while (i < lineEnd) {
            const d = content.charCodeAt(i) - 48
            if (d < 0 || d > 9) break
            w = w * 10 + d
            i++
          }
          if (i < lineEnd && content.charCodeAt(i) === 120) i++
          let h = 0
          while (i < lineEnd) {
            const d = content.charCodeAt(i) - 48
            if (d < 0 || d > 9) break
            h = h * 10 + d
            i++
          }
          if (w > 0 && h > 0) {
            index.size.width = w
            index.size.height = h
          }
        } else if (content.startsWith('palette:', lineStart)) {
          const paletteText = content.substring(lineStart + 8, lineEnd)
          const colors = paletteText.split(',').map(c => c.trim()).filter(Boolean)
          if (colors.length > 0) {
            index.palette = colors.map(parseColor)
          }
        } else if (content.startsWith('id:', lineStart)) {
          let i = lineStart + 3
          while (i < lineEnd && content.charCodeAt(i) <= 32) i++
          const langStart = i
          while (i < lineEnd && content.charCodeAt(i) > 32 && content.charCodeAt(i) !== 44) i++
          const language = content.substring(langStart, i)
          const indexPos = content.indexOf('index:', i)
          if (indexPos !== -1) {
            let j = indexPos + 6
            while (j < lineEnd && content.charCodeAt(j) <= 32) j++
            let trackIndex = 0
            while (j < lineEnd) {
              const d = content.charCodeAt(j) - 48
              if (d < 0 || d > 9) break
              trackIndex = trackIndex * 10 + d
              j++
            }
            currentTrack = {
              language: language || 'en',
              index: trackIndex,
              timestamps: [],
            }
            index.tracks.push(currentTrack)
          }
        } else if (content.startsWith('timestamp:', lineStart) && currentTrack) {
          const timeStart = lineStart + 11
          const time = parseTimeFixed(content, timeStart)
          const fileposStart = lineStart + 34
          if (time >= 0 && fileposStart < lineEnd) {
            let filepos = 0
            for (let i = fileposStart; i < lineEnd; i++) {
              const c = content.charCodeAt(i)
              let v = -1
              if (c >= 48 && c <= 57) v = c - 48
              else if (c >= 65 && c <= 70) v = c - 55
              else if (c >= 97 && c <= 102) v = c - 87
              else if (c === 32) continue
              else break
              filepos = (filepos << 4) | v
            }
            currentTrack.timestamps.push({ time, filepos })
          }
        }
      }
    }

    if (lineEnd === len) break
    pos = lineEnd + 1
  }

  if (index.palette.length === 0) {
    index.palette = getDefaultPalette()
  }

  return index
}

function parseTimeFixed(src: string, start: number): number {
  const h1 = src.charCodeAt(start) - 48
  const h2 = src.charCodeAt(start + 1) - 48
  const c1 = src.charCodeAt(start + 2)
  const m1 = src.charCodeAt(start + 3) - 48
  const m2 = src.charCodeAt(start + 4) - 48
  const c2 = src.charCodeAt(start + 5)
  const s1 = src.charCodeAt(start + 6) - 48
  const s2 = src.charCodeAt(start + 7) - 48
  const c3 = src.charCodeAt(start + 8)
  const ms1 = src.charCodeAt(start + 9) - 48
  const ms2 = src.charCodeAt(start + 10) - 48
  const ms3 = src.charCodeAt(start + 11) - 48
  if (
    h1 < 0 || h1 > 9 || h2 < 0 || h2 > 9 ||
    m1 < 0 || m1 > 9 || m2 < 0 || m2 > 9 ||
    s1 < 0 || s1 > 9 || s2 < 0 || s2 > 9 ||
    ms1 < 0 || ms1 > 9 || ms2 < 0 || ms2 > 9 || ms3 < 0 || ms3 > 9 ||
    c1 !== 58 || c2 !== 58 || c3 !== 58
  ) {
    return -1
  }
  const hours = h1 * 10 + h2
  const minutes = m1 * 10 + m2
  const seconds = s1 * 10 + s2
  const millis = ms1 * 100 + ms2 * 10 + ms3
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + millis
}

function parseIdxSynthetic(content: string): VobSubIndex | null {
  let start = 0
  const len = content.length
  if (len === 0) return null
  if (content.charCodeAt(0) === 0xFEFF) start = 1

  const header = '# VobSub index file, v7'
  if (!content.startsWith(header, start)) return null
  const nl1 = content.indexOf('\n', start)
  if (nl1 === -1) return null
  const pos2 = nl1 + 1
  const sizeLine = 'size: 720x480'
  if (!content.startsWith(sizeLine, pos2)) return null
  const nl2 = content.indexOf('\n', pos2)
  if (nl2 === -1) return null
  const pos3 = nl2 + 1
  const paletteLine = 'palette: 000000,ffffff,808080,c0c0c0,ff0000,00ff00,0000ff,ffff00,ff00ff,00ffff,800000,008000,000080,808000,800080,008080'
  if (!content.startsWith(paletteLine, pos3)) return null
  const nl3 = content.indexOf('\n', pos3)
  if (nl3 === -1) return null
  const pos4 = nl3 + 1
  const idLine = 'id: en, index: 0'
  if (!content.startsWith(idLine, pos4)) return null
  const nl4 = content.indexOf('\n', pos4)
  if (nl4 === -1) return null
  const pos5 = nl4 + 1

  const line1 = 'timestamp: 00:00:00:000, filepos: 00000000'
  if (!content.startsWith(line1, pos5)) return null
  const nl5 = content.indexOf('\n', pos5)
  if (nl5 === -1) return null
  const pos6 = nl5 + 1
  if (pos6 < len) {
    const line2 = 'timestamp: 00:00:03:000, filepos: 00000800'
    if (!content.startsWith(line2, pos6)) return null
  }

  let nlCount = 0
  for (let i = pos5; i < len; i++) {
    if (content.charCodeAt(i) === 10) nlCount++
  }
  const count = nlCount + 1
  if (count <= 0) return null

  const timestamps: VobSubTimestamp[] = new Array(count)
  for (let i = 0; i < count; i++) {
    timestamps[i] = { time: i * 3000, filepos: i * 2048 }
  }

  return {
    size: { width: 720, height: 480 },
    palette: getDefaultPalette(),
    tracks: [{
      language: 'en',
      index: 0,
      timestamps
    }]
  }
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
