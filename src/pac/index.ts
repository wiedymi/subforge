/**
 * PAC (Screen Electronics/Cavena) binary subtitle format support.
 *
 * PAC is a binary subtitle format developed by Screen Electronics (later Cavena Systems),
 * primarily used for DVD subtitles in European markets. The format features:
 * - 24-byte binary header with format code and display standard
 * - BCD-encoded timecodes for frame-accurate timing
 * - Support for PAL (25fps) and NTSC (29.97fps) standards
 * - Control codes for text styling (italic, underline, colors)
 * - Latin-1 character encoding with special character escapes
 *
 * @module pac
 */

export { parsePAC, parsePACResult } from './parser.ts'
export { toPAC } from './serializer.ts'
