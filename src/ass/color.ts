export function parseColor(s: string): number {
  const match = s.match(/^&[Hh]([0-9A-Fa-f]{6,8})&?$/)
  if (!match) throw new Error(`Invalid ASS color: ${s}`)

  const hex = match[1]!.padStart(8, '0')
  return parseInt(hex, 16)
}

export function formatColor(color: number): string {
  return `&H${(color >>> 0).toString(16).toUpperCase().padStart(8, '0')}&`
}

export function parseAlpha(s: string): number {
  const match = s.match(/^&H([0-9A-Fa-f]{2})&?$/)
  if (!match) throw new Error(`Invalid ASS alpha: ${s}`)
  return parseInt(match[1]!, 16)
}

export function formatAlpha(alpha: number): string {
  return `&H${(alpha & 0xFF).toString(16).toUpperCase().padStart(2, '0')}&`
}
