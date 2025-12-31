/**
 * SRT (SubRip Text) format support.
 *
 * SRT is one of the most popular subtitle formats, featuring:
 * - Sequential numbering
 * - HH:MM:SS,mmm timestamp format with comma separator
 * - HTML-like formatting tags (<b>, <i>, <u>, <s>, <font color="#rrggbb">)
 * - Simple plain text structure
 *
 * @module srt
 */

export { parseTime, formatTime } from './time.ts'
export { parseTags, serializeTags, stripTags } from './tags.ts'
export { parseSRT } from './parser.ts'
export { toSRT } from './serializer.ts'
