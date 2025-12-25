/**
 * SBV (SubViewer) subtitle format parser and serializer.
 *
 * SBV is a simple text-based format used by YouTube and other video platforms.
 * Format consists of timestamp pairs followed by subtitle text.
 *
 * Format: H:MM:SS.mmm,H:MM:SS.mmm
 *         Subtitle text
 *         (blank line separator)
 *
 * @module sbv
 */

export { parseTime, formatTime } from './time.ts'
export { parseSBV, parseSBVResult } from './parser.ts'
export { toSBV } from './serializer.ts'
