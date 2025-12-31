/**
 * QuickTime Text subtitle format support
 *
 * QuickTime Text (.qt, .txt) is a simple text-based subtitle format used by Apple QuickTime Player.
 * It supports basic text formatting through directives enclosed in curly braces and uses timestamps
 * in square brackets.
 *
 * @module qt
 */

export { parseQT } from './parser.ts'
export { toQT } from './serializer.ts'
export type { QTSerializeOptions } from './serializer.ts'
