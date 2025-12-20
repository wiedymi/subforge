import type { SubtitleDocument, SubtitleEvent, Style, TextSegment, InlineStyle } from './types.ts'

let idCounter = 0

// Shared empty array for events without segments (avoids allocation per event)
// Cast to mutable to satisfy type checker, but treat as immutable
export const EMPTY_SEGMENTS: TextSegment[] = []

export function generateId(): number {
  return ++idCounter
}

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

export function cloneDocument(doc: SubtitleDocument): SubtitleDocument {
  return {
    info: { ...doc.info },
    styles: new Map(doc.styles),
    events: doc.events.map(e => ({ ...e, segments: [...e.segments] })),
    comments: [...doc.comments],
    fonts: doc.fonts ? [...doc.fonts] : undefined,
    graphics: doc.graphics ? [...doc.graphics] : undefined,
    regions: doc.regions ? [...doc.regions] : undefined,
  }
}

export function cloneEvent(event: SubtitleEvent): SubtitleEvent {
  return {
    ...event,
    id: generateId(),
    segments: event.segments.map(s => ({ ...s, effects: [...s.effects] }))
  }
}
