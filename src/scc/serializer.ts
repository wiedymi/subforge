import type { SubtitleDocument } from '../core/types.ts'
import { encodeCEA608Text, CONTROL_CODES } from './cea608.ts'

const FRAME_RATE = 29.97

// Pre-computed hex digits for fast lookup
const HEX_CHARS = '0123456789abcdef'

// Pre-computed control codes as hex strings
const RCL_HEX = formatHexPairStatic((CONTROL_CODES.RCL >> 8) & 0xff, CONTROL_CODES.RCL & 0xff)
const EOC_HEX = formatHexPairStatic((CONTROL_CODES.EOC >> 8) & 0xff, CONTROL_CODES.EOC & 0xff)

/**
 * Formats two bytes as a 4-digit hexadecimal pair for SCC encoding.
 */
function formatHexPairStatic(b1: number, b2: number): string {
  return HEX_CHARS[(b1 >> 4) & 0xf] + HEX_CHARS[b1 & 0xf] + HEX_CHARS[(b2 >> 4) & 0xf] + HEX_CHARS[b2 & 0xf]
}

/**
 * Formats milliseconds to SCC drop-frame timecode format (HH:MM:SS;FF).
 *
 * Uses 29.97 fps frame rate and semicolon separator to indicate drop-frame format.
 *
 * @param ms - Time in milliseconds
 * @returns Formatted timecode string in HH:MM:SS;FF format
 */
function formatTimecode(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  // Calculate frames from remaining milliseconds
  const remainingMs = ms % 1000
  const frames = Math.floor(remainingMs * FRAME_RATE / 1000)

  // Use semicolon for drop-frame (29.97 fps)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')};${String(frames).padStart(2, '0')}`
}

/**
 * Converts a subtitle document to SCC (Scenarist Closed Caption) format.
 *
 * Generates SCC file with proper header and CEA-608 encoded captions.
 * Each caption is wrapped with RCL (Resume Caption Loading) and EOC (End of Caption) commands.
 * Uses 29.97 fps drop-frame timecode format.
 *
 * @param doc - Subtitle document to convert
 * @returns SCC formatted string with header and caption data
 *
 * @example
 * ```ts
 * const doc = createDocument();
 * doc.events.push({
 *   start: 0,
 *   end: 3000,
 *   text: 'Hello, World!',
 *   // ... other event properties
 * });
 * const sccContent = toSCC(doc);
 * ```
 */
export function toSCC(doc: SubtitleDocument): string {
  const events = doc.events
  const len = events.length

  // Handle empty document
  if (len === 0) {
    return 'Scenarist_SCC V1.0\n\n'
  }

  // Pre-allocate output array (2 lines per event + header)
  const lines: string[] = ['Scenarist_SCC V1.0', '']

  for (let i = 0; i < len; i++) {
    const event = events[i]!
    const text = event.text

    // Start caption at event start time
    const startTime = formatTimecode(event.start)

    // Build hex pairs string directly
    let hexData = RCL_HEX + ' ' + RCL_HEX

    // Add text characters
    const textBytes = encodeCEA608Text(text)
    const bytesLen = textBytes.length
    for (let j = 0; j < bytesLen; j += 2) {
      const b1 = textBytes[j]!
      const b2 = textBytes[j + 1] ?? 0
      hexData += ' ' + HEX_CHARS[(b1 >> 4) & 0xf] + HEX_CHARS[b1 & 0xf] + HEX_CHARS[(b2 >> 4) & 0xf] + HEX_CHARS[b2 & 0xf]
    }

    lines[lines.length] = startTime + '\t' + hexData
    lines[lines.length] = ''

    // End caption at event end time
    const endTime = formatTimecode(event.end)
    lines[lines.length] = endTime + '\t' + EOC_HEX + ' ' + EOC_HEX
    lines[lines.length] = ''
  }

  return lines.join('\n')
}
