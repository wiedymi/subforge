/**
 * SSA (SubStation Alpha) v4 subtitle format support.
 *
 * This module provides parsing and serialization for SSA v4 subtitle files,
 * the predecessor format to ASS. SSA v4 has simplified styling and different
 * alignment values compared to ASS, but both formats are compatible through
 * automatic conversion.
 *
 * @module ssa
 */

export { parseSSA } from './parser.ts'
export { toSSA } from './serializer.ts'
