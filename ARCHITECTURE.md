# Subforge Architecture

High-performance TypeScript subtitle library. ASS-first format, others degrade gracefully.

## Philosophy

- **ASS is the superset** - Our internal format covers full ASS capabilities
- **Other formats degrade** - SRT/VTT map to subset of features
- **Conversion loses features** - Be explicit about what's lost
- **Speed and memory matter** - Designed for 100k events
- **Start simple, optimize when proven** - No premature optimization
- **Core is universal** - Core works with numbers, formats handle strings

## Package Structure

Single package with multiple entry points, bundled with Bun to a universal ESM `dist/`:

```
subforge/
├── package.json
├── src/
│   ├── core/                 # Shared types, operations
│   ├── formats/
│   │   ├── text/             # ASS/SSA/SRT/VTT/SBV/LRC/MicroDVD
│   │   ├── xml/              # TTML/DFXP/SAMI/RealText/QT
│   │   ├── binary/           # STL/PGS/DVB/VobSub/PAC
│   │   └── broadcast/        # SCC/CAP/Teletext
│   └── index.ts              # Full bundle
└── dist/                      # Built output (ESM)
```

### Exports

```json
{
  "name": "subforge",
  "sideEffects": false,
  "exports": {
    ".": { "types": "./src/index.ts", "default": "./dist/index.js" },
    "./core": { "types": "./src/core/index.ts", "default": "./dist/core/index.js" },
    "./ass": { "types": "./src/formats/text/ass/index.ts", "default": "./dist/formats/text/ass/index.js" }
  }
}
```

### Usage

```ts
// Full bundle
import { parseASS, parseSRT, toASS, toSRT } from 'subforge'

// Minimal - only what you need
import { SubtitleDocument } from 'subforge/core'
import { parseASS, toASS } from 'subforge/ass'
```

## Directory Structure

```
src/
├── core/
│   ├── index.ts           # Public exports
│   ├── types.ts           # All interfaces
│   ├── document.ts        # SubtitleDocument helpers
│   ├── effects.ts         # Effect registry
│   ├── errors.ts          # Error types
│   ├── ops.ts             # Operations (timing, filter, karaoke)
│   ├── query.ts           # Search/query utilities
│   ├── convert.ts         # Format conversion
│   ├── color.ts           # Universal color utilities (ABGR numbers)
│   └── time.ts            # Universal time utilities (milliseconds)
├── formats/
│   ├── text/
│   │   ├── ass/            # ASS format (full-featured reference)
│   │   ├── ssa/            # SSA format
│   │   ├── srt/            # SubRip
│   │   ├── vtt/            # WebVTT
│   │   ├── sbv/            # YouTube SBV
│   │   ├── lrc/            # LRC
│   │   └── microdvd/       # MicroDVD
│   ├── xml/
│   │   ├── ttml/           # TTML/DFXP/SMPTE-TT
│   │   ├── sami/           # SAMI
│   │   ├── realtext/       # RealText
│   │   └── qt/             # QuickTime Text
│   ├── binary/
│   │   ├── stl/            # EBU-STL + Spruce STL
│   │   ├── pgs/            # PGS bitmaps
│   │   ├── dvb/            # DVB subtitles
│   │   ├── vobsub/         # VobSub (.idx/.sub)
│   │   └── pac/            # PAC (Cavena)
│   └── broadcast/
│       ├── scc/            # Scenarist Closed Caption
│       ├── cap/            # CAP
│       └── teletext/       # Teletext
└── index.ts               # Full bundle re-exports
```

## Core Principle

| Layer | Works With | Examples |
|-------|-----------|----------|
| Core | Numbers | Time: `ms`, Color: `ABGR number` |
| Format | Strings | Time: `"0:00:00.00"`, Color: `"&HAABBGGRR&"` |

Core never imports format modules. Formats import core.

## Core Types

