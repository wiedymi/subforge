// VobSub format support
import type { SubtitleDocument, SubtitleEvent, ImageEffect, VobSubEffect } from '../core/types.ts'
import { parseIdx, serializeIdx, type VobSubIndex } from './parser.ts'
import { parseSubPacket, createSubBinary, type SubtitlePacket } from './sub.ts'
import { decodeRLE, encodeRLE } from './rle.ts'

export { parseTime, formatTime } from './parser.ts'
export type { VobSubIndex, VobSubTrack, VobSubTimestamp } from './parser.ts'
export type { SubtitlePacket } from './sub.ts'
export { decodeRLE, encodeRLE } from './rle.ts'

/**
 * Successful VobSub parse result
 */
export interface ParseVobSubResult {
  /** Parse succeeded */
  ok: true
  /** Parsed subtitle document */
  data: SubtitleDocument
  /** Non-fatal parsing errors encountered */
  errors: string[]
}

/**
 * Failed VobSub parse result
 */
export interface ParseVobSubError {
  /** Parse failed */
  ok: false
  /** Fatal parsing errors */
  errors: string[]
}

/**
 * VobSub parse result type (success or error)
 */
export type ParseVobSubResultType = ParseVobSubResult | ParseVobSubError

/**
 * Parse VobSub subtitle files (.idx + .sub)
 * @param idx - Text content of .idx file
 * @param sub - Binary content of .sub file
 * @returns Parsed subtitle document
 * @throws {Error} If parsing fails
 * @example
 * const idxText = await Bun.file('movie.idx').text()
 * const subData = await Bun.file('movie.sub').arrayBuffer()
 * const doc = parseVobSub(idxText, new Uint8Array(subData))
 */
export function parseVobSub(idx: string, sub: Uint8Array): SubtitleDocument {
  const result = parseVobSubResult(idx, sub)
  if (!result.ok) {
    throw new Error(`VobSub parse failed:\n${result.errors.join('\n')}`)
  }
  return result.data
}

/**
 * Parse VobSub subtitle files with error handling
 * @param idx - Text content of .idx file
 * @param sub - Binary content of .sub file
 * @returns Parse result with success/failure status and any errors
 * @example
 * const result = parseVobSubResult(idxText, subData)
 * if (result.ok) {
 *   console.log('Parsed', result.data.events.length, 'events')
 * } else {
 *   console.error('Parse failed:', result.errors)
 * }
 */
export function parseVobSubResult(idx: string, sub: Uint8Array): ParseVobSubResultType {
  const errors: string[] = []

  try {
    const index = parseIdx(idx)

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

    let eventId = 0

    // Parse all tracks
    for (const track of index.tracks) {
      for (let i = 0; i < track.timestamps.length; i++) {
        const ts = track.timestamps[i]

        try {
          const packet = parseSubPacket(sub, ts.filepos)
          if (!packet) {
            errors.push(`Failed to parse packet at filepos ${ts.filepos.toString(16)}`)
            continue
          }

          // Decode RLE data
          const decoded = decodeRLE(packet.rleData, packet.width, packet.height)

          // Determine end time (use next timestamp or add duration)
          let endTime = ts.time + packet.duration
          if (packet.duration === 0 && i + 1 < track.timestamps.length) {
            endTime = track.timestamps[i + 1].time
          }
          if (endTime <= ts.time) {
            endTime = ts.time + 2000  // Default 2 second duration
          }

          // Create subtitle event
          const imageEffect: ImageEffect = {
            type: 'image',
            params: {
              format: 'indexed',
              width: packet.width,
              height: packet.height,
              x: packet.x,
              y: packet.y,
              data: decoded.data,
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

    return {
      ok: true,
      data: doc,
      errors,
    }
  } catch (err) {
    return {
      ok: false,
      errors: [...errors, String(err)],
    }
  }
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
    filepos += 14 + 6 + 10 + rleData.length + 20
  }

  // Create .sub binary
  const subBinary = createSubBinary(packets)

  // Update filepos values with actual offsets
  let actualPos = 0
  for (let i = 0; i < packets.length; i++) {
    index.tracks[0].timestamps[i].filepos = actualPos

    // Calculate actual packet size
    const rleSize = packets[i].rleData.length
    const controlSeqSize = 20  // Approximate
    const subPacketSize = rleSize + controlSeqSize
    const pesLength = 8 + 1 + 2 + subPacketSize
    const packetSize = 14 + 6 + pesLength

    actualPos += packetSize
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
