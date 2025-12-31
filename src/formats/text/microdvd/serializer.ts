import type { SubtitleDocument } from '../../../core/types.ts'
import { serializeTags } from './tags.ts'

export interface MicroDVDSerializeOptions {
  /** Frame rate (frames per second) for converting time to frame numbers */
  fps: number
}

/**
 * Serializes a subtitle document to MicroDVD format.
 *
 * Converts subtitle events to MicroDVD frame-based format.
 * Line breaks are converted to pipe (|) characters.
 *
 * @param doc - The subtitle document to serialize
 * @param opts - Serialization options including fps
 * @returns MicroDVD formatted string
 *
 * @example
 * ```ts
 * const mdvd = toMicroDVD(document, { fps: 23.976 });
 * console.log(mdvd);
 * // {0}{100}First subtitle
 * // {100}{200}Second subtitle
 * ```
 */
export function toMicroDVD(doc: SubtitleDocument, opts: MicroDVDSerializeOptions): string {
  const fps = opts.fps
  let result = ''
  const events = doc.events
  const len = events.length

  for (let i = 0; i < len; i++) {
    const event = events[i]!
    let text = event.dirty && event.segments.length > 0
      ? serializeTags(event.segments)
      : event.text

    // Convert line breaks to pipe
    if (text.includes('\n')) {
      text = text.replace(/\n/g, '|')
    }

    // Convert milliseconds to frames
    const startFrame = Math.round((event.start / 1000) * fps)
    const endFrame = Math.round((event.end / 1000) * fps)

    result += `{${startFrame}}{${endFrame}}${text}\n`
  }

  return result
}