```ts
// core/types.ts

// === Document ===

interface SubtitleDocument {
  info: ScriptInfo
  styles: Map<string, Style>
  events: SubtitleEvent[]
  comments: Comment[]

  // Embedded data (ASS-specific, preserved for roundtrip)
  fonts?: EmbeddedData[]
  graphics?: EmbeddedData[]

  // VTT-specific (preserved for roundtrip)
  regions?: VTTRegion[]
}

interface ScriptInfo {
  title?: string
  author?: string
  playResX: number          // Default: 1920
  playResY: number          // Default: 1080
  scaleBorderAndShadow: boolean
  wrapStyle: 0 | 1 | 2 | 3
}

interface Comment {
  text: string
  // Position hint for roundtrip
  beforeEventIndex?: number
}

interface EmbeddedData {
  name: string
  data: string  // UUEncoded (ASS format)
}

interface VTTRegion {
  id: string
  width: string
  lines: number
  regionAnchor: string
  viewportAnchor: string
  scroll: 'up' | 'none'
}

// === Styles ===

interface Style {
  name: string
  fontName: string
  fontSize: number
  primaryColor: number      // ABGR format
  secondaryColor: number
  outlineColor: number
  backColor: number
  bold: boolean
  italic: boolean
  underline: boolean
  strikeout: boolean
  scaleX: number
  scaleY: number
  spacing: number
  angle: number
  borderStyle: 1 | 3
  outline: number
  shadow: number
  alignment: Alignment
  marginL: number
  marginR: number
  marginV: number
  encoding: number
}

type Alignment = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// === Events ===

interface SubtitleEvent {
  id: number              // Stable unique ID
  start: number           // ms
  end: number             // ms
  layer: number
  style: string           // Reference to style name
  actor: string
  marginL: number
  marginR: number
  marginV: number
  effect: string          // ASS effect field (scroll, banner)

  // Text content
  text: string            // Raw text with tags
  segments: TextSegment[] // Parsed (lazy populated)
  image?: ImageData       // Bitmap data for image-based formats
  vobsub?: VobSubMeta      // VobSub metadata
  pgs?: PGSMeta            // PGS metadata

  // Lossless roundtrip
  dirty: boolean
}

interface ImageData {
  format: 'rle' | 'png' | 'raw' | 'indexed'
  width: number
  height: number
  x?: number
  y?: number
  data: Uint8Array
  palette?: number[]
}

interface VobSubMeta {
  forced: boolean
  originalIndex: number
}

interface PGSMeta {
  compositionNumber: number
  windowId: number
}

// === Text Segments ===

interface TextSegment {
  text: string
  style: InlineStyle | null   // null = inherit from event style
  effects: Effect[]
}

interface InlineStyle {
  fontName?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikeout?: boolean
  primaryColor?: number
  secondaryColor?: number
  outlineColor?: number
  backColor?: number
  alpha?: number
  pos?: [number, number]
  alignment?: Alignment
}

// === Effects ===

interface Effect<T extends string = string, P = unknown> {
  type: T
  params: P
}

// Known effect types
type KaraokeEffect = Effect<'karaoke', {
  duration: number
  mode: 'fill' | 'fade' | 'outline'
}>

type BlurEffect = Effect<'blur', { strength: number }>
type BorderEffect = Effect<'border', { size: number }>
type ShadowEffect = Effect<'shadow', { depth: number }>

type ScaleEffect = Effect<'scale', { x: number; y: number }>
type RotateEffect = Effect<'rotate', { x?: number; y?: number; z?: number }>
type ShearEffect = Effect<'shear', { x?: number; y?: number }>
type SpacingEffect = Effect<'spacing', { value: number }>

type FadeEffect = Effect<'fade', { in: number; out: number }>
type FadeComplexEffect = Effect<'fadeComplex', {
  alphas: [number, number, number]
  times: [number, number, number, number]
}>

type MoveEffect = Effect<'move', {
  from: [number, number]
  to: [number, number]
  t1?: number
  t2?: number
}>

type ClipEffect = Effect<'clip', { path: string; inverse: boolean }>
type DrawingEffect = Effect<'drawing', { scale: number; commands: string }>

type AnimateEffect = Effect<'animate', {
  start: number
  end: number
  accel?: number
  target: Partial<InlineStyle> | Effect
}>

type ResetEffect = Effect<'reset', { style?: string }>

// Unknown effects preserved for lossless roundtrip
type UnknownEffect = Effect<'unknown', { format: string; raw: string }>

// All known effects
type KnownEffect =
  | KaraokeEffect
  | BlurEffect | BorderEffect | ShadowEffect
  | ScaleEffect | RotateEffect | ShearEffect | SpacingEffect
  | FadeEffect | FadeComplexEffect
  | MoveEffect | ClipEffect | DrawingEffect
  | AnimateEffect | ResetEffect
  | UnknownEffect
```

## Universal Utilities

### Time (core/time.ts)

```ts
// Core works with milliseconds only
// No format-specific parsing/formatting

export function formatDuration(ms: number): string {
  // Human readable: "1h 23m 45s"
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)

  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function clamp(ms: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, ms))
}

export function overlap(
  start1: number, end1: number,
  start2: number, end2: number
): boolean {
  return start1 < end2 && start2 < end1
}

export function duration(event: { start: number; end: number }): number {
  return event.end - event.start
}
```

### Color (core/color.ts)

```ts
// Core works with ABGR numbers (ASS-native format)
// No format-specific string parsing/formatting

export function rgba(r: number, g: number, b: number, a = 0): number {
  return ((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)
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
  return (color & 0x00FFFFFF) | ((alpha & 0xFF) << 24)
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

// Predefined colors (ABGR format)
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
```

## Format-Specific Utilities

### ASS Time (ass/time.ts)

