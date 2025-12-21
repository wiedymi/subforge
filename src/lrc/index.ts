/**
 * LRC (Lyric) subtitle format parser and serializer.
 *
 * LRC is a text-based format for storing song lyrics with timestamps.
 * Format: [MM:SS.xx]Lyric text
 *
 * Features:
 * - Simple LRC: Line-level timing
 * - Enhanced LRC: Word-level timing with <MM:SS.xx>word syntax
 * - Metadata tags: [ti:], [ar:], [al:], [au:], [offset:], etc.
 *
 * @module lrc
 */

export { parseTime, formatTime } from './time.ts'
export { parseLRC, parseLRCResult } from './parser.ts'
export { toLRC } from './serializer.ts'
