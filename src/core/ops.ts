import type { SubtitleEvent, TextSegment, KaraokeEffect } from './types.ts'
import { generateId } from './document.ts'

// === Timing ===

export function shiftEvents(events: SubtitleEvent[], ms: number): void {
  const len = events.length
  for (let i = 0; i < len; i++) {
    events[i]!.start += ms
    events[i]!.end += ms
  }
}

export function scaleEvents(events: SubtitleEvent[], factor: number, pivot = 0): void {
  const len = events.length
  for (let i = 0; i < len; i++) {
    const e = events[i]!
    e.start = pivot + (e.start - pivot) * factor
    e.end = pivot + (e.end - pivot) * factor
  }
}

// === Sorting ===

export function sortByTime(events: SubtitleEvent[]): void {
  events.sort((a, b) => a.start - b.start || a.end - b.end)
}

export function sortByLayer(events: SubtitleEvent[]): void {
  events.sort((a, b) => a.layer - b.layer || a.start - b.start)
}

// === Filtering ===

export function getEventsAt(events: SubtitleEvent[], time: number): SubtitleEvent[] {
  return events.filter(e => e.start <= time && e.end >= time)
}

export function getEventsBetween(
  events: SubtitleEvent[],
  start: number,
  end: number
): SubtitleEvent[] {
  return events.filter(e => e.end >= start && e.start <= end)
}

// === Text Operations ===

export function searchReplace(
  events: SubtitleEvent[],
  search: string | RegExp,
  replace: string
): number {
  let count = 0
  const len = events.length
  for (let i = 0; i < len; i++) {
    const e = events[i]!
    const newText = e.text.replace(search, () => { count++; return replace })
    if (newText !== e.text) {
      e.text = newText
      e.dirty = true
    }
  }
  return count
}

export function changeStyle(
  events: SubtitleEvent[],
  from: string,
  to: string
): number {
  let count = 0
  const len = events.length
  for (let i = 0; i < len; i++) {
    const e = events[i]!
    if (e.style === from) {
      e.style = to
      count++
    }
  }
  return count
}

// === Karaoke ===

export function getKaraoke(segment: TextSegment): KaraokeEffect | null {
  return segment.effects.find(e => e.type === 'karaoke') as KaraokeEffect | null
}

export function getKaraokeOffset(segments: TextSegment[], index: number): number {
  let offset = 0
  for (let i = 0; i < index; i++) {
    const k = getKaraoke(segments[i]!)
    if (k) offset += k.params.duration
  }
  return offset
}

export function scaleKaraoke(segments: TextSegment[], factor: number): void {
  const len = segments.length
  for (let i = 0; i < len; i++) {
    const k = getKaraoke(segments[i]!)
    if (k) k.params.duration *= factor
  }
}

export function retimeKaraoke(segments: TextSegment[], durations: number[]): void {
  let durIdx = 0
  const segLen = segments.length
  const durLen = durations.length
  for (let i = 0; i < segLen; i++) {
    const k = getKaraoke(segments[i]!)
    if (k && durIdx < durLen) {
      k.params.duration = durations[durIdx++]!
    }
  }
}

export function explodeKaraoke(event: SubtitleEvent): SubtitleEvent[] {
  const karaokeSegments = event.segments.filter(s => getKaraoke(s))
  if (karaokeSegments.length === 0) return [event]

  let offset = 0
  return karaokeSegments.map(seg => {
    const k = getKaraoke(seg)!
    const start = event.start + offset
    const end = start + k.params.duration
    offset += k.params.duration

    return {
      ...event,
      id: generateId(),
      start,
      end,
      text: seg.text,
      segments: [{ ...seg, effects: seg.effects.filter(e => e.type !== 'karaoke') }],
      dirty: true
    }
  })
}

export function getActiveKaraokeSegment(
  segments: TextSegment[],
  timeFromStart: number
): TextSegment | null {
  let offset = 0
  const len = segments.length
  for (let i = 0; i < len; i++) {
    const seg = segments[i]!
    const k = getKaraoke(seg)
    if (!k) continue
    if (timeFromStart >= offset && timeFromStart < offset + k.params.duration) {
      return seg
    }
    offset += k.params.duration
  }
  return null
}

export function getKaraokeProgress(segments: TextSegment[], timeFromStart: number): number {
  let total = 0
  const len = segments.length
  for (let i = 0; i < len; i++) {
    const k = getKaraoke(segments[i]!)
    if (k) total += k.params.duration
  }
  if (total === 0) return 0
  return Math.min(1, Math.max(0, timeFromStart / total))
}
