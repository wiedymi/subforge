// SMPTE-TT (SMPTE Timed Text) support
// SMPTE-TT is a profile of TTML used in broadcast and professional video

import type { SubtitleDocument } from '../../../core/types.ts'
import type { ParseOptions, ParseResult } from '../../../core/errors.ts'
import { parseTTMLResult } from './parser.ts'
import { toTTML, type TTMLSerializeOptions } from './serializer.ts'

/**
 * Parse SMPTE-TT (SMPTE Timed Text) format subtitle file
 *
 * SMPTE-TT is a profile of TTML used in broadcast and professional video production.
 * It extends TTML with broadcast-specific features and uses timecode format.
 *
 * @param input - SMPTE-TT file content as string
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails
 *
 * @example
 * ```ts
 * const smpte = `<?xml version="1.0"?>
 * <tt xmlns="http://www.w3.org/ns/ttml">
 *   <body><div>
 *     <p begin="00:00:01:00" end="00:00:03:00">Hello world</p>
 *   </div></body>
 * </tt>`
 * const doc = parseSMPTETT(smpte)
 * ```
 */
export function parseSMPTETT(input: string): SubtitleDocument {
  const result = parseTTMLResult(input, { onError: 'throw' })
  return result.document
}

/**
 * Parse SMPTE-TT format with detailed error reporting
 *
 * @param input - SMPTE-TT file content as string
 * @param opts - Parsing options
 * @returns Parse result containing document, errors, and warnings
 */
export function parseSMPTETTResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  return parseTTMLResult(input, opts)
}

/**
 * Serialize subtitle document to SMPTE-TT format
 *
 * @param doc - Subtitle document to serialize
 * @param opts - Serialization options (format is forced to 'clock')
 * @returns SMPTE-TT formatted string
 *
 * @example
 * ```ts
 * const smpte = toSMPTETT(doc)
 * ```
 */
export function toSMPTETT(doc: SubtitleDocument, opts: TTMLSerializeOptions = {}): string {
  // SMPTE-TT uses SMPTE namespace and timecode format
  return toTTML(doc, { ...opts, format: 'clock' })
}
