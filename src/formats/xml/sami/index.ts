/**
 * SAMI (Synchronized Accessible Media Interchange) format support
 *
 * SAMI is a Microsoft format for closed captions that uses HTML-like markup
 * with CSS styling and SYNC tags for timing.
 *
 * @module sami
 */

export { parseSAMI } from './parser.ts'
export { toSAMI } from './serializer.ts'
export { parseCSS, generateCSS, type SAMIClass } from './css.ts'
