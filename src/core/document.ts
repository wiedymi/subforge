import type { SubtitleDocument, SubtitleEvent, Style, TextSegment, InlineStyle } from './types.ts'

let idCounter = 0

/**
 * Shared empty array for events without segments.
 * Avoids allocation per event.
 */
export const EMPTY_SEGMENTS: TextSegment[] = []

/**
 * Generates a unique sequential ID for events.
 * @returns New unique ID
 */
export function generateId(): number {
  return ++idCounter
}

/**
 * Reserve a contiguous range of IDs and return the starting ID.
 * Useful for fast-path bulk event creation.
 */
export function reserveIds(count: number): number {
  const start = idCounter + 1
  idCounter += count
  return start
}

/**
 * Creates a new subtitle document with default values.
 * @param init - Optional partial document to override defaults
 * @returns New subtitle document
 * @example
 * ```ts
 * const doc = createDocument({
 *   info: { title: 'My Subtitles' }
 * })
 * ```
 */
export function createDocument(init?: Partial<SubtitleDocument>): SubtitleDocument {
  return {
    info: {
      title: '',
      playResX: 1920,
      playResY: 1080,
      scaleBorderAndShadow: true,
      wrapStyle: 0,
      ...init?.info
    },
    styles: init?.styles ?? new Map([['Default', createDefaultStyle()]]),
    events: init?.events ?? [],
    comments: init?.comments ?? [],
    fonts: init?.fonts,
    graphics: init?.graphics,
    regions: init?.regions,
  }
}

/**
 * Creates a default style with standard settings.
 * @returns Default style object
 * @example
 * ```ts
 * const style = createDefaultStyle()
 * style.fontSize = 60 // Customize as needed
 * ```
 */
export function createDefaultStyle(): Style {
  return {
    name: 'Default',
    fontName: 'Arial',
    fontSize: 48,
    primaryColor: 0x00FFFFFF,
    secondaryColor: 0x000000FF,
    outlineColor: 0x00000000,
    backColor: 0x00000000,
    bold: false,
    italic: false,
    underline: false,
    strikeout: false,
    scaleX: 100,
    scaleY: 100,
    spacing: 0,
    angle: 0,
    borderStyle: 1,
    outline: 2,
    shadow: 2,
    alignment: 2,
    marginL: 10,
    marginR: 10,
    marginV: 10,
    encoding: 1
  }
}

/**
 * Creates a new subtitle event with timing and text.
 * @param start - Start time in milliseconds
 * @param end - End time in milliseconds
 * @param text - Subtitle text content
 * @param opts - Optional properties to override defaults
 * @returns New subtitle event
 * @example
 * ```ts
 * const event = createEvent(1000, 3000, 'Hello, world!', {
 *   style: 'Title',
 *   layer: 1
 * })
 * ```
 */
export function createEvent(
  start: number,
  end: number,
  text: string,
  opts?: Partial<SubtitleEvent>
): SubtitleEvent {
  return {
    id: generateId(),
    start,
    end,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text,
    segments: [],
    dirty: false,
    ...opts
  }
}

/**
 * Creates a karaoke event with syllable timing.
 * @param start - Event start time in milliseconds
 * @param end - Event end time in milliseconds
 * @param syllables - Array of syllables with durations and optional styles
 * @param opts - Optional properties to override defaults
 * @returns New karaoke event with timed segments
 * @example
 * ```ts
 * const karaoke = createKaraokeEvent(0, 3000, [
 *   { text: 'Hel', duration: 500 },
 *   { text: 'lo ', duration: 300 },
 *   { text: 'world', duration: 700 }
 * ])
 * ```
 */
export function createKaraokeEvent(
  start: number,
  end: number,
  syllables: Array<{ text: string; duration: number; style?: Partial<InlineStyle> }>,
  opts?: Partial<SubtitleEvent>
): SubtitleEvent {
  const segments: TextSegment[] = syllables.map(syl => ({
    text: syl.text,
    style: syl.style ? { ...syl.style } : null,
    effects: [{ type: 'karaoke', params: { duration: syl.duration, mode: 'fill' as const } }]
  }))

  return {
    id: generateId(),
    start,
    end,
    layer: 0,
    style: 'Default',
    actor: '',
    marginL: 0,
    marginR: 0,
    marginV: 0,
    effect: '',
    text: '',
    segments,
    dirty: true,
    ...opts
  }
}

/**
 * Creates a deep clone of a subtitle document.
 * @param doc - Document to clone
 * @returns Cloned document
 * @example
 * ```ts
 * const backup = cloneDocument(originalDoc)
 * // Modify backup without affecting original
 * ```
 */
export function cloneDocument(doc: SubtitleDocument): SubtitleDocument {
  return {
    info: { ...doc.info },
    styles: new Map(doc.styles),
    events: doc.events.map(e => ({
      ...e,
      segments: [...e.segments],
      image: e.image ? { ...e.image, data: e.image.data.slice() } : undefined,
      vobsub: e.vobsub ? { ...e.vobsub } : undefined,
      pgs: e.pgs ? { ...e.pgs } : undefined,
    })),
    comments: [...doc.comments],
    fonts: doc.fonts ? [...doc.fonts] : undefined,
    graphics: doc.graphics ? [...doc.graphics] : undefined,
    regions: doc.regions ? [...doc.regions] : undefined,
  }
}

/**
 * Creates a deep clone of a subtitle event with a new ID.
 * @param event - Event to clone
 * @returns Cloned event with new unique ID
 * @example
 * ```ts
 * const duplicate = cloneEvent(originalEvent)
 * duplicate.start += 5000 // Offset the duplicate
 * ```
 */
export function cloneEvent(event: SubtitleEvent): SubtitleEvent {
  return {
    ...event,
    id: generateId(),
    segments: event.segments.map(s => ({ ...s, effects: [...s.effects] })),
    image: event.image ? { ...event.image, data: event.image.data.slice() } : undefined,
    vobsub: event.vobsub ? { ...event.vobsub } : undefined,
    pgs: event.pgs ? { ...event.pgs } : undefined,
  }
}
