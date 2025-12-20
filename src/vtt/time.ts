export function parseTime(s: string): number {
  const len = s.length
  // HH:MM:SS.mmm (12 chars) or MM:SS.mmm (9 chars)
  // VTT uses dot (.) not comma (,) before milliseconds
  // Use direct charCode math instead of parseInt/slice
  if (len === 12 && s.charCodeAt(8) === 46) { // 46 = '.'
    const h = (s.charCodeAt(0) - 48) * 10 + (s.charCodeAt(1) - 48)
    const m = (s.charCodeAt(3) - 48) * 10 + (s.charCodeAt(4) - 48)
    const ss = (s.charCodeAt(6) - 48) * 10 + (s.charCodeAt(7) - 48)
    const ms = (s.charCodeAt(9) - 48) * 100 + (s.charCodeAt(10) - 48) * 10 + (s.charCodeAt(11) - 48)
    return h * 3600000 + m * 60000 + ss * 1000 + ms
  }
  if (len === 9 && s.charCodeAt(5) === 46) { // 46 = '.'
    const m = (s.charCodeAt(0) - 48) * 10 + (s.charCodeAt(1) - 48)
    const ss = (s.charCodeAt(3) - 48) * 10 + (s.charCodeAt(4) - 48)
    const ms = (s.charCodeAt(6) - 48) * 100 + (s.charCodeAt(7) - 48) * 10 + (s.charCodeAt(8) - 48)
    return m * 60000 + ss * 1000 + ms
  }
  throw new Error(`Invalid VTT timestamp: ${s}`)
}

export function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
}
