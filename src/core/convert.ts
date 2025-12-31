import type { SubtitleDocument, SubtitleEvent, TextSegment, InlineStyle, Effect } from './types.ts'
import type { ParseError, ParseWarning, ParseResult, ParseOptions } from './errors.ts'
import { createDocument } from './document.ts'
import { explodeKaraoke } from './ops.ts'

import { toASS } from '../formats/text/ass/serializer.ts'
import { toSSA } from '../formats/text/ssa/serializer.ts'
import { toSRT } from '../formats/text/srt/serializer.ts'
import { toVTT } from '../formats/text/vtt/serializer.ts'
import { toSBV } from '../formats/text/sbv/serializer.ts'
import { toLRC, type LRCSerializeOptions } from '../formats/text/lrc/serializer.ts'
import { toMicroDVD, type MicroDVDSerializeOptions } from '../formats/text/microdvd/serializer.ts'
import { toTTML, type TTMLSerializeOptions } from '../formats/xml/ttml/serializer.ts'
import { toDFXP } from '../formats/xml/ttml/dfxp.ts'
import { toSMPTETT } from '../formats/xml/ttml/smpte.ts'
import { toSAMI } from '../formats/xml/sami/serializer.ts'
import { toRealText } from '../formats/xml/realtext/serializer.ts'
import { toQT, type QTSerializeOptions } from '../formats/xml/qt/serializer.ts'
import { toEBUSTL, type EBUSTLSerializeOptions } from '../formats/binary/stl/ebu/serializer.ts'
import { toSpruceSTL, type SpruceSTLSerializeOptions } from '../formats/binary/stl/spruce/serializer.ts'
import { toPGS } from '../formats/binary/pgs/serializer.ts'
import { toDVB } from '../formats/binary/dvb/serializer.ts'
import { toVobSub } from '../formats/binary/vobsub/index.ts'
import { toPAC, type PACSerializeOptions } from '../formats/binary/pac/serializer.ts'
import { toSCC } from '../formats/broadcast/scc/serializer.ts'
import { toCAP, type CAPSerializerOptions } from '../formats/broadcast/cap/serializer.ts'
import { toTeletext } from '../formats/broadcast/teletext/serializer.ts'

import { parseASS } from '../formats/text/ass/parser.ts'
import { parseSSA } from '../formats/text/ssa/parser.ts'
import { parseSRT } from '../formats/text/srt/parser.ts'
import { parseVTT } from '../formats/text/vtt/parser.ts'
import { parseSBV } from '../formats/text/sbv/parser.ts'
import { parseLRC } from '../formats/text/lrc/parser.ts'
import { parseMicroDVD, type MicroDVDParseOptions } from '../formats/text/microdvd/parser.ts'
import { parseTTML } from '../formats/xml/ttml/parser.ts'
import { parseDFXP } from '../formats/xml/ttml/dfxp.ts'
import { parseSMPTETT } from '../formats/xml/ttml/smpte.ts'
import { parseSAMI } from '../formats/xml/sami/parser.ts'
import { parseRealText } from '../formats/xml/realtext/parser.ts'
import { parseQT } from '../formats/xml/qt/parser.ts'
import { parseEBUSTL } from '../formats/binary/stl/ebu/parser.ts'
import { parseSpruceSTL } from '../formats/binary/stl/spruce/parser.ts'
import { parsePGS } from '../formats/binary/pgs/parser.ts'
import { parseDVB } from '../formats/binary/dvb/parser.ts'
import { parseVobSub } from '../formats/binary/vobsub/index.ts'
import { parsePAC } from '../formats/binary/pac/parser.ts'
import { parseSCC } from '../formats/broadcast/scc/parser.ts'
import { parseCAP } from '../formats/broadcast/cap/parser.ts'
import { parseTeletext } from '../formats/broadcast/teletext/parser.ts'

import { serializeTags as serializeASSTags } from '../formats/text/ass/tags.ts'

export type FormatId =
  | 'ass'
  | 'ssa'
  | 'srt'
  | 'vtt'
  | 'sbv'
  | 'lrc'
  | 'microdvd'
  | 'ttml'
  | 'dfxp'
  | 'smpte-tt'
  | 'sami'
  | 'realtext'
  | 'qt'
  | 'ebu-stl'
  | 'spruce-stl'
  | 'pgs'
  | 'dvb'
  | 'vobsub'
  | 'pac'
  | 'scc'
  | 'cap'
  | 'teletext'

