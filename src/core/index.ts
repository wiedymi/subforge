/**
 * Core module for subtitle processing.
 *
 * Provides type definitions, document manipulation, format conversion,
 * and utility functions for working with subtitle files.
 *
 * @module core
 *
 * @example
 * ```ts
 * import { createDocument, createEvent, convert } from '@subforge/core'
 *
 * // Create a new subtitle document
 * const doc = createDocument()
 *
 * // Add events
 * doc.events.push(createEvent(0, 3000, 'Hello, world!'))
 * doc.events.push(createEvent(3000, 6000, 'Welcome to Subforge'))
 *
 * // Convert to SRT
 * const { output } = convert(doc, { to: 'srt' })
 * console.log(output)
 * ```
 */

// Types
export type {
  SubtitleDocument,
  ScriptInfo,
  Comment,
  EmbeddedData,
  VTTRegion,
  Style,
  Alignment,
  SubtitleEvent,
  TextSegment,
  InlineStyle,
  Effect,
  KaraokeEffect,
  BlurEffect,
  BorderEffect,
  ShadowEffect,
  ScaleEffect,
  RotateEffect,
  ShearEffect,
  SpacingEffect,
  FadeEffect,
  FadeComplexEffect,
  MoveEffect,
  ClipEffect,
  DrawingEffect,
  AnimateEffect,
  ResetEffect,
  UnknownEffect,
  KnownEffect,
} from './types.ts'

// Errors
export type {
  ParseOptions,
  ParseResult,
  ParseError,
  ParseWarning,
  ErrorCode,
} from './errors.ts'
export { SubforgeError, unwrap } from './errors.ts'

// Encoding
export { detectEncoding, decode, encode } from './encoding.ts'
// Binary
export { toUint8Array } from './binary.ts'

// Color
export { rgba, fromRGBA, withAlpha, blend, lighten, darken, Colors } from './color.ts'

// Time
export { formatDuration, clamp, overlap, duration } from './time.ts'

// Effects
export { registerEffect, getEffectHandler } from './effects.ts'

// Document
export {
  generateId,
  createDocument,
  createDefaultStyle,
  createEvent,
  createKaraokeEvent,
  cloneDocument,
  cloneEvent,
} from './document.ts'

// Operations
export {
  shiftEvents,
  scaleEvents,
  sortByTime,
  sortByLayer,
  getEventsAt,
  getEventsBetween,
  searchReplace,
  changeStyle,
  getKaraoke,
  getKaraokeOffset,
  scaleKaraoke,
  retimeKaraoke,
  explodeKaraoke,
  getActiveKaraokeSegment,
  getKaraokeProgress,
} from './ops.ts'

// Query
export {
  findByStyle,
  findByActor,
  findByLayer,
  findByText,
  findOverlapping,
  findDuplicates,
} from './query.ts'

// Convert
export type {
  FormatId,
  FormatOutputMap,
  FormatOptionsMap,
  FormatParseOptionsMap,
  ConvertOptions,
  ConvertResult,
  TranscodeOptions,
  TranscodeResult,
  LostFeature
} from './convert.ts'
export { convert, transcode } from './convert.ts'
