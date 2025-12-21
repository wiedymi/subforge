/**
 * MicroDVD subtitle format parser and serializer.
 *
 * MicroDVD is a frame-based subtitle format that uses curly braces for timing.
 * Popular for its support of inline formatting tags.
 *
 * Format: {startFrame}{endFrame}Text with {y:b}formatting
 *
 * Features:
 * - Frame-based timing (requires FPS)
 * - Inline formatting: bold, italic, underline, strikeout
 * - Color support (BGR format)
 * - Font name and size
 * - Line breaks using pipe (|) character
 *
 * @module microdvd
 */

export { parseTags, serializeTags, stripTags } from './tags.ts'
export { parseMicroDVD, parseMicroDVDResult } from './parser.ts'
export { toMicroDVD } from './serializer.ts'
