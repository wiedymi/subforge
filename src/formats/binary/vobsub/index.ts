// VobSub format support
import type { SubtitleDocument, SubtitleEvent, ImageEffect, VobSubEffect } from '../../../core/types.ts'
import type { ParseOptions, ParseResult } from '../../../core/errors.ts'
import { toParseError } from '../../../core/errors.ts'
import { createDocument, EMPTY_SEGMENTS } from '../../../core/document.ts'
import { toUint8Array } from '../../../core/binary.ts'
import { parseIdx, serializeIdx, type VobSubIndex } from './parser.ts'
import { parseSubPacket, createSubBinary, type SubtitlePacket } from './sub.ts'
import { decodeRLE, encodeRLE } from './rle.ts'

export { parseTime, formatTime } from './parser.ts'
export type { VobSubIndex, VobSubTrack, VobSubTimestamp } from './parser.ts'
export type { SubtitlePacket } from './sub.ts'

export type VobSubParseOptions = ParseOptions & {
  /**
   * Decode image data.
   * - 'full': decode to indexed bitmap (default)
   * - 'rle': keep raw RLE data in the image effect
   * - 'none': skip sub packet parsing and image data (timing only)
   */
  decode?: 'full' | 'rle' | 'none'
}
export { decodeRLE, encodeRLE } from './rle.ts'

/**
 * Parse VobSub subtitle files (.idx + .sub)
 * @param idx - Text content of .idx file
 * @param sub - Binary content of .sub file
 * @returns ParseResult containing the document and any errors/warnings
 * @example
 * const idxText = await Bun.file('movie.idx').text()
 * const subData = await Bun.file('movie.sub').arrayBuffer()
 * const result = parseVobSub(idxText, new Uint8Array(subData))
 */
export function parseVobSub(
  idx: string,
  sub: Uint8Array | ArrayBuffer,
  opts: Partial<VobSubParseOptions> = {}
): ParseResult {
  try {
    const data = toUint8Array(sub)
    const errors: string[] = []
    const decodeMode = opts.decode ?? 'full'
    const index = decodeMode === 'none' ? parseIdxTimings(idx) : parseIdx(idx)

    const doc: SubtitleDocument = {
      info: {
        title: 'VobSub',
        playResX: index.size.width,
        playResY: index.size.height,
        scaleBorderAndShadow: true,
        wrapStyle: 0,
      },
      styles: new Map([
        ['Default', {
          name: 'Default',
          fontName: 'Arial',
          fontSize: 20,
          primaryColor: 0xFFFFFFFF,
          secondaryColor: 0x00FF00FF,
          outlineColor: 0x000000FF,
          backColor: 0x000000FF,
          bold: false,
          italic: false,
          underline: false,
          strikeout: false,
          scaleX: 100,
          scaleY: 100,
          spacing: 0,
          angle: 0,
          borderStyle: 1,
          outline: 2,
          shadow: 0,
          alignment: 2,
          marginL: 10,
          marginR: 10,
          marginV: 10,
          encoding: 1,
        }],
      ]),
      events: [],
      comments: [],
    }
    if (decodeMode === 'none') {
      let total = 0
      for (const track of index.tracks) total += track.timestamps.length
      doc.events = new Array(total)
    }

    let eventId = 0

    // Parse all tracks
    for (const track of index.tracks) {
      for (let i = 0; i < track.timestamps.length; i++) {
        const ts = track.timestamps[i]

        try {
          if (decodeMode === 'none') {
            const next = i + 1 < track.timestamps.length ? track.timestamps[i + 1]!.time : ts.time + 2000
            const endTime = next > ts.time ? next : ts.time + 2000
            const id = eventId++
            const event: SubtitleEvent = {
              id,
              start: ts.time,
              end: endTime,
              layer: 0,
              style: 'Default',
              actor: '',
              marginL: 0,
              marginR: 0,
              marginV: 0,
              effect: '',
              text: '',
              segments: EMPTY_SEGMENTS,
              dirty: false,
            }
            doc.events[id] = event
            continue
          }

          const packet = parseSubPacket(data, ts.filepos)
          if (!packet) {
            errors.push(`Failed to parse packet at filepos ${ts.filepos.toString(16)}`)
            continue
          }

          // Determine end time (use next timestamp or add duration)
          let endTime = ts.time + packet.duration
          if (packet.duration === 0 && i + 1 < track.timestamps.length) {
            endTime = track.timestamps[i + 1].time
          }
          if (endTime <= ts.time) {
            endTime = ts.time + 2000  // Default 2 second duration
          }

          const imageEffect: ImageEffect = decodeMode === 'rle'
            ? {
              type: 'image',
              params: {
                format: 'rle',
                width: packet.width,
                height: packet.height,
                x: packet.x,
                y: packet.y,
                data: packet.rleData,
                palette: index.palette,
              },
            }
            : {
              type: 'image',
              params: {
                format: 'indexed',
                width: packet.width,
                height: packet.height,
                x: packet.x,
                y: packet.y,
                data: decodeRLE(packet.rleData, packet.width, packet.height).data,
                palette: index.palette,
              },
            }

          const vobsubEffect: VobSubEffect = {
            type: 'vobsub',
            params: {
              forced: packet.forced,
              originalIndex: track.index,
            },
          }

          const event: SubtitleEvent = {
            id: eventId++,
            start: ts.time,
            end: endTime,
            layer: 0,
            style: 'Default',
            actor: '',
            marginL: 0,
            marginR: 0,
            marginV: 0,
            effect: '',
            text: '',
            segments: [{
              text: '',
              style: null,
              effects: [imageEffect, vobsubEffect],
            }],
            dirty: false,
          }

          doc.events.push(event)
        } catch (err) {
          errors.push(`Error parsing packet at ${ts.filepos.toString(16)}: ${err}`)
        }
      }
    }

    const parseErrors = errors.map(message => ({
      line: 0,
      column: 0,
      code: 'MALFORMED_EVENT' as const,
      message,
    }))

    return {
      ok: parseErrors.length === 0,
      document: doc,
      errors: parseErrors,
      warnings: [],
    }
  } catch (err) {
    return {
      ok: false,
      document: createDocument(),
      errors: [toParseError(err)],
      warnings: []
    }
  }
}

