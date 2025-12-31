// DFXP (Distribution Format Exchange Profile) support
// DFXP is a profile of TTML used for content distribution

import type { SubtitleDocument } from '../../../core/types.ts'
import type { ParseResult } from '../../../core/errors.ts'
import { parseTTML } from './parser.ts'
import { toTTML, type TTMLSerializeOptions } from './serializer.ts'

/**
 * Parse DFXP (Distribution Format Exchange Profile) format subtitle file
 *
 * DFXP is a profile of TTML used for content distribution.
 * It uses the same structure as TTML with some specific constraints.
 *
 * @param input - DFXP file content as string
 * @returns ParseResult containing the document and any errors/warnings
 *
 * @example
 * ```ts
 * const dfxp = `<?xml version="1.0"?>
 * <tt xmlns="http://www.w3.org/ns/ttml">
 *   <body><div>
 *     <p begin="00:00:01.000" end="00:00:03.000">Hello world</p>
 *   </div></body>
 * </tt>`
 * const result = parseDFXP(dfxp)
 * ```
 */
export function parseDFXP(input: string): ParseResult {
  return parseTTML(input)
}

/**
 * Serialize subtitle document to DFXP format
 *
 * @param doc - Subtitle document to serialize
 * @param opts - Serialization options
 * @returns DFXP formatted string
 *
 * @example
 * ```ts
 * const dfxp = toDFXP(doc, { format: 'clock' })
 * ```
 */
export function toDFXP(doc: SubtitleDocument, opts: TTMLSerializeOptions = {}): string {
  // DFXP uses same structure as TTML, just with DFXP namespace
  return toTTML(doc, opts)
}
