import type { SubtitleEvent, TextSegment, KaraokeEffect } from './types.ts'
import { generateId } from './document.ts'

// === Timing ===

/**
 * Shifts all events by a fixed time offset.
 * Modifies events in place.
 * @param events - Array of subtitle events to shift
 * @param ms - Time offset in milliseconds (can be negative)
 * @example
 * ```ts
 * shiftEvents(events, 5000) // Shift all events 5 seconds later
 * shiftEvents(events, -2000) // Shift all events 2 seconds earlier
 * ```
 */
export function shiftEvents(events: SubtitleEvent[], ms: number): void {
  const len = events.length
  for (let i = 0; i < len; i++) {
    events[i]!.start += ms
    events[i]!.end += ms
  }
}

/**
 * Scales event timing by a factor around a pivot point.
 * Useful for fixing speed-adjusted videos. Modifies events in place.
 * @param events - Array of subtitle events to scale
 * @param factor - Scaling factor (e.g., 1.1 = 10% slower, 0.9 = 10% faster)
 * @param pivot - Pivot time in milliseconds (default 0)
 * @example
 * ```ts
 * scaleEvents(events, 1.1) // Stretch timing by 10%
 * scaleEvents(events, 0.9, 60000) // Compress timing around 1-minute mark
 * ```
 */
export function scaleEvents(events: SubtitleEvent[], factor: number, pivot = 0): void {
  const len = events.length
  for (let i = 0; i < len; i++) {
    const e = events[i]!
    e.start = pivot + (e.start - pivot) * factor
    e.end = pivot + (e.end - pivot) * factor
  }
}

// === Sorting ===

/**
 * Sorts events by start time, then end time.
 * Modifies array in place.
 * @param events - Array of subtitle events to sort
 */
export function sortByTime(events: SubtitleEvent[]): void {
  events.sort((a, b) => a.start - b.start || a.end - b.end)
}

/**
 * Sorts events by layer, then start time.
 * Modifies array in place.
 * @param events - Array of subtitle events to sort
 */
export function sortByLayer(events: SubtitleEvent[]): void {
  events.sort((a, b) => a.layer - b.layer || a.start - b.start)
}

// === Filtering ===

/**
 * Filters events that are active at a specific time.
 * @param events - Array of subtitle events
 * @param time - Time point in milliseconds
 * @returns Events visible at the given time
 * @example
 * ```ts
 * getEventsAt(events, 30000) // Events visible at 30 seconds
 * ```
 */
export function getEventsAt(events: SubtitleEvent[], time: number): SubtitleEvent[] {
  return events.filter(e => e.start <= time && e.end >= time)
}

/**
 * Filters events that overlap with a time range.
 * @param events - Array of subtitle events
 * @param start - Range start time in milliseconds
 * @param end - Range end time in milliseconds
 * @returns Events that appear during the time range
 * @example
 * ```ts
 * getEventsBetween(events, 10000, 60000) // Events between 10s and 60s
 * ```
 */
export function getEventsBetween(
  events: SubtitleEvent[],
  start: number,
  end: number
): SubtitleEvent[] {
  return events.filter(e => e.end >= start && e.start <= end)
}

// === Text Operations ===

/**
 * Search and replace text across all events.
 * Marks modified events as dirty.
 * @param events - Array of subtitle events
 * @param search - String or RegExp to search for
 * @param replace - Replacement string
 * @returns Number of events modified
 * @example
 * ```ts
 * searchReplace(events, /\bcolor\b/gi, 'colour') // British spelling
 * searchReplace(events, 'John', 'Jane') // Replace name
 * ```
 */
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

/**
 * Changes the style of events matching a specific style name.
 * @param events - Array of subtitle events
 * @param from - Current style name
 * @param to - New style name
 * @returns Number of events changed
 * @example
 * ```ts
 * changeStyle(events, 'OldStyle', 'NewStyle')
 * ```
 */
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

/**
 * Finds the karaoke effect in a text segment, if present.
 * @param segment - Text segment to check
 * @returns The karaoke effect, or null if not found
 */
export function getKaraoke(segment: TextSegment): KaraokeEffect | null {
  return segment.effects.find(e => e.type === 'karaoke') as KaraokeEffect | null
}

/**
 * Calculates the time offset to a karaoke segment.
 * Sums durations of all preceding karaoke segments.
 * @param segments - Array of text segments with karaoke timing
 * @param index - Index of target segment
 * @returns Cumulative time offset in milliseconds
 * @example
 * ```ts
 * getKaraokeOffset(segments, 3) // Time when 4th syllable starts
 * ```
 */
export function getKaraokeOffset(segments: TextSegment[], index: number): number {
  let offset = 0
  for (let i = 0; i < index; i++) {
    const k = getKaraoke(segments[i]!)
    if (k) offset += k.params.duration
  }
  return offset
}

/**
 * Scales karaoke timing by a factor.
 * Modifies segments in place.
 * @param segments - Array of text segments with karaoke timing
 * @param factor - Scaling factor (e.g., 1.1 = 10% slower)
 * @example
 * ```ts
 * scaleKaraoke(segments, 0.9) // Speed up karaoke by 10%
 * ```
 */
export function scaleKaraoke(segments: TextSegment[], factor: number): void {
  const len = segments.length
  for (let i = 0; i < len; i++) {
    const k = getKaraoke(segments[i]!)
    if (k) k.params.duration *= factor
  }
}

/**
 * Retimes karaoke segments with explicit durations.
 * Modifies segments in place.
 * @param segments - Array of text segments with karaoke timing
 * @param durations - New durations in milliseconds (one per karaoke segment)
 * @example
 * ```ts
 * retimeKaraoke(segments, [500, 300, 400, 600])
 * ```
 */
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

/**
 * Splits a karaoke event into separate events per syllable.
 * Each new event has the timing and text of one syllable.
 * @param event - Karaoke event to explode
 * @returns Array of individual syllable events
 * @example
 * ```ts
 * const syllableEvents = explodeKaraoke(karaokeEvent)
 * // Creates one event per karaoke-timed segment
 * ```
 */
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

/**
 * Finds which karaoke segment is active at a given time.
 * @param segments - Array of text segments with karaoke timing
 * @param timeFromStart - Time offset from event start in milliseconds
 * @returns The active segment, or null if none
 * @example
 * ```ts
 * const active = getActiveKaraokeSegment(segments, 1500)
 * // Returns segment highlighted at 1.5s into the event
 * ```
 */
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

/**
 * Calculates karaoke progress as a normalized value.
 * @param segments - Array of text segments with karaoke timing
 * @param timeFromStart - Time offset from event start in milliseconds
 * @returns Progress value between 0 and 1
 * @example
 * ```ts
 * getKaraokeProgress(segments, 2000) // 0.5 if total duration is 4000ms
 * ```
 */
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