export interface FormatOutputMap {
  ass: string
  ssa: string
  srt: string
  vtt: string
  sbv: string
  lrc: string
  microdvd: string
  ttml: string
  dfxp: string
  'smpte-tt': string
  sami: string
  realtext: string
  qt: string
  'ebu-stl': Uint8Array
  'spruce-stl': string
  pgs: Uint8Array
  dvb: Uint8Array
  vobsub: { idx: string; sub: Uint8Array }
  pac: Uint8Array
  scc: string
  cap: string
  teletext: Uint8Array
}

export interface FormatOptionsMap {
  lrc?: LRCSerializeOptions
  microdvd?: MicroDVDSerializeOptions
  ttml?: TTMLSerializeOptions
  dfxp?: TTMLSerializeOptions
  'smpte-tt'?: TTMLSerializeOptions
  qt?: QTSerializeOptions
  cap?: CAPSerializerOptions
  pac?: PACSerializeOptions
  'ebu-stl'?: EBUSTLSerializeOptions
  'spruce-stl'?: SpruceSTLSerializeOptions
}

export interface FormatParseOptionsMap {
  ass?: Partial<ParseOptions>
  ssa?: Partial<ParseOptions>
  srt?: Partial<ParseOptions>
  vtt?: Partial<ParseOptions>
  sbv?: Partial<ParseOptions>
  lrc?: Partial<ParseOptions>
  microdvd?: MicroDVDParseOptions
  ttml?: Partial<ParseOptions>
  dfxp?: Partial<ParseOptions>
  'smpte-tt'?: Partial<ParseOptions>
  sami?: Partial<ParseOptions>
  realtext?: Partial<ParseOptions>
  qt?: Partial<ParseOptions>
  'ebu-stl'?: Partial<ParseOptions>
  'spruce-stl'?: Partial<ParseOptions>
  pgs?: Partial<ParseOptions>
  dvb?: Partial<ParseOptions>
  pac?: Partial<ParseOptions>
  scc?: Partial<ParseOptions>
  cap?: Partial<ParseOptions>
  teletext?: Partial<ParseOptions>
}

/**
 * Options for converting between subtitle formats.
 */
export interface ConvertOptions {
  /** Target format */
  to: FormatId
  /** How to handle unsupported effects: drop them or keep them */
  unsupported?: 'drop' | 'comment'
  /** How to handle karaoke timing: preserve, split into events, or remove */
  karaoke?: 'preserve' | 'explode' | 'strip'
  /** How to handle positioning tags: keep or remove */
  positioning?: 'preserve' | 'strip'
  /** Whether to track and report lost features */
  reportLoss?: boolean
  /** Per-format serializer options */
  formatOptions?: FormatOptionsMap
}

/**
 * Result of a format conversion.
 */
export interface ConvertResult<T extends FormatId = FormatId> {
  /** Converted subtitle file content */
  output: FormatOutputMap[T]
  /** Features that were lost in conversion */
  lostFeatures: LostFeature[]
}

/**
 * Options for end-to-end transcode (parse + convert).
 */
export interface TranscodeOptions<T extends FormatId = FormatId> extends Omit<ConvertOptions, 'to'> {
  /** Source format or 'auto' for best-effort text detection */
  from: FormatId | 'auto'
  /** Target format */
  to: T
  /** Per-format parse options */
  parseOptions?: FormatParseOptionsMap
}

/**
 * Result of a transcode operation.
 */
export interface TranscodeResult<T extends FormatId = FormatId> {
  ok: boolean
  output?: FormatOutputMap[T]
  document?: SubtitleDocument
  errors: ParseError[]
  warnings: ParseWarning[]
  lostFeatures: LostFeature[]
}

/**
 * A feature that was lost during conversion.
 */
export interface LostFeature {
  /** Index of the event that lost features */
  eventIndex: number
  /** Feature type that was lost */
  feature: string
  /** Human-readable description */
  description: string
}

const defaultOptions: Required<Pick<ConvertOptions, 'unsupported' | 'karaoke' | 'positioning' | 'reportLoss'>> = {
  unsupported: 'drop',
  karaoke: 'strip',
  positioning: 'strip',
  reportLoss: false
}