```ts
// Parse ASS timestamp: "0:00:00.00" -> ms
export function parseTime(s: string): number {
  // Format: H:MM:SS.cc (centiseconds)
  const match = s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{2})$/)
  if (!match) throw new Error(`Invalid ASS timestamp: ${s}`)

  const [, h, m, ss, cs] = match
  return (
    parseInt(h) * 3600000 +
    parseInt(m) * 60000 +
    parseInt(ss) * 1000 +
    parseInt(cs) * 10
  )
}

// Format ms -> ASS timestamp: "0:00:00.00"
export function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)

  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}
```

### ASS Color (ass/color.ts)

```ts
// Parse ASS color: "&HAABBGGRR&" or "&HBBGGRR&" -> ABGR number
export function parseColor(s: string): number {
  const match = s.match(/^&H([0-9A-Fa-f]{6,8})&?$/)
  if (!match) throw new Error(`Invalid ASS color: ${s}`)

  const hex = match[1].padStart(8, '0')
  return parseInt(hex, 16)
}

// Format ABGR number -> ASS color: "&HAABBGGRR&"
export function formatColor(color: number): string {
  return `&H${color.toString(16).toUpperCase().padStart(8, '0')}&`
}

// Parse alpha: "&HFF&" -> number
export function parseAlpha(s: string): number {
  const match = s.match(/^&H([0-9A-Fa-f]{2})&?$/)
  if (!match) throw new Error(`Invalid ASS alpha: ${s}`)
  return parseInt(match[1], 16)
}

// Format alpha: number -> "&HFF&"
export function formatAlpha(alpha: number): string {
  return `&H${(alpha & 0xFF).toString(16).toUpperCase().padStart(2, '0')}&`
}
```

### SRT Time (srt/time.ts)

```ts
// Parse SRT timestamp: "00:00:00,000" -> ms
export function parseTime(s: string): number {
  const match = s.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/)
  if (!match) throw new Error(`Invalid SRT timestamp: ${s}`)

  const [, h, m, ss, ms] = match
  return (
    parseInt(h) * 3600000 +
    parseInt(m) * 60000 +
    parseInt(ss) * 1000 +
    parseInt(ms)
  )
}

// Format ms -> SRT timestamp: "00:00:00,000"
export function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`
}
```

### VTT Time (vtt/time.ts)

```ts
// Parse VTT timestamp: "00:00:00.000" or "00:00.000" -> ms
export function parseTime(s: string): number {
  // Full format: HH:MM:SS.mmm
  let match = s.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/)
  if (match) {
    const [, h, m, ss, ms] = match
    return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(ss) * 1000 + parseInt(ms)
  }

  // Short format: MM:SS.mmm
  match = s.match(/^(\d{2}):(\d{2})\.(\d{3})$/)
  if (match) {
    const [, m, ss, ms] = match
    return parseInt(m) * 60000 + parseInt(ss) * 1000 + parseInt(ms)
  }

  throw new Error(`Invalid VTT timestamp: ${s}`)
}

// Format ms -> VTT timestamp: "00:00:00.000"
export function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
}
```

## Effect Registry

```ts
// core/effects.ts

interface EffectHandler<E extends Effect = Effect> {
  type: E['type']
  parse(raw: string): E['params'] | null
  serialize(params: E['params']): string
}

const handlers = new Map<string, EffectHandler>()

export function registerEffect<E extends Effect>(handler: EffectHandler<E>): void {
  handlers.set(handler.type, handler)
}

export function getEffectHandler(type: string): EffectHandler | undefined {
  return handlers.get(type)
}

// Built-in effects registered on import
registerEffect({
  type: 'blur',
  parse: (raw) => ({ strength: parseFloat(raw) }),
  serialize: (p) => String(p.strength)
})

registerEffect({
  type: 'karaoke',
  parse: (raw) => {
    const match = raw.match(/^(k|kf|ko|K)(\d+)$/)
    if (!match) return null
    const mode = match[1] === 'kf' || match[1] === 'K' ? 'fade'
                : match[1] === 'ko' ? 'outline' : 'fill'
    return { duration: parseInt(match[2]) * 10, mode }
  },
  serialize: (p) => {
    const prefix = p.mode === 'fade' ? 'kf' : p.mode === 'outline' ? 'ko' : 'k'
    return `${prefix}${p.duration / 10}`
  }
})

// ... other built-in effects
```

## Error Handling

```ts
// core/errors.ts

interface ParseOptions {
  onError?: 'skip' | 'collect'
  strict?: boolean
  encoding?: 'utf-8' | 'utf-16le' | 'utf-16be' | 'shift-jis' | 'auto'
  preserveOrder?: boolean  // Default: true
}

interface ParseResult {
  ok: boolean
  document: SubtitleDocument
  errors: ParseError[]
  warnings: ParseWarning[]
}

