export function parseTime(s: string): number {
  // Fast path: parse H:MM:SS.cc or H:MM:SS.ccc using charCode math
  // Format: H:MM:SS.cc (centiseconds) or H:MM:SS.mmm (milliseconds)
  const len = s.length
  if (len < 10) throw new Error(`Invalid ASS timestamp: ${s}`)

  // Find first colon (hours are variable length)
  const colon1 = s.indexOf(':')
  if (colon1 === -1) throw new Error(`Invalid ASS timestamp: ${s}`)

  // Parse hours (variable digits before colon1)
  let h = 0
  for (let i = 0; i < colon1; i++) {
    h = h * 10 + (s.charCodeAt(i) - 48)
  }

  // After colon1, format is fixed: MM:SS.cc or MM:SS.ccc
  // colon1+1, colon1+2 = MM
  // colon1+3 = :
  // colon1+4, colon1+5 = SS
  // colon1+6 = .
  // colon1+7+ = fractional
  if (s.charCodeAt(colon1 + 6) !== 46) throw new Error(`Invalid ASS timestamp: ${s}`) // 46 = '.'
  const m = (s.charCodeAt(colon1 + 1) - 48) * 10 + (s.charCodeAt(colon1 + 2) - 48)
  const ss = (s.charCodeAt(colon1 + 4) - 48) * 10 + (s.charCodeAt(colon1 + 5) - 48)

  // Fractional: 2 digits = centiseconds (multiply by 10), 3 digits = milliseconds
  const fracStart = colon1 + 7
  const fracLen = len - fracStart
  let ms: number
  if (fracLen === 2) {
    ms = ((s.charCodeAt(fracStart) - 48) * 10 + (s.charCodeAt(fracStart + 1) - 48)) * 10
  } else {
    ms = (s.charCodeAt(fracStart) - 48) * 100 + (s.charCodeAt(fracStart + 1) - 48) * 10 + (s.charCodeAt(fracStart + 2) - 48)
  }

  return h * 3600000 + m * 60000 + ss * 1000 + ms
}

export function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)

  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}
