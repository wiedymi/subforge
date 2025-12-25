/**
 * Parses an ASS color string into a 32-bit ABGR integer.
 *
 * ASS colors use the format &HAABBGGRR& or &HBBGGRR& where AA is alpha (optional),
 * BB is blue, GG is green, and RR is red. This is the reverse of typical RGB ordering.
 *
 * @param s - The ASS color string to parse (e.g., "&H00FFFFFF&" or "&HFFFFFF&")
 * @returns A 32-bit integer representing the color in ABGR format
 * @throws {Error} If the color format is invalid
 *
 * @example
 * ```ts
 * parseColor("&H00FFFFFF&") // White with full opacity
 * parseColor("&HFF0000&") // Red
 * parseColor("&H00FF00&") // Green
 * ```
 */
export function parseColor(s: string): number {
  const match = s.match(/^&[Hh]([0-9A-Fa-f]{6,8})&?$/)
  if (!match) throw new Error(`Invalid ASS color: ${s}`)

  const hex = match[1]!.padStart(8, '0')
  return parseInt(hex, 16)
}

/**
 * Formats a 32-bit ABGR color integer to an ASS color string.
 *
 * Converts a color value to the ASS format &HAABBGGRR& where AA is alpha,
 * BB is blue, GG is green, and RR is red.
 *
 * @param color - The color value as a 32-bit ABGR integer
 * @returns The formatted ASS color string (e.g., "&H00FFFFFF&")
 *
 * @example
 * ```ts
 * formatColor(0x00FFFFFF) // Returns "&H00FFFFFF&" (white)
 * formatColor(0x000000FF) // Returns "&H000000FF&" (red)
 * ```
 */
export function formatColor(color: number): string {
  return `&H${(color >>> 0).toString(16).toUpperCase().padStart(8, '0')}&`
}

/**
 * Parses an ASS alpha (transparency) value from a string.
 *
 * ASS alpha values use the format &HAA& where AA is a hexadecimal value
 * from 00 (fully opaque) to FF (fully transparent).
 *
 * @param s - The ASS alpha string to parse (e.g., "&H00&" or "&HFF&")
 * @returns The alpha value as an integer (0-255)
 * @throws {Error} If the alpha format is invalid
 *
 * @example
 * ```ts
 * parseAlpha("&H00&") // Returns 0 (fully opaque)
 * parseAlpha("&HFF&") // Returns 255 (fully transparent)
 * parseAlpha("&H80&") // Returns 128 (50% transparent)
 * ```
 */
export function parseAlpha(s: string): number {
  const match = s.match(/^&H([0-9A-Fa-f]{2})&?$/)
  if (!match) throw new Error(`Invalid ASS alpha: ${s}`)
  return parseInt(match[1]!, 16)
}

/**
 * Formats an alpha value to an ASS alpha string.
 *
 * Converts an alpha value (0-255) to the ASS format &HAA& where
 * 00 is fully opaque and FF is fully transparent.
 *
 * @param alpha - The alpha value (0-255)
 * @returns The formatted ASS alpha string (e.g., "&H00&")
 *
 * @example
 * ```ts
 * formatAlpha(0) // Returns "&H00&" (fully opaque)
 * formatAlpha(255) // Returns "&HFF&" (fully transparent)
 * formatAlpha(128) // Returns "&H80&" (50% transparent)
 * ```
 */
export function formatAlpha(alpha: number): string {
  return `&H${(alpha & 0xFF).toString(16).toUpperCase().padStart(2, '0')}&`
}