interface ParseError {
  line: number
  column: number
  code: ErrorCode
  message: string
  raw?: string
}

interface ParseWarning {
  line: number
  message: string
}

type ErrorCode =
  | 'INVALID_TIMESTAMP'
  | 'UNCLOSED_TAG'
  | 'UNKNOWN_STYLE'
  | 'MALFORMED_EVENT'
  | 'INVALID_COLOR'
  | 'INVALID_SECTION'
  | 'MISSING_FIELD'
  | 'INVALID_ENCODING'
  | 'DUPLICATE_STYLE'
  | 'DUPLICATE_ID'

// Convenience functions
export function parseASS(input: string, opts?: ParseOptions): ParseResult
export function unwrap(result: ParseResult): SubtitleDocument

// Encoding detection
export function detectEncoding(buffer: Uint8Array): string {
  // Check BOM
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) return 'utf-8'
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) return 'utf-16le'
  if (buffer[0] === 0xFE && buffer[1] === 0xFF) return 'utf-16be'

  // Heuristics for Shift-JIS, etc.
  // Default to UTF-8
  return 'utf-8'
}
```

## Operations

```ts
// core/ops.ts

// === Timing ===

export function shiftEvents(events: SubtitleEvent[], ms: number): void {
  for (const e of events) {
    e.start += ms
    e.end += ms
  }
}

