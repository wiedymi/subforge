import type { SubtitleDocument } from '../core/types.ts'
import { formatTime, fpsToVideoStandard } from './time.ts'

/**
 * Options for CAP format serialization.
 */
export interface CAPSerializerOptions {
  /** Frame rate (defaults to 25 for PAL) */
  fps?: number
  /** Video standard name (defaults to inferred from fps: 'PAL' or 'NTSC') */
  videoStandard?: string
  /** Character encoding (defaults to 'ISO_8859_1') */
  characterSet?: string
}

/**
 * Converts a subtitle document to CAP (CaptionMAX) format.
 *
 * Generates a CAP file with header metadata and subtitle entries. Each subtitle includes
 * start and end timecodes in HH:MM:SS:FF format, followed by the subtitle text.
 *
 * @param doc - Subtitle document to convert
 * @param opts - Serialization options for fps, video standard, and character set
 * @returns CAP formatted string with header and subtitle data
 *
 * @example
 * ```ts
 * const doc = createDocument();
 * doc.events.push({
 *   start: 1000,
 *   end: 4000,
 *   text: 'Hello, World!',
 *   // ... other event properties
 * });
 * const capContent = toCAP(doc, { fps: 25, videoStandard: 'PAL' });
 * ```
 */
export function toCAP(doc: SubtitleDocument, opts: CAPSerializerOptions = {}): string {
  const fps = opts.fps ?? 25
  const videoStandard = opts.videoStandard ?? fpsToVideoStandard(fps)
  const characterSet = opts.characterSet ?? 'ISO_8859_1'

  let result = ''

  // Write header
  result += `$CaptionMAX 2.0\n`
  result += `$VideoStandard ${videoStandard}\n`
  result += `$CharacterSet ${characterSet}\n`
  result += '\n'

  // Write subtitles
  const events = doc.events
  const len = events.length

  for (let i = 0; i < len; i++) {
    const event = events[i]!
    const text = event.text

    result += formatTime(event.start, fps) + '\t' + formatTime(event.end, fps) + '\n'
    result += text + '\n'

    // Add empty line between subtitles (except after last)
    if (i < len - 1) {
      result += '\n'
    }
  }

  return result
}