type InlineStyleKey = keyof InlineStyle

type TextMode = 'segments' | 'plain' | 'ass-tags' | 'images'

interface FormatProfile {
  inlineStyles: Set<InlineStyleKey> | 'all'
  effects: Set<string> | 'all'
  textMode: TextMode
}

const srtStyles = new Set<InlineStyleKey>(['bold', 'italic', 'underline', 'strikeout', 'primaryColor'])
const vttStyles = new Set<InlineStyleKey>(['bold', 'italic', 'underline'])
const microDVDStyles = new Set<InlineStyleKey>(['bold', 'italic', 'underline', 'strikeout', 'primaryColor', 'fontName', 'fontSize'])
const samiStyles = srtStyles
const ttmlStyles = new Set<InlineStyleKey>(['fontName', 'fontSize', 'bold', 'italic', 'underline', 'strikeout', 'primaryColor', 'backColor'])
const pacStyles = new Set<InlineStyleKey>(['italic', 'underline'])

const profileMap: Record<FormatId, FormatProfile> = {
  ass: { inlineStyles: 'all', effects: 'all', textMode: 'segments' },
  ssa: { inlineStyles: 'all', effects: 'all', textMode: 'segments' },
  srt: { inlineStyles: srtStyles, effects: new Set(), textMode: 'segments' },
  vtt: { inlineStyles: vttStyles, effects: new Set(), textMode: 'segments' },
  sbv: { inlineStyles: new Set(), effects: new Set(), textMode: 'plain' },
  lrc: { inlineStyles: new Set(), effects: new Set(['karaoke', 'karaokeAbsolute']), textMode: 'segments' },
  microdvd: { inlineStyles: microDVDStyles, effects: new Set(), textMode: 'segments' },
  ttml: { inlineStyles: ttmlStyles, effects: new Set(), textMode: 'segments' },
  dfxp: { inlineStyles: ttmlStyles, effects: new Set(), textMode: 'segments' },
  'smpte-tt': { inlineStyles: ttmlStyles, effects: new Set(), textMode: 'segments' },
  sami: { inlineStyles: samiStyles, effects: new Set(), textMode: 'segments' },
  realtext: { inlineStyles: new Set(), effects: new Set(), textMode: 'plain' },
  qt: { inlineStyles: new Set(), effects: new Set(), textMode: 'plain' },
  'ebu-stl': { inlineStyles: new Set(), effects: new Set(), textMode: 'plain' },
  'spruce-stl': { inlineStyles: new Set(), effects: new Set(), textMode: 'plain' },
  pgs: { inlineStyles: new Set(), effects: new Set(['image', 'pgs']), textMode: 'images' },
  dvb: { inlineStyles: new Set(), effects: new Set(['image']), textMode: 'images' },
  vobsub: { inlineStyles: new Set(), effects: new Set(['image', 'vobsub']), textMode: 'images' },
  pac: { inlineStyles: pacStyles, effects: new Set(), textMode: 'ass-tags' },
  scc: { inlineStyles: new Set(), effects: new Set(), textMode: 'plain' },
  cap: { inlineStyles: new Set(), effects: new Set(), textMode: 'plain' },
  teletext: { inlineStyles: new Set(), effects: new Set(), textMode: 'plain' },
}

/**
 * Converts a subtitle document to a different format.
 * Handles feature compatibility and tracks lost features.
 * @param doc - Subtitle document to convert
 * @param opts - Conversion options
 * @returns Converted output and list of lost features
 * @example
 * ```ts
 * const result = convert(assDoc, {
 *   to: 'srt',
 *   karaoke: 'strip',
 *   positioning: 'strip',
 *   reportLoss: true
 * })
 * console.log(`Lost ${result.lostFeatures.length} features`)
 * console.log(result.output)
 * ```
 */
