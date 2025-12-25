/**
 * Subforge - Universal subtitle format parser and converter
 *
 * A high-performance subtitle library supporting 20+ formats including ASS, SSA, SRT, VTT,
 * EBU-STL, SCC, DVB, TTML, PGS, VobSub, and more. Built for speed and correctness.
 *
 * @example
 * ```ts
 * import { parseSRT, toASS } from 'subforge'
 *
 * const srt = `1
 * 00:00:05,000 --> 00:00:10,000
 * Hello, world!`
 *
 * const doc = parseSRT(srt)
 * const ass = toASS(doc)
 * ```
 *
 * @module subforge
 */

// Core exports
export * from './core/index.ts'

// =============================================================================
// Text Formats
// =============================================================================

/**
 * Advanced SubStation Alpha (ASS) subtitle format
 * Text-based format with advanced styling, animations, and karaoke effects
 */
export { parseASS, parseASSResult, toASS } from './formats/text/ass/index.ts'
export {
  parseTime as parseASSTime,
  formatTime as formatASSTime,
  parseColor as parseASSColor,
  formatColor as formatASSColor,
  parseTags as parseASSTags,
  serializeTags as serializeASSTags,
  stripTags as stripASSTags,
} from './formats/text/ass/index.ts'

/**
 * SubStation Alpha (SSA) subtitle format
 * Predecessor to ASS with basic styling support
 */
export { parseSSA, parseSSAResult, toSSA } from './formats/text/ssa/index.ts'

/**
 * SubRip (SRT) subtitle format
 * Simple text-based format with basic HTML-like tags
 */
export { parseSRT, parseSRTResult, toSRT } from './formats/text/srt/index.ts'
export {
  parseTime as parseSRTTime,
  formatTime as formatSRTTime,
  parseTags as parseSRTTags,
  serializeTags as serializeSRTTags,
  stripTags as stripSRTTags,
} from './formats/text/srt/index.ts'

/**
 * WebVTT subtitle format
 * W3C standard for HTML5 video with cue settings and styling
 */
export { parseVTT, parseVTTResult, toVTT } from './formats/text/vtt/index.ts'
export {
  parseTime as parseVTTTime,
  formatTime as formatVTTTime,
  parseTags as parseVTTTags,
  serializeTags as serializeVTTTags,
  stripTags as stripVTTTags,
} from './formats/text/vtt/index.ts'

/**
 * YouTube SBV subtitle format
 * Simple comma-separated timestamp format used by YouTube
 */
export { parseSBV, parseSBVResult, toSBV } from './formats/text/sbv/index.ts'
export {
  parseTime as parseSBVTime,
  formatTime as formatSBVTime,
} from './formats/text/sbv/index.ts'

/**
 * LRC lyric format
 * Text-based format for synchronized lyrics with metadata tags
 */
export { parseLRC, parseLRCResult, toLRC } from './formats/text/lrc/index.ts'
export {
  parseTime as parseLRCTime,
  formatTime as formatLRCTime,
} from './formats/text/lrc/index.ts'

/**
 * MicroDVD subtitle format
 * Frame-based format with text formatting tags in curly braces
 */
export { parseMicroDVD, parseMicroDVDResult, toMicroDVD } from './formats/text/microdvd/index.ts'
export {
  parseTags as parseMicroDVDTags,
  serializeTags as serializeMicroDVDTags,
  stripTags as stripMicroDVDTags,
} from './formats/text/microdvd/index.ts'

// =============================================================================
// XML Formats
// =============================================================================

/**
 * Timed Text Markup Language (TTML) format
 * XML-based W3C standard for timed text with advanced styling
 */
export { parseTTML, parseTTMLResult, toTTML } from './formats/xml/ttml/index.ts'
export {
  parseTime as parseTTMLTime,
  formatTime as formatTTMLTime,
  parseDuration as parseTTMLDuration,
} from './formats/xml/ttml/index.ts'

/**
 * DFXP format (Distribution Format Exchange Profile)
 * TTML profile for content distribution
 */
export { parseDFXP, parseDFXPResult, toDFXP } from './formats/xml/ttml/index.ts'

/**
 * SMPTE-TT format (SMPTE Timed Text)
 * TTML profile for broadcast television
 */