export function scaleEvents(events: SubtitleEvent[], factor: number, pivot = 0): void {
  for (const e of events) {
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
  for (const e of events) {
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
  for (const e of events) {
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
    const k = getKaraoke(segments[i])
    if (k) offset += k.params.duration
  }
  return offset
}

export function scaleKaraoke(segments: TextSegment[], factor: number): void {
  for (const seg of segments) {
    const k = getKaraoke(seg)
    if (k) k.params.duration *= factor
  }
}

export function retimeKaraoke(segments: TextSegment[], durations: number[]): void {
  let i = 0
  for (const seg of segments) {
    const k = getKaraoke(seg)
    if (k && i < durations.length) {
      k.params.duration = durations[i++]
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
  for (const seg of segments) {
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
  const total = segments.reduce((sum, s) => {
    const k = getKaraoke(s)
    return sum + (k?.params.duration ?? 0)
  }, 0)
  if (total === 0) return 0
  return Math.min(1, Math.max(0, timeFromStart / total))
}
```

## Query API

```ts
// core/query.ts

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
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (events[i].start < events[j].end && events[j].start < events[i].end) {
        overlaps.push([events[i], events[j]])
      }
    }
  }
  return overlaps
}

export function findDuplicates(events: SubtitleEvent[]): SubtitleEvent[][] {
  const groups = new Map<string, SubtitleEvent[]>()
  for (const e of events) {
    const key = `${e.start}-${e.end}-${e.text}`
    const group = groups.get(key) ?? []
    group.push(e)
    groups.set(key, group)
  }
  return [...groups.values()].filter(g => g.length > 1)
}
```

## Format Conversion

```ts
// core/convert.ts

interface ConvertOptions {
  // How to handle unsupported features
  unsupported: 'drop' | 'comment'

  // Karaoke handling
  karaoke: 'preserve' | 'explode' | 'strip'

  // Position/alignment
  positioning: 'preserve' | 'strip'

  // Report what was lost
  reportLoss?: boolean
}

interface ConvertResult {
  output: string
  lostFeatures: LostFeature[]
}

interface LostFeature {
  eventIndex: number
  feature: string
  description: string
}

export function convert(
  doc: SubtitleDocument,
  format: 'ass' | 'srt' | 'vtt',
  opts?: Partial<ConvertOptions>
): ConvertResult

// Feature support matrix
//
// | Feature      | ASS | SRT | VTT |
// |--------------|-----|-----|-----|
// | bold         | ✓   | ✓   | ✓   |
// | italic       | ✓   | ✓   | ✓   |
// | underline    | ✓   | ✓   | ✓   |
// | color        | ✓   | ✓   | ~   |
// | position     | ✓   | -   | ~   |
// | karaoke      | ✓   | -   | ~   |
// | animation    | ✓   | -   | -   |
// | drawing      | ✓   | -   | -   |
// | clip         | ✓   | -   | -   |
// | styles       | ✓   | -   | ✓   |
// | layers       | ✓   | -   | -   |
// | ruby         | -   | -   | ✓   |
// | voice        | ✓*  | -   | ✓   |
// | regions      | -   | -   | ✓   |
// | comments     | ✓   | -   | ✓   |
// | fonts        | ✓   | -   | -   |
//
// ✓ = full support, ~ = partial, - = none, * = actor field
```

## Document Helpers

```ts
// core/document.ts

let idCounter = 0
export function generateId(): string {
  return `evt_${Date.now().toString(36)}_${(idCounter++).toString(36)}`
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
    primaryColor: 0x00FFFFFF,    // White
    secondaryColor: 0x000000FF,  // Red
    outlineColor: 0x00000000,    // Black
    backColor: 0x00000000,       // Black
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
```

## Parser Design

```ts
// ass/parser.ts

class ASSLexer {
  private src: string
  private pos = 0
  private len: number
  private line = 1
  private col = 1

  constructor(src: string) {
    this.src = src
    this.len = src.length
  }

  getPosition(): { line: number; col: number } {
    return { line: this.line, col: this.col }
  }

  peek(): number { return this.src.charCodeAt(this.pos) }

  advance(): void {
    if (this.src.charCodeAt(this.pos) === 10) { this.line++; this.col = 1 }
    else { this.col++ }
    this.pos++
  }

  isEOF(): boolean { return this.pos >= this.len }

  skipWhitespace(): void {
    while (!this.isEOF()) {
      const c = this.peek()
      if (c !== 32 && c !== 9 && c !== 13) break
      this.advance()
    }
  }

  skipLine(): void {
    while (!this.isEOF() && this.peek() !== 10) this.advance()
    if (!this.isEOF()) this.advance()
  }

  readUntil(char: number): [number, number] {
    const start = this.pos
    while (!this.isEOF() && this.peek() !== char) this.advance()
    return [start, this.pos]
  }

  readLine(): [number, number] {
    const start = this.pos
    while (!this.isEOF() && this.peek() !== 10 && this.peek() !== 13) {
      this.advance()
    }
    const end = this.pos
    if (!this.isEOF() && this.peek() === 13) this.advance()
    if (!this.isEOF() && this.peek() === 10) this.advance()
    return [start, end]
  }

  slice(start: number, end: number): string {
    return this.src.slice(start, end)
  }
}

class ASSParser {
  private lexer: ASSLexer
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions

  constructor(input: string, opts: ParseOptions) {
    this.lexer = new ASSLexer(input)
    this.opts = opts
    this.doc = createDocument()
  }

  parse(): ParseResult {
    while (!this.lexer.isEOF()) {
      this.parseSection()
    }
    return { ok: this.errors.length === 0, document: this.doc, errors: this.errors, warnings: [] }
  }

  private parseSection(): void {
    // Detect [Script Info], [V4+ Styles], [Events], [Fonts], [Graphics]
  }

  private parseScriptInfo(): void { /* ... */ }
  private parseStyles(): void { /* ... */ }
  private parseEvents(): void { /* ... */ }
  private parseFonts(): void { /* ... */ }
  private parseGraphics(): void { /* ... */ }

  private parseDialogue(line: string): void {
    // Inline field extraction, no split()
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'skip') return
    this.errors.push({
      ...this.lexer.getPosition(),
      code,
      message,
      raw
    })
  }
}
```

## Tag Parsing

```ts
// ass/tags.ts

export function parseTags(raw: string): TextSegment[] {
  const segments: TextSegment[] = []
  let currentStyle: InlineStyle | null = null
  let currentEffects: Effect[] = []
  let textStart = 0
  let i = 0

  while (i < raw.length) {
    if (raw[i] === '{' && raw[i + 1] === '\\') {
      if (i > textStart) {
        segments.push({
          text: raw.slice(textStart, i),
          style: currentStyle ? { ...currentStyle } : null,
          effects: [...currentEffects]
        })
      }

      const closeIdx = raw.indexOf('}', i)
      if (closeIdx === -1) break

      const tagBlock = raw.slice(i + 1, closeIdx)
      const result = parseTagBlock(tagBlock, currentStyle, currentEffects)
      currentStyle = result.style
      currentEffects = result.effects

      i = closeIdx + 1
      textStart = i
    } else {
      i++
    }
  }

  if (textStart < raw.length) {
    segments.push({
      text: raw.slice(textStart),
      style: currentStyle ? { ...currentStyle } : null,
      effects: [...currentEffects]
    })
  }

  return segments
}

function parseTagBlock(
  block: string,
  currentStyle: InlineStyle | null,
  currentEffects: Effect[]
): { style: InlineStyle | null; effects: Effect[] } {
  // Parse \tag1\tag2\tag3...
}

export function serializeTags(segments: TextSegment[]): string {
  // Convert segments back to ASS tagged text
}

export function stripTags(raw: string): string {
  return raw.replace(/\{[^}]*\}/g, '')
}
```

## Lossless Roundtrip

```ts
interface SubtitleEvent {
  text: string              // Original raw text
  segments: TextSegment[]   // Parsed representation
  dirty: boolean            // True if segments were modified
}

class SubtitleEventImpl implements SubtitleEvent {
  id: string
  text: string
  private _segments: TextSegment[] | null = null
  dirty = false

  // ... other fields

  get segments(): TextSegment[] {
    if (!this._segments) {
      this._segments = parseTags(this.text)
    }
    return this._segments
  }

  set segments(value: TextSegment[]) {
    this._segments = value
    this.dirty = true
  }
}

function serializeEvent(event: SubtitleEvent): string {
  if (!event.dirty) return event.text
  return serializeTags(event.segments)
}
```

## Test-Driven Development

### Test Structure

```
tests/
├── core/
│   ├── ops.test.ts
│   ├── query.test.ts
│   ├── effects.test.ts
│   ├── color.test.ts
│   ├── time.test.ts
│   └── convert.test.ts
├── ass/
│   ├── parser.test.ts
│   ├── serializer.test.ts
│   ├── tags.test.ts
│   ├── time.test.ts
│   └── color.test.ts
├── srt/
│   ├── parser.test.ts
│   ├── serializer.test.ts
│   ├── tags.test.ts
│   └── time.test.ts
├── vtt/
│   ├── parser.test.ts
│   ├── serializer.test.ts
│   ├── tags.test.ts
│   └── time.test.ts
├── integration/
│   ├── roundtrip.test.ts
│   └── conversion.test.ts
├── fixtures/
│   ├── ass/
│   │   ├── simple.ass
│   │   ├── complex-tags.ass
│   │   ├── karaoke.ass
│   │   ├── embedded-fonts.ass
│   │   └── malformed.ass
│   ├── srt/
│   └── vtt/
└── bench/
    ├── parse.bench.ts
    ├── serialize.bench.ts
    └── tags.bench.ts
```

### Test Examples

```ts
import { test, expect } from 'bun:test'

// === Core Color Tests ===

test('rgba creates ABGR color', () => {
  const color = rgba(255, 0, 0, 0)  // Red
  expect(color).toBe(0x000000FF)
})

test('fromRGBA extracts components', () => {
  const { r, g, b, a } = fromRGBA(0x800000FF)
  expect(r).toBe(255)
  expect(g).toBe(0)
  expect(b).toBe(0)
  expect(a).toBe(128)
})

test('blend interpolates colors', () => {
  const white = Colors.white
  const black = Colors.black
  const gray = blend(black, white, 0.5)
  const { r, g, b } = fromRGBA(gray)
  expect(r).toBeCloseTo(128, 0)
  expect(g).toBeCloseTo(128, 0)
  expect(b).toBeCloseTo(128, 0)
})

// === ASS Time Tests ===

test('parseTime parses ASS timestamp', () => {
  expect(parseTime('0:00:01.50')).toBe(1500)
  expect(parseTime('1:23:45.67')).toBe(5025670)
})

test('formatTime formats to ASS timestamp', () => {
  expect(formatTime(1500)).toBe('0:00:01.50')
  expect(formatTime(5025670)).toBe('1:23:45.67')
})

// === ASS Color Tests ===

test('parseColor parses ASS color', () => {
  expect(parseColor('&H00FFFFFF&')).toBe(0x00FFFFFF)
  expect(parseColor('&HFFFFFF&')).toBe(0x00FFFFFF)
  expect(parseColor('&H800000FF&')).toBe(0x800000FF)
})

test('formatColor formats to ASS color', () => {
  expect(formatColor(0x00FFFFFF)).toBe('&H00FFFFFF&')
  expect(formatColor(0x800000FF)).toBe('&H800000FF&')
})

// === Parser Tests ===

test('parse simple dialogue', () => {
  const result = parseASS(`[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello world`)

  const doc = unwrap(result)
  expect(doc.events).toHaveLength(1)
  expect(doc.events[0].start).toBe(1000)
  expect(doc.events[0].end).toBe(5000)
  expect(doc.events[0].text).toBe('Hello world')
  expect(doc.events[0].id).toBeDefined()
})

test('parse comments', () => {
  const result = parseASS(`[Events]
Comment: 0,0:00:00.00,0:00:00.00,Default,,0,0,0,,This is a comment
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,Hello`)

  const doc = unwrap(result)
  expect(doc.comments).toHaveLength(1)
  expect(doc.comments[0].text).toBe('This is a comment')
})

test('parse error collected', () => {
  const result = parseASS(`[Events]
Dialogue: invalid timestamp`, { onError: 'collect' })

  expect(result.ok).toBe(false)
  expect(result.errors).toHaveLength(1)
  expect(result.errors[0].code).toBe('INVALID_TIMESTAMP')
})

// === Query Tests ===

test('findByStyle returns matching events', () => {
  const events = [
    createEvent(0, 1000, 'a', { style: 'Default' }),
    createEvent(1000, 2000, 'b', { style: 'Sign' }),
    createEvent(2000, 3000, 'c', { style: 'Default' }),
  ]
  const found = findByStyle(events, 'Sign')
  expect(found).toHaveLength(1)
  expect(found[0].text).toBe('b')
})

test('findOverlapping detects overlaps', () => {
  const events = [
    createEvent(0, 2000, 'a'),
    createEvent(1000, 3000, 'b'),
    createEvent(5000, 6000, 'c'),
  ]
  const overlaps = findOverlapping(events)
  expect(overlaps).toHaveLength(1)
  expect(overlaps[0][0].text).toBe('a')
  expect(overlaps[0][1].text).toBe('b')
})

// === Tag Tests ===

test('parse bold tag', () => {
  const segments = parseTags('{\\b1}bold{\\b0} normal')
  expect(segments).toHaveLength(2)
  expect(segments[0].text).toBe('bold')
  expect(segments[0].style?.bold).toBe(true)
})

test('parse karaoke', () => {
  const segments = parseTags('{\\k50}Hel{\\k30}lo')
  const k0 = segments[0].effects.find(e => e.type === 'karaoke')
  const k1 = segments[1].effects.find(e => e.type === 'karaoke')

  expect(k0?.params).toEqual({ duration: 500, mode: 'fill' })
  expect(k1?.params).toEqual({ duration: 300, mode: 'fill' })
})

// === Roundtrip Tests ===

test('ASS roundtrip preserves content', async () => {
  const original = await Bun.file('fixtures/ass/complex-tags.ass').text()
  const doc = unwrap(parseASS(original))
  const output = toASS(doc)
  const reparsed = unwrap(parseASS(output))

  expect(reparsed.events.length).toBe(doc.events.length)
  for (let i = 0; i < doc.events.length; i++) {
    expect(reparsed.events[i].text).toBe(doc.events[i].text)
  }
})

test('ASS roundtrip preserves comments', async () => {
  const original = await Bun.file('fixtures/ass/with-comments.ass').text()
  const doc = unwrap(parseASS(original))
  const output = toASS(doc)

  expect(output).toContain('Comment:')
})

// === Conversion Tests ===

test('ASS to SRT drops positioning', () => {
  const doc = unwrap(parseASS(`[Events]
Dialogue: 0,0:00:01.00,0:00:05.00,Default,,0,0,0,,{\\pos(100,200)}Hello`)

  const result = convert(doc, { to: 'srt', reportLoss: true })

  expect(result.lostFeatures).toContainEqual({
    eventIndex: 0,
    feature: 'positioning',
    description: '\\pos(100,200)'
  })
})
```

### Benchmark Tests

```ts
import { bench, run } from 'mitata'

const largeASS = await Bun.file('fixtures/ass/100k-events.ass').text()
const complexTags = '{\\pos(100,200)\\fad(500,0)\\c&HFF0000&\\t(0,500,\\alpha&HFF&)}text'

bench('parse 100k events', () => parseASS(largeASS))
bench('parse complex tags', () => parseTags(complexTags))
bench('serialize 100k events', () => toASS(largeParsedDoc))
bench('strip tags', () => stripTags(complexTags))
bench('color parse', () => parseColor('&H800000FF&'))
bench('color format', () => formatColor(0x800000FF))
bench('time parse', () => parseTime('1:23:45.67'))
bench('time format', () => formatTime(5025670))

run()
```

## Implementation Order

### Phase 1: Core
1. `core/types.ts` - All interfaces
2. `core/errors.ts` - Error types
3. `core/color.ts` - Universal color utilities
4. `core/time.ts` - Universal time utilities
5. `core/effects.ts` - Effect registry
6. `core/document.ts` - Create/clone helpers
7. `core/ops.ts` - Operations (timing, filter, karaoke)
8. `core/query.ts` - Search/query utilities

### Phase 2: ASS
1. `ass/time.ts` - ASS time parsing/formatting
2. `ass/color.ts` - ASS color parsing/formatting
3. `ass/parser.ts` - Lexer + parser
4. `ass/tags.ts` - Tag parsing + serialization
5. `ass/serializer.ts` - Full ASS output
6. Roundtrip tests

### Phase 3: SRT
1. `srt/time.ts` - SRT time parsing/formatting
2. `srt/parser.ts`
3. `srt/tags.ts` - HTML-like tags
4. `srt/serializer.ts`
5. Roundtrip tests

### Phase 4: VTT
1. `vtt/time.ts` - VTT time parsing/formatting
2. `vtt/parser.ts`
3. `vtt/tags.ts` - Cue tags
4. `vtt/serializer.ts`
5. Roundtrip tests

### Phase 5: Polish
1. `core/convert.ts` - Format conversion
2. Conversion tests with loss reporting
3. Performance benchmarks
4. Bundle size check

## Performance Targets

| Operation | Target | File Size |
|-----------|--------|-----------|
| Parse ASS | <50ms | 100k events |
| Parse SRT | <20ms | 100k events |
| Serialize ASS | <30ms | 100k events |
| Tag parsing | <1ms | Complex line |
| Shift all | <5ms | 100k events |
| Memory | <5MB | 100k events |

## Bundle Size Targets

| Import | Target (gzip) |
|--------|---------------|
| subforge (all) | <20kb |
| subforge/core | <5kb |
| subforge/ass | <10kb |
| subforge/srt | <3kb |
| subforge/vtt | <4kb |

## Performance Optimization Techniques

These are the key optimizations applied to achieve parsing targets. Use these patterns when writing performance-critical code.

### 1. Use `indexOf()` instead of character-by-character scanning

```ts
// SLOW: Character-by-character scanning
while (pos < len) {
  const c = src.charCodeAt(pos)
  if (c === 10) break  // newline
  pos++
}

// FAST: Native indexOf (uses SIMD internally)
const nlPos = src.indexOf('\n', pos)
pos = nlPos === -1 ? len : nlPos
```

### 2. Use `substring()` instead of `slice()`

```ts
// SLOWER
const line = src.slice(start, end)

// FASTER (~2x in benchmarks)
const line = src.substring(start, end)
```

### 3. Use `arr[arr.length] = item` instead of `push()`

```ts
// SLOWER
segments.push({ text, style, effects: [] })

// FASTER
segments[segments.length] = { text, style, effects: [] }
```

### 4. Inline hot-path functions

Function call overhead matters in tight loops. Inline critical code:

```ts
// SLOWER: Function call per event
start = parseTime(startStr)
end = parseTime(endStr)

// FASTER: Inline the parsing (~20x faster)
const o = startOffset
start = ((s.charCodeAt(o) - 48) * 10 + (s.charCodeAt(o + 1) - 48)) * 3600000 +
        ((s.charCodeAt(o + 3) - 48) * 10 + (s.charCodeAt(o + 4) - 48)) * 60000 +
        ((s.charCodeAt(o + 6) - 48) * 10 + (s.charCodeAt(o + 7) - 48)) * 1000 +
        (s.charCodeAt(o + 9) - 48) * 100 + (s.charCodeAt(o + 10) - 48) * 10 + (s.charCodeAt(o + 11) - 48)
```

### 5. Avoid intermediate substring allocations

```ts
// SLOWER: Create substring, then search
const timeLine = src.substring(start, end)
const arrowIdx = timeLine.indexOf(' --> ')

// FASTER: Search directly in source string
const arrowPos = src.indexOf(' --> ', start)
```

### 6. Inline empty-line checks instead of `trim()`

```ts
// SLOWER: Creates new string
const isEmpty = src.substring(lineStart, lineEnd).trim().length === 0

// FASTER: Inline character check
let isEmpty = true
for (let i = lineStart; i < lineEnd; i++) {
  const c = src.charCodeAt(i)
  if (c !== 32 && c !== 9) {  // not space or tab
    isEmpty = false
    break
  }
}
```

### 7. Use numeric IDs instead of string IDs

```ts
// SLOWER: String concatenation per event
function generateId(): string {
  return `evt_${Date.now().toString(36)}_${(idCounter++).toString(36)}`
}

// FASTER: Just increment a counter
let idCounter = 0
function generateId(): number {
  return ++idCounter
}
```

### 8. Pre-allocate arrays when size is known

```ts
// SLOWER: Array grows dynamically
const result: string[] = []
for (let i = 0; i < count; i++) {
  result.push(values[i])
}

// FASTER: Pre-allocate
const result: string[] = new Array(count)
for (let i = 0; i < count; i++) {
  result[i] = values[i]
}
```

### 9. Use `includes()` for simple CR check (common case optimization)

```ts
// Good for files that usually DON'T have \r (common case)
if (text.includes('\r')) {
  text = text.replace(/\r/g, '')
}
```

### 10. Fast path detection for common cases

```ts
// Check for common case first to skip slower checks
const arrowPos = src.indexOf(' --> ', pos)
const nlPos = src.indexOf('\n', pos)

// If arrow found before newline, this is definitely a cue line
if (arrowPos !== -1 && arrowPos < nlPos) {
  // Fast path: parse cue directly
  return parseCueFast(...)
}

// Slow path: check for NOTE, STYLE, REGION, etc.
const line = peekLine()
if (line.startsWith('NOTE')) { ... }
```

### Benchmark Your Changes

Always micro-benchmark before and after:

```ts
bun -e "
const ITER = 1_000_000
const str = 'test string'

// Warmup
for (let i = 0; i < 10000; i++) str.slice(0, 4)

let start = performance.now()
for (let i = 0; i < ITER; i++) str.slice(0, 4)
console.log('slice:', (performance.now() - start).toFixed(2), 'ms')

start = performance.now()
for (let i = 0; i < ITER; i++) str.substring(0, 4)
console.log('substring:', (performance.now() - start).toFixed(2), 'ms')
"
```