export function convert<T extends FormatId>(
  doc: SubtitleDocument,
  opts: ConvertOptions & { to: T }
): ConvertResult<T> {
  const options = { ...defaultOptions, ...opts }
  const lostFeatures: LostFeature[] = []
  const profile = profileMap[options.to]

  const sourceEvents = options.karaoke === 'explode'
    ? doc.events.flatMap(event => explodeKaraoke(event))
    : doc.events

  const convertedEvents = sourceEvents.map((event, idx) =>
    convertEvent(event, idx, profile, options, lostFeatures)
  )

  const convertedDoc: SubtitleDocument = {
    ...doc,
    events: convertedEvents
  }

  const output = serializeByFormat(options.to, convertedDoc, options.formatOptions)
  return { output: output as FormatOutputMap[T], lostFeatures }
}

/**
 * Parse and convert in one step.
 */
export function transcode<T extends FormatId>(
  input: string | Uint8Array | ArrayBuffer | { idx: string; sub: Uint8Array | ArrayBuffer },
  opts: TranscodeOptions & { to: T }
): TranscodeResult<T> {
  const detected = opts.from === 'auto' ? detectFormat(input) : opts.from
  if (!detected) {
    return {
      ok: false,
      errors: [makeParseError('INVALID_SECTION', 'Unable to detect format from input')],
      warnings: [],
      lostFeatures: []
    }
  }

  const parseResult = parseByFormat(detected, input, opts.parseOptions)
  if (!parseResult.ok) {
    return {
      ok: false,
      document: parseResult.document,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
      lostFeatures: []
    }
  }

  const conversion = convert(parseResult.document, { ...opts, to: opts.to })
  return {
    ok: true,
    output: conversion.output,
    document: parseResult.document,
    errors: parseResult.errors,
    warnings: parseResult.warnings,
    lostFeatures: conversion.lostFeatures
  }
}

function convertEvent(
  event: SubtitleEvent,
  eventIndex: number,
  profile: FormatProfile,
  options: Required<Pick<ConvertOptions, 'unsupported' | 'karaoke' | 'positioning' | 'reportLoss'>>,
  lostFeatures: LostFeature[]
): SubtitleEvent {
  const baseSegments = event.segments.length > 0
    ? event.segments
    : [{ text: event.text, style: null, effects: [] }]

  const convertedSegments = baseSegments.map(seg =>
    convertSegment(seg, eventIndex, profile, options, lostFeatures)
  )

  let text = event.text
  let dirty = event.dirty

  switch (profile.textMode) {
    case 'plain':
      text = plainTextFromSegments(convertedSegments, event.text)
      dirty = false
      break
    case 'ass-tags':
      text = serializeASSTags(convertedSegments)
      dirty = false
      break
    case 'segments':
      dirty = convertedSegments.length > 0
      break
    case 'images':
      dirty = false
      break
  }

  return {
    ...event,
    text,
    segments: convertedSegments,
    dirty
  }
}

function convertSegment(
  seg: TextSegment,
  eventIndex: number,
  profile: FormatProfile,
  options: Required<Pick<ConvertOptions, 'unsupported' | 'karaoke' | 'positioning' | 'reportLoss'>>,
  lostFeatures: LostFeature[]
): TextSegment {
  const newStyle = seg.style ? { ...seg.style } : null
  const newEffects: Effect[] = []

  if (newStyle) {
    if (newStyle.pos !== undefined && options.positioning === 'strip') {
      reportLoss(lostFeatures, eventIndex, 'positioning', `pos(${newStyle.pos[0]},${newStyle.pos[1]})`, options)
      delete newStyle.pos
    }

    if (newStyle.alignment !== undefined && options.positioning === 'strip') {
      reportLoss(lostFeatures, eventIndex, 'alignment', `an${newStyle.alignment}`, options)
      delete newStyle.alignment
    }

    if (profile.inlineStyles !== 'all') {
      for (const key of Object.keys(newStyle) as InlineStyleKey[]) {
        if (!profile.inlineStyles.has(key)) {
          reportLoss(lostFeatures, eventIndex, String(key), String(key), options)
          delete (newStyle as Record<string, unknown>)[key]
        }
      }
    }
  }

  for (const effect of seg.effects) {
    if (isKaraokeEffect(effect) && options.karaoke === 'strip') {
      reportLoss(lostFeatures, eventIndex, 'karaoke', 'karaoke timing', options)
      continue
    }

    if (!isEffectSupported(effect.type, profile)) {
      reportLoss(lostFeatures, eventIndex, effect.type, `\${effect.type}`, options)
      if (options.unsupported === 'drop') {
        continue
      }
    }

    newEffects[newEffects.length] = effect
  }

  return {
    text: seg.text,
    style: newStyle && Object.keys(newStyle).length > 0 ? newStyle : null,
    effects: newEffects
  }
}

