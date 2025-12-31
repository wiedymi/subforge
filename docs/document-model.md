# Document Model

Subforge uses a single internal document model for all formats. This model is intentionally ASS-first and keeps richer data even when converting to simpler formats.

## Core types

### SubtitleDocument

```ts
interface SubtitleDocument {
  info: ScriptInfo
  styles: Map<string, Style>
  events: SubtitleEvent[]
  comments: Comment[]
  fonts?: EmbeddedData[]
  graphics?: EmbeddedData[]
  regions?: VTTRegion[]
}
```

### SubtitleEvent

```ts
interface SubtitleEvent {
  id: number
  start: number
  end: number
  layer: number
  style: string
  actor: string
  marginL: number
  marginR: number
  marginV: number
  effect?: string
  region?: string
  text: string
  segments: TextSegment[]
  image?: ImageData
  vobsub?: VobSubMeta
  pgs?: PGSMeta
  dirty: boolean
}
```

```ts
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
```

Notes:
- `effect` is the raw ASS/SSA Effect field when present.
- `region` holds TTML region references.
- `image` holds bitmap data for image-based formats.
- `vobsub` and `pgs` hold format metadata for bitmap subtitles.
- For bitmap formats, `segments` can be empty even when `image` is present.

## Colors

Colors use packed 32-bit integers in the format `0xAABBGGRR`. Use core utilities:

```ts
import { rgba, fromRGBA, Colors } from 'subforge/core'

const red = rgba(255, 0, 0, 0)
const { r, g, b, a } = fromRGBA(red)
```

## Text and segments

- `text` holds the original line text (with tags if present).
- `segments` hold parsed inline styles and effects.
- If `dirty` is `false`, serializers can keep the original `text`.
- If you edit `segments`, set `dirty = true` so serializers regenerate `text`.

## Helpers

```ts
import {
  createDocument,
  createEvent,
  createKaraokeEvent,
  cloneDocument
} from 'subforge/core'

const doc = createDocument()
doc.events.push(createEvent(1000, 3000, 'Hello'))

const karaoke = createKaraokeEvent(0, 3000, [
  { text: 'Hel', duration: 500 },
  { text: 'lo', duration: 500 }
])
```
