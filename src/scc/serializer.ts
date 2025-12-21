import type { SubtitleDocument } from '../core/types.ts'
import { encodeCEA608Text, getControlCode } from './cea608.ts'

const FRAME_RATE = 29.97

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
 * Formats two bytes as a 4-digit hexadecimal pair for SCC encoding.
 *
 * @param b1 - First byte (high byte)
 * @param b2 - Second byte (low byte)
 * @returns 4-character hexadecimal string (lowercase, zero-padded)
 */
function formatHexPair(b1: number, b2: number): string {
  const value = (b1 << 8) | b2
  return value.toString(16).padStart(4, '0')
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
  let result = 'Scenarist_SCC V1.0\n\n'

  const events = doc.events
  const len = events.length

  for (let i = 0; i < len; i++) {
    const event = events[i]!
    const text = event.text

    // Start caption at event start time
    const startTime = formatTimecode(event.start)

    // Build CEA-608 commands
    const hexPairs: string[] = []

    // Resume caption loading (RCL) - duplicate for emphasis per SCC convention
    const [rcl1, rcl2] = getControlCode('RCL')
    hexPairs.push(formatHexPair(rcl1, rcl2))
    hexPairs.push(formatHexPair(rcl1, rcl2))

    // Add text characters
    const textBytes = encodeCEA608Text(text)
    for (let j = 0; j < textBytes.length; j += 2) {
      const b1 = textBytes[j] ?? 0
      const b2 = textBytes[j + 1] ?? 0
      hexPairs.push(formatHexPair(b1, b2))
    }

    result += `${startTime}\t${hexPairs.join(' ')}\n\n`

    // End caption at event end time
    const endTime = formatTimecode(event.end)
    const [eoc1, eoc2] = getControlCode('EOC')
    result += `${endTime}\t${formatHexPair(eoc1, eoc2)} ${formatHexPair(eoc1, eoc2)}\n\n`
  }

  return result
}