function isEffectSupported(type: string, profile: FormatProfile): boolean {
  if (profile.effects === 'all') return true
  return profile.effects.has(type)
}

function isKaraokeEffect(effect: Effect): boolean {
  return effect.type === 'karaoke' || effect.type === 'karaokeAbsolute'
}

function plainTextFromSegments(segments: TextSegment[], fallback: string): string {
  if (segments.length === 0) return fallback
  return segments.map(seg => seg.text).join('')
}

function reportLoss(
  lostFeatures: LostFeature[],
  eventIndex: number,
  feature: string,
  description: string,
  options: Required<Pick<ConvertOptions, 'reportLoss'>>
): void {
  if (!options.reportLoss) return
  lostFeatures[lostFeatures.length] = { eventIndex, feature, description }
}

function serializeByFormat(format: FormatId, doc: SubtitleDocument, formatOptions?: FormatOptionsMap): FormatOutputMap[FormatId] {
  switch (format) {
    case 'ass':
      return toASS(doc)
    case 'ssa':
      return toSSA(doc)
    case 'srt':
      return toSRT(doc)
    case 'vtt':
      return toVTT(doc)
    case 'sbv':
      return toSBV(doc)
    case 'lrc':
      return toLRC(doc, formatOptions?.lrc)
    case 'microdvd':
      if (!formatOptions?.microdvd) {
        throw new Error('microdvd requires formatOptions.microdvd')
      }
      return toMicroDVD(doc, formatOptions.microdvd)
    case 'ttml':
      return toTTML(doc, formatOptions?.ttml)
    case 'dfxp':
      return toDFXP(doc, formatOptions?.dfxp)
    case 'smpte-tt':
      return toSMPTETT(doc, formatOptions?.['smpte-tt'])
    case 'sami':
      return toSAMI(doc)
    case 'realtext':
      return toRealText(doc)
    case 'qt':
      return toQT(doc, formatOptions?.qt)
    case 'ebu-stl':
      return toEBUSTL(doc, formatOptions?.['ebu-stl'])
    case 'spruce-stl':
      return toSpruceSTL(doc, formatOptions?.['spruce-stl'])
    case 'pgs':
      return toPGS(doc)
    case 'dvb':
      return toDVB(doc)
    case 'vobsub':
      return toVobSub(doc)
    case 'pac':
      return toPAC(doc, formatOptions?.pac)
    case 'scc':
      return toSCC(doc)
    case 'cap':
      return toCAP(doc, formatOptions?.cap)
    case 'teletext':
      return toTeletext(doc)
  }
}

function parseByFormat(
  format: FormatId,
  input: string | Uint8Array | ArrayBuffer | { idx: string; sub: Uint8Array | ArrayBuffer },
  parseOptions?: FormatParseOptionsMap
): ParseResult {
  switch (format) {
    case 'ass':
      return ensureString(input, format, () => parseASS(input, parseOptions?.ass))
    case 'ssa':
      return ensureString(input, format, () => parseSSA(input, parseOptions?.ssa))
    case 'srt':
      return ensureString(input, format, () => parseSRT(input, parseOptions?.srt))
    case 'vtt':
      return ensureString(input, format, () => parseVTT(input, parseOptions?.vtt))
    case 'sbv':
      return ensureString(input, format, () => parseSBV(input, parseOptions?.sbv))
    case 'lrc':
      return ensureString(input, format, () => parseLRC(input, parseOptions?.lrc))
    case 'microdvd':
      if (typeof input !== 'string') return parseFailure(format, 'Expected string input')
      if (!parseOptions?.microdvd?.fps) {
        return parseFailure(format, 'microdvd requires parseOptions.microdvd.fps')
      }
      return parseMicroDVD(input, parseOptions.microdvd)
    case 'ttml':
      return ensureString(input, format, () => parseTTML(input, parseOptions?.ttml))
    case 'dfxp':
      return ensureString(input, format, () => parseDFXP(input))
    case 'smpte-tt':
      return ensureString(input, format, () => parseSMPTETT(input))
    case 'sami':
      return ensureString(input, format, () => parseSAMI(input, parseOptions?.sami))
    case 'realtext':
      return ensureString(input, format, () => parseRealText(input, parseOptions?.realtext))
    case 'qt':
      return ensureString(input, format, () => parseQT(input, parseOptions?.qt))
    case 'ebu-stl':
      return ensureBinary(input, format, () => parseEBUSTL(asBinary(input), parseOptions?.['ebu-stl']))
    case 'spruce-stl':
      return ensureString(input, format, () => parseSpruceSTL(input, parseOptions?.['spruce-stl']))
    case 'pgs':
      return ensureBinary(input, format, () => parsePGS(asBinary(input), parseOptions?.pgs))
    case 'dvb':
      return ensureBinary(input, format, () => parseDVB(asBinary(input), parseOptions?.dvb))
    case 'vobsub':
      if (!isVobSubInput(input)) return parseFailure(format, 'Expected { idx, sub } input')
      return parseVobSub(input.idx, input.sub)
    case 'pac':
      return ensureBinary(input, format, () => parsePAC(asBinary(input), parseOptions?.pac))
    case 'scc':
      return ensureString(input, format, () => parseSCC(input, parseOptions?.scc))
    case 'cap':
      return ensureString(input, format, () => parseCAP(input, parseOptions?.cap))
    case 'teletext':
      return ensureBinary(input, format, () => parseTeletext(asBinary(input), parseOptions?.teletext))
  }
}

