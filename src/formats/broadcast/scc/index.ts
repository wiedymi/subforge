/**
 * SCC (Scenarist Closed Caption) format support.
 *
 * SCC is a format developed by Scenarist for closed captioning, widely used in North American
 * broadcast and video production. It encodes CEA-608 closed caption data with SMPTE timecodes
 * at 29.97 fps (drop-frame format).
 *
 * @module scc
 */

export { parseSCC } from './parser.ts'
export { toSCC } from './serializer.ts'
export { decodeCEA608, encodeCEA608Text, getControlCode } from './cea608.ts'
