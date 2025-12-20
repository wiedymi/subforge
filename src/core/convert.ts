import type { SubtitleDocument, SubtitleEvent, TextSegment, Effect } from './types.ts'
import { toASS } from '../ass/serializer.ts'
import { toSRT } from '../srt/serializer.ts'
import { toVTT } from '../vtt/serializer.ts'
import { serializeTags as serializeASSSegments } from '../ass/tags.ts'
import { serializeTags as serializeSRTSegments } from '../srt/tags.ts'
import { serializeTags as serializeVTTSegments } from '../vtt/tags.ts'

export interface ConvertOptions {
  unsupported: 'drop' | 'comment'
  karaoke: 'preserve' | 'explode' | 'strip'
  positioning: 'preserve' | 'strip'
  reportLoss?: boolean
}

export interface ConvertResult {
  output: string
  lostFeatures: LostFeature[]
}

export interface LostFeature {
  eventIndex: number
  feature: string
  description: string
}

const defaultOptions: ConvertOptions = {
  unsupported: 'drop',
  karaoke: 'strip',
  positioning: 'strip',
  reportLoss: false
}

const srtSupported = new Set(['bold', 'italic', 'underline', 'strikeout', 'primaryColor'])
const vttSupported = new Set(['bold', 'italic', 'underline'])

export function convert(
  doc: SubtitleDocument,
  format: 'ass' | 'srt' | 'vtt',
  opts?: Partial<ConvertOptions>
): ConvertResult {
  const options = { ...defaultOptions, ...opts }
  const lostFeatures: LostFeature[] = []

  if (format === 'ass') {
    return { output: toASS(doc), lostFeatures: [] }
  }

  const convertedDoc: SubtitleDocument = {
    ...doc,
    events: doc.events.map((event, idx) => convertEvent(event, idx, format, options, lostFeatures))
  }

  const output = format === 'srt' ? toSRT(convertedDoc) : toVTT(convertedDoc)

  return { output, lostFeatures }
}

function convertEvent(
  event: SubtitleEvent,
  eventIndex: number,
  format: 'srt' | 'vtt',
  options: ConvertOptions,
  lostFeatures: LostFeature[]
): SubtitleEvent {
  if (!event.dirty && event.segments.length === 0) {
    return event
  }

  const segments = event.segments.length > 0 ? event.segments : [{ text: event.text, style: null, effects: [] }]
  const convertedSegments = segments.map(seg => convertSegment(seg, eventIndex, format, options, lostFeatures))

  const serializeSegments = format === 'srt' ? serializeSRTSegments : serializeVTTSegments
  const text = serializeSegments(convertedSegments)

  return {
    ...event,
    text,
    segments: convertedSegments,
    dirty: false
  }
}

function convertSegment(
  seg: TextSegment,
  eventIndex: number,
  format: 'srt' | 'vtt',
  options: ConvertOptions,
  lostFeatures: LostFeature[]
): TextSegment {
  const supported = format === 'srt' ? srtSupported : vttSupported
  const newStyle = { ...seg.style }
  const newEffects: Effect[] = []

  if (seg.style) {
    if (seg.style.pos !== undefined && options.positioning === 'strip') {
      if (options.reportLoss) {
        lostFeatures[lostFeatures.length] = {
          eventIndex,
          feature: 'positioning',
          description: `\\pos(${seg.style.pos[0]},${seg.style.pos[1]})`
        }
      }
      delete newStyle.pos
    }

    if (seg.style.alignment !== undefined && !supported.has('alignment')) {
      if (options.reportLoss) {
        lostFeatures[lostFeatures.length] = {
          eventIndex,
          feature: 'alignment',
          description: `\\an${seg.style.alignment}`
        }
      }
      delete newStyle.alignment
    }

    if (seg.style.fontName !== undefined && !supported.has('fontName')) {
      if (options.reportLoss) {
        lostFeatures[lostFeatures.length] = {
          eventIndex,
          feature: 'fontName',
          description: `\\fn${seg.style.fontName}`
        }
      }
      delete newStyle.fontName
    }

    if (seg.style.fontSize !== undefined && !supported.has('fontSize')) {
      if (options.reportLoss) {
        lostFeatures[lostFeatures.length] = {
          eventIndex,
          feature: 'fontSize',
          description: `\\fs${seg.style.fontSize}`
        }
      }
      delete newStyle.fontSize
    }
  }

  for (const effect of seg.effects) {
    if (effect.type === 'karaoke') {
      if (options.karaoke === 'strip') {
        if (options.reportLoss) {
          lostFeatures[lostFeatures.length] = {
            eventIndex,
            feature: 'karaoke',
            description: 'karaoke timing'
          }
        }
        continue
      }
    }

    if (!isEffectSupported(effect.type, format)) {
      if (options.reportLoss) {
        lostFeatures[lostFeatures.length] = {
          eventIndex,
          feature: effect.type,
          description: `\\${effect.type}`
        }
      }
      if (options.unsupported === 'drop') {
        continue
      }
    }

    newEffects[newEffects.length] = effect
  }

  return {
    text: seg.text,
    style: Object.keys(newStyle).length > 0 ? newStyle : null,
    effects: newEffects
  }
}

function isEffectSupported(type: string, format: 'srt' | 'vtt'): boolean {
  const supported: Record<string, string[]> = {
    srt: [],
    vtt: []
  }

  return supported[format]?.includes(type) ?? false
}
