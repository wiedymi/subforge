/**
 * Creates a packed RGBA color value from components.
 * Color format: 0xAABBGGRR (alpha, blue, green, red).
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param a - Alpha component (0-255, default 0 = opaque)
 * @returns Packed 32-bit color value
 * @example
 * ```ts
 * rgba(255, 0, 0, 0) // 0x000000FF (opaque red)
 * rgba(255, 255, 255, 128) // 0x80FFFFFF (semi-transparent white)
 * ```
 */
export function rgba(r: number, g: number, b: number, a = 0): number {
  return (((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)) >>> 0
}

/**
 * Extracts RGBA components from a packed color value.
 * @param color - Packed 32-bit color value
 * @returns Object with r, g, b, a components (0-255)
 * @example
 * ```ts
 * fromRGBA(0x000000FF) // { r: 255, g: 0, b: 0, a: 0 }
 * ```
 */
export function fromRGBA(color: number): { r: number; g: number; b: number; a: number } {
  return {
    r: color & 0xFF,
    g: (color >> 8) & 0xFF,
    b: (color >> 16) & 0xFF,
    a: (color >> 24) & 0xFF
  }
}

/**
 * Creates a new color with a different alpha channel.
 * @param color - Original color value
 * @param alpha - New alpha value (0-255)
 * @returns Color with updated alpha
 * @example
 * ```ts
 * withAlpha(0x000000FF, 128) // 0x800000FF (semi-transparent red)
 * ```
 */
export function withAlpha(color: number, alpha: number): number {
  return ((color & 0x00FFFFFF) | ((alpha & 0xFF) << 24)) >>> 0
}

/**
 * Linearly interpolates between two colors.
 * @param c1 - First color
 * @param c2 - Second color
 * @param t - Interpolation factor (0-1, where 0 = c1, 1 = c2)
 * @returns Blended color
 * @example
 * ```ts
 * blend(0x000000FF, 0x0000FF00, 0.5) // Color halfway between red and green
 * ```
 */
export function blend(c1: number, c2: number, t: number): number {
  const { r: r1, g: g1, b: b1, a: a1 } = fromRGBA(c1)
  const { r: r2, g: g2, b: b2, a: a2 } = fromRGBA(c2)
  return rgba(
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
    Math.round(a1 + (a2 - a1) * t)
  )
}

/**
 * Lightens a color by blending with white.
 * @param color - Original color
 * @param amount - Lightening amount (0-1)
 * @returns Lightened color
 * @example
 * ```ts
 * lighten(0x00000080, 0.5) // Lightened gray
 * ```
 */
export function lighten(color: number, amount: number): number {
  return blend(color, Colors.white, amount)
}

/**
 * Darkens a color by blending with black.
 * @param color - Original color
 * @param amount - Darkening amount (0-1)
 * @returns Darkened color
 * @example
 * ```ts
 * darken(0x00FFFFFF, 0.3) // Darkened white (light gray)
 * ```
 */
export function darken(color: number, amount: number): number {
  return blend(color, Colors.black, amount)
}

/**
 * Predefined color constants in packed RGBA format.
 */
export const Colors = {
  white: 0x00FFFFFF,
  black: 0x00000000,
  red: 0x000000FF,
  green: 0x0000FF00,
  blue: 0x00FF0000,
  yellow: 0x0000FFFF,
  cyan: 0x00FFFF00,
  magenta: 0x00FF00FF,
  transparent: 0xFF000000,
} as const
