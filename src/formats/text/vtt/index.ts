/**
 * WebVTT (Web Video Text Tracks) format support.
 *
 * WebVTT is a modern subtitle format designed for HTML5 video, featuring:
 * - WEBVTT header requirement
 * - HH:MM:SS.mmm or MM:SS.mmm timestamp format with dot separator
 * - REGION blocks for positioning and scrolling
 * - STYLE blocks for CSS styling
 * - NOTE blocks for comments
 * - Rich formatting tags (<b>, <i>, <u>, <v>, <c>, <lang>)
 * - Cue identifiers and settings
 *
 * @module vtt
 */

export { parseTime, formatTime } from './time.ts'
export { parseTags, serializeTags, stripTags } from './tags.ts'
export { parseVTT, parseVTTResult } from './parser.ts'
export { toVTT } from './serializer.ts'
