import type { SubtitleEvent } from './types.ts'

export function findByStyle(events: SubtitleEvent[], style: string): SubtitleEvent[] {
  return events.filter(e => e.style === style)
}

export function findByActor(events: SubtitleEvent[], actor: string): SubtitleEvent[] {
  return events.filter(e => e.actor === actor)
}

export function findByLayer(events: SubtitleEvent[], layer: number): SubtitleEvent[] {
  return events.filter(e => e.layer === layer)
}

export function findByText(
  events: SubtitleEvent[],
  query: string | RegExp
): SubtitleEvent[] {
  if (typeof query === 'string') {
    const lower = query.toLowerCase()
    return events.filter(e => e.text.toLowerCase().includes(lower))
  }
  return events.filter(e => query.test(e.text))
}

export function findOverlapping(events: SubtitleEvent[]): Array<[SubtitleEvent, SubtitleEvent]> {
  const overlaps: Array<[SubtitleEvent, SubtitleEvent]> = []
  const len = events.length
  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      if (events[i]!.start < events[j]!.end && events[j]!.start < events[i]!.end) {
        overlaps[overlaps.length] = [events[i]!, events[j]!]
      }
    }
  }
  return overlaps
}

export function findDuplicates(events: SubtitleEvent[]): SubtitleEvent[][] {
  const groups = new Map<string, SubtitleEvent[]>()
  const len = events.length
  for (let i = 0; i < len; i++) {
    const e = events[i]!
    const key = e.start + '-' + e.end + '-' + e.text
    const group = groups.get(key) ?? []
    group[group.length] = e
    groups.set(key, group)
  }
  return [...groups.values()].filter(g => g.length > 1)
}
