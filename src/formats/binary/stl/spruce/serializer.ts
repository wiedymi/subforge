import type { SubtitleDocument } from '../../../../core/types.ts'

/**
 * Options for serializing to Spruce STL format
 */
interface SerializeOptions {
  /** Frame rate for timecode conversion (default: 25) */
  frameRate?: number
}

/**
 * Serializes a subtitle document to Spruce STL format
 *
 * Converts newlines in subtitle text to spaces as the format is single-line per subtitle.
 *
 * @param doc - Subtitle document to serialize
 * @param opts - Serialization options for frame rate
 * @returns Spruce STL formatted string
 *
 * @example
 * ```ts
 * const stl = toSpruceSTL(doc, { frameRate: 25 })
 * await Bun.write('output.stl', stl)
 * ```
 */
export function toSpruceSTL(doc: SubtitleDocument, opts: SerializeOptions = {}): string {
  const frameRate = opts.frameRate ?? 25
  const lines: string[] = []

  for (const event of doc.events) {
    const start = formatTimecode(event.start, frameRate)
    const end = formatTimecode(event.end, frameRate)
    const text = event.text.replace(/\n/g, ' ') // Convert newlines to spaces
    lines.push(`${start} , ${end} , ${text}`)
  }

  return lines.join('\n') + '\n'
}

function formatTimecode(timeMs: number, frameRate: number): string {
  const totalSeconds = Math.floor(timeMs / 1000)
  const hh = Math.floor(totalSeconds / 3600)
  const mm = Math.floor((totalSeconds % 3600) / 60)
  const ss = totalSeconds % 60
  const ff = Math.floor(((timeMs % 1000) / 1000) * frameRate)

  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}