function parseIdxTimings(content: string): VobSubIndex {
  let pos = 0
  const len = content.length
  if (len === 0) {
    return {
      size: { width: 720, height: 480 },
      palette: [],
      tracks: [],
    }
  }
  if (content.charCodeAt(0) === 0xFEFF) pos = 1

  const index: VobSubIndex = {
    size: { width: 720, height: 480 },
    palette: [],
    tracks: [],
  }

  let currentTrack = null as VobSubIndex['tracks'][number] | null

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
        } else if (content.startsWith('timestamp:', lineStart)) {
          if (!currentTrack) {
            currentTrack = { language: 'en', index: 0, timestamps: [] }
            index.tracks.push(currentTrack)
          }
          const time = parseTimeFixed(content, lineStart + 11)
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

/**
 * Convert SubtitleDocument to VobSub format
 * @param doc - Subtitle document to convert
 * @returns Object containing .idx text and .sub binary data
 * @example
 * const { idx, sub } = toVobSub(document)
 * await Bun.write('output.idx', idx)
 * await Bun.write('output.sub', sub)
 */
export function toVobSub(doc: SubtitleDocument): { idx: string; sub: Uint8Array } {
  const index: VobSubIndex = {
    size: {
      width: doc.info.playResX,
      height: doc.info.playResY,
    },
    palette: [],
    tracks: [{
      language: 'en',
      index: 0,
      timestamps: [],
    }],
  }

  const packets: SubtitlePacket[] = []
  let filepos = 0

  for (const event of doc.events) {
    // Find image effect
    const imageEffect = event.segments
      .flatMap(seg => seg.effects)
      .find(eff => eff.type === 'image') as ImageEffect | undefined

    if (!imageEffect) {
      continue
    }

    const params = imageEffect.params

    // Extract palette (use first event's palette for the whole file)
    if (index.palette.length === 0 && params.palette) {
      index.palette = params.palette
    }

    // Find vobsub effect for metadata
    const vobsubEffect = event.segments
      .flatMap(seg => seg.effects)
      .find(eff => eff.type === 'vobsub') as VobSubEffect | undefined

    // Encode bitmap to RLE
    const rleData = encodeRLE(params.data, params.width, params.height)

    const packet: SubtitlePacket = {
      pts: event.start,
      duration: event.end - event.start,
      x: params.x || 0,
      y: params.y || 0,
      width: params.width,
      height: params.height,
      rleData,
      forced: vobsubEffect?.params.forced || false,
    }

    packets.push(packet)

    index.tracks[0].timestamps.push({
      time: event.start,
      filepos,
    })

    // Estimate filepos (will be recalculated when creating binary)
    filepos += estimatePacketSize(rleData.length, packet.forced)
  }

  // Create .sub binary
  const subBinary = createSubBinary(packets)

  // Update filepos values with actual offsets
  let actualPos = 0
  for (let i = 0; i < packets.length; i++) {
    index.tracks[0].timestamps[i].filepos = actualPos

    // Calculate actual packet size
    actualPos += estimatePacketSize(packets[i].rleData.length, packets[i].forced)
  }

  // Ensure we have a palette
  if (index.palette.length === 0) {
    // Use default palette
    index.palette = [
      0x000000FF, 0xFFFFFFFF, 0x808080FF, 0xC0C0C0FF,
      0xFF0000FF, 0x00FF00FF, 0x0000FFFF, 0xFFFF00FF,
      0xFF00FFFF, 0x00FFFFFF, 0x800000FF, 0x008000FF,
      0x000080FF, 0x808000FF, 0x800080FF, 0x008080FF,
    ]
  }

  const idxContent = serializeIdx(index)

  return {
    idx: idxContent,
    sub: subBinary,
  }
}

function estimatePacketSize(rleSize: number, forced: boolean): number {
  const controlSeqSize = forced ? 12 : 11
  const subPacketSize = 4 + rleSize + controlSeqSize
  const pesLength = 11 + subPacketSize
  return 20 + pesLength
}