export { parseSMPTETT, parseSMPTETTResult, toSMPTETT } from './formats/xml/ttml/index.ts'

/**
 * SAMI subtitle format
 * Microsoft's Synchronized Accessible Media Interchange format with HTML and CSS
 */
export { parseSAMI, parseSAMIResult, toSAMI } from './formats/xml/sami/index.ts'
export { parseCSS as parseSAMICSS, generateCSS as generateSAMICSS } from './formats/xml/sami/index.ts'

/**
 * RealText subtitle format
 * XML-based format for RealPlayer streaming media
 */
export { parseRealText, parseRealTextResult, toRealText } from './formats/xml/realtext/index.ts'
export {
  parseTime as parseRealTextTime,
  formatTime as formatRealTextTime,
} from './formats/xml/realtext/index.ts'

/**
 * QuickTime Text subtitle format
 * Text-based format for Apple QuickTime Player with directive-based formatting
 */
export { parseQT, parseQTResult, toQT } from './formats/xml/qt/index.ts'
export type { QTSerializeOptions } from './formats/xml/qt/index.ts'

// =============================================================================
// Binary Formats
// =============================================================================

/**
 * EBU-STL subtitle format
 * Binary format for European broadcasting (teletext-based)
 */
export { parseEBUSTL, parseEBUSTLResult, toEBUSTL } from './formats/binary/stl/index.ts'

/**
 * Spruce STL subtitle format
 * Text-based format for Spruce Technologies DVD authoring
 */
export { parseSpruceSTL, parseSpruceSTLResult, toSpruceSTL } from './formats/binary/stl/index.ts'

/**
 * Presentation Graphic Stream (PGS) format
 * Binary bitmap-based format used in Blu-ray discs
 */
export { parsePGS, parsePGSResult, toPGS } from './formats/binary/pgs/index.ts'
export {
  SegmentType,
  type SegmentHeader,
  type PaletteSegment,
  type PaletteEntry,
  type ObjectSegment,
  type CompositionSegment,
  type CompositionObject,
  type WindowSegment,
} from './formats/binary/pgs/index.ts'

/**
 * DVB subtitle format
 * Binary bitmap-based format for Digital Video Broadcasting
 */
export { parseDVB, parseDVBResult, toDVB } from './formats/binary/dvb/index.ts'

/**
 * VobSub subtitle format
 * DVD bitmap subtitle format with separate .idx and .sub files
 */
export { parseVobSub, parseVobSubResult, toVobSub } from './formats/binary/vobsub/index.ts'
export {
  parseTime as parseVobSubTime,
  formatTime as formatVobSubTime,
  decodeRLE as decodeVobSubRLE,
  encodeRLE as encodeVobSubRLE,
} from './formats/binary/vobsub/index.ts'
export type {
  VobSubIndex,
  VobSubTrack,
  VobSubTimestamp,
  SubtitlePacket as VobSubPacket,
} from './formats/binary/vobsub/index.ts'

/**
 * PAC subtitle format
 * Binary format by Screen Electronics (Cavena) for broadcast systems
 */
export { parsePAC, parsePACResult, toPAC } from './formats/binary/pac/index.ts'

// =============================================================================
// Broadcast Formats
// =============================================================================

/**
 * Scenarist Closed Caption (SCC) format
 * CEA-608 closed caption format for broadcast television
 */
export { parseSCC, parseSCCResult, toSCC } from './formats/broadcast/scc/index.ts'
export {
  decodeCEA608,
  encodeCEA608Text,
  getControlCode,
} from './formats/broadcast/scc/index.ts'

/**
 * Cheetah CAP subtitle format
 * Text-based format for Cheetah closed caption systems
 */
export { parseCAP, parseCAPResult, toCAP } from './formats/broadcast/cap/index.ts'
export {
  parseTime as parseCAPTime,
  formatTime as formatCAPTime,
  videoStandardToFps,
  fpsToVideoStandard,
} from './formats/broadcast/cap/index.ts'
export type { CAPSerializerOptions, CAPTimecodeOptions } from './formats/broadcast/cap/index.ts'

/**
 * Teletext subtitle format
 * Binary format for analog television teletext systems
 */
export { parseTeletext, parseTeletextResult, toTeletext } from './formats/broadcast/teletext/index.ts'
