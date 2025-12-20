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
export { SubforgeError, detectEncoding } from './errors.ts'

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
export type { ConvertOptions, ConvertResult, LostFeature } from './convert.ts'
export { convert } from './convert.ts'
