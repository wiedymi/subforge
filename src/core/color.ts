export function rgba(r: number, g: number, b: number, a = 0): number {
  return (((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)) >>> 0
}

export function fromRGBA(color: number): { r: number; g: number; b: number; a: number } {
  return {
    r: color & 0xFF,
    g: (color >> 8) & 0xFF,
    b: (color >> 16) & 0xFF,
    a: (color >> 24) & 0xFF
  }
}

export function withAlpha(color: number, alpha: number): number {
  return ((color & 0x00FFFFFF) | ((alpha & 0xFF) << 24)) >>> 0
}

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

export function lighten(color: number, amount: number): number {
  return blend(color, Colors.white, amount)
}

export function darken(color: number, amount: number): number {
  return blend(color, Colors.black, amount)
}

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
