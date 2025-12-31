/**
 * CAP (CaptionMAX) format support.
 *
 * CAP is a text-based subtitle format used by CaptionMAX software. It supports both PAL (25fps)
 * and NTSC (29.97fps) video standards with frame-accurate timecodes in HH:MM:SS:FF format.
 * The format includes a header section with metadata (video standard, character set) followed
 * by subtitle entries.
 *
 * @module cap
 */

export { parseTime, formatTime, videoStandardToFps, fpsToVideoStandard } from './time.ts'
export { parseCAP } from './parser.ts'
export { toCAP } from './serializer.ts'
export type { CAPSerializerOptions } from './serializer.ts'
export type { CAPTimecodeOptions } from './time.ts'
