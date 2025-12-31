/**
 * TTML (Timed Text Markup Language) format support
 *
 * This module provides parsing and serialization for TTML and its profiles:
 * - TTML: W3C standard for timed text
 * - DFXP: Distribution Format Exchange Profile
 * - SMPTE-TT: SMPTE Timed Text for broadcast
 *
 * @module ttml
 */

export { parseTTML } from './parser.ts'
export { toTTML, type TTMLSerializeOptions } from './serializer.ts'
export { parseTime, formatTime, parseDuration } from './time.ts'
export { parseDFXP, toDFXP } from './dfxp.ts'
export { parseSMPTETT, toSMPTETT } from './smpte.ts'