function detectFormat(
  input: string | Uint8Array | ArrayBuffer | { idx: string; sub: Uint8Array | ArrayBuffer }
): FormatId | null {
  if (typeof input !== 'string') return null
  const text = input.trimStart()
  if (text.startsWith('WEBVTT')) return 'vtt'
  if (text.startsWith('Scenarist_SCC')) return 'scc'
  if (text.startsWith('$CaptionMAX')) return 'cap'
  if (text.startsWith('{QTtext}')) return 'qt'
  if (text.startsWith('[Script Info]')) return text.includes('V4+ Styles') ? 'ass' : 'ssa'
  if (text.startsWith('<SAMI') || text.startsWith('<SAMI>')) return 'sami'
  if (text.startsWith('<tt') || text.includes('<tt ')) return 'ttml'
  if (text.startsWith('<window')) return 'realtext'
  if (text.startsWith('{') && text.includes('}{')) return 'microdvd'
  if (text.includes('-->')) return text.includes(',') ? 'srt' : 'vtt'
  if (text.includes(',') && /\d+:\d{2}:\d{2}\.\d{3}\s*,/.test(text)) return 'sbv'
  if (text.includes('[') && /\[\d{2}:\d{2}\.\d{2,3}\]/.test(text)) return 'lrc'
  return null
}

function ensureString<T>(
  input: string | Uint8Array | ArrayBuffer | { idx: string; sub: Uint8Array | ArrayBuffer },
  format: FormatId,
  fn: () => ParseResult
): ParseResult {
  if (typeof input !== 'string') {
    return parseFailure(format, 'Expected string input')
  }
  return fn()
}

function ensureBinary(
  input: string | Uint8Array | ArrayBuffer | { idx: string; sub: Uint8Array | ArrayBuffer },
  format: FormatId,
  fn: () => ParseResult
): ParseResult {
  if (typeof input === 'string') {
    return parseFailure(format, 'Expected binary input')
  }
  if (isVobSubInput(input)) {
    return parseFailure(format, 'Expected binary input, not VobSub bundle')
  }
  return fn()
}

function isVobSubInput(
  input: string | Uint8Array | ArrayBuffer | { idx: string; sub: Uint8Array | ArrayBuffer }
): input is { idx: string; sub: Uint8Array | ArrayBuffer } {
  return typeof input === 'object' && input !== null && 'idx' in input && 'sub' in input
}

function asBinary(input: Uint8Array | ArrayBuffer): Uint8Array | ArrayBuffer {
  return input
}

function parseFailure(format: FormatId, message: string): ParseResult {
  return {
    ok: false,
    document: createDocument(),
    errors: [makeParseError('INVALID_SECTION', `${format}: ${message}`)],
    warnings: []
  }
}

function makeParseError(code: ParseError['code'], message: string): ParseError {
  return { line: 1, column: 1, code, message }
}
