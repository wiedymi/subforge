/**
 * ASS (Advanced SubStation Alpha) subtitle format support.
 *
 * This module provides complete parsing and serialization for ASS/SSA subtitle files,
 * including advanced features like override tags, styles, karaoke effects, and animations.
 *
 * @module ass
 */

export { parseTime, formatTime } from './time.ts'
export { parseColor, formatColor, parseAlpha, formatAlpha } from './color.ts'
export { parseTags, serializeTags, stripTags } from './tags.ts'
export { parseASS, parseASSResult } from './parser.ts'
export { toASS } from './serializer.ts'
