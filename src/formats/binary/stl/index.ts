/**
 * STL subtitle format support
 *
 * This module provides support for two different STL formats:
 *
 * - EBU-STL (European Broadcasting Union): Binary format used in European broadcasting
 * - Spruce STL: Text-based format used by Spruce Technologies DVD authoring tools
 *
 * Despite sharing the .stl extension, these formats are completely different.
 *
 * @module stl
 */

export { parseEBUSTL } from './ebu/parser.ts'
export { toEBUSTL } from './ebu/serializer.ts'
export type { EBUSTLSerializeOptions } from './ebu/serializer.ts'
export { parseSpruceSTL } from './spruce/parser.ts'
export { toSpruceSTL } from './spruce/serializer.ts'
export type { SpruceSTLSerializeOptions } from './spruce/serializer.ts'
