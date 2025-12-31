/**
 * RealText format support
 *
 * RealText is a RealNetworks format for streaming subtitles.
 * It uses XML-like markup with window and time tags for synchronization.
 *
 * @module realtext
 */

export { parseTime, formatTime } from './time.ts'
export { parseRealText } from './parser.ts'
export { toRealText } from './serializer.ts'
