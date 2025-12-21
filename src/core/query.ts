import type { SubtitleEvent } from './types.ts'

/**
 * Finds all events using a specific style.
 * @param events - Array of subtitle events
 * @param style - Style name to match
 * @returns Events with matching style
 * @example
 * ```ts
 * const defaults = findByStyle(events, 'Default')
 * ```
 */
export function findByStyle(events: SubtitleEvent[], style: string): SubtitleEvent[] {
  return events.filter(e => e.style === style)
}

/**
 * Finds all events for a specific actor/character.
 * @param events - Array of subtitle events
 * @param actor - Actor name to match
 * @returns Events with matching actor
 * @example
 * ```ts
 * const johnLines = findByActor(events, 'John')
 * ```
 */
export function findByActor(events: SubtitleEvent[], actor: string): SubtitleEvent[] {
  return events.filter(e => e.actor === actor)
}

/**
 * Finds all events on a specific layer.
 * @param events - Array of subtitle events
 * @param layer - Layer number to match
 * @returns Events on matching layer
 * @example
 * ```ts
 * const signEvents = findByLayer(events, 1)
 * ```
 */
export function findByLayer(events: SubtitleEvent[], layer: number): SubtitleEvent[] {
  return events.filter(e => e.layer === layer)
}

/**
 * Finds events containing specific text.
 * Case-insensitive for string queries.
 * @param events - Array of subtitle events
 * @param query - Text to search for (string or RegExp)
 * @returns Events with matching text
 * @example
 * ```ts
 * findByText(events, 'hello') // Case-insensitive search
 * findByText(events, /\bword\b/i) // Regex search
 * ```
 */
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

/**
 * Finds all pairs of overlapping events.
 * Useful for detecting timing conflicts.
 * @param events - Array of subtitle events
 * @returns Array of overlapping event pairs
 * @example
 * ```ts
 * const overlaps = findOverlapping(events)
 * overlaps.forEach(([e1, e2]) => {
 *   console.log(`Events ${e1.id} and ${e2.id} overlap`)
 * })
 * ```
 */
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

/**
 * Finds groups of duplicate events.
 * Events are considered duplicates if they have identical timing and text.
 * @param events - Array of subtitle events
 * @returns Array of duplicate groups (each group has 2+ events)
 * @example
 * ```ts
 * const dupes = findDuplicates(events)
 * dupes.forEach(group => {
 *   console.log(`Found ${group.length} duplicates:`, group[0].text)
 * })
 * ```
 */
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
