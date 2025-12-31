# ASS

Advanced SubStation Alpha is the richest text format supported by Subforge. It is the internal superset model used across the library.

## Timing

- Format: `H:MM:SS.cc`
- Centiseconds are used for fractional time.

## Styling and tags

Subforge parses a broad, practical subset of ASS override tags and stores them in `segments`.

Commonly supported tags include:

- Font: `\fn`, `\fs`
- Styles: `\b`, `\i`, `\u`, `\s`
- Colors: `\c`, `\1c` to `\4c`, alpha variants
- Alignment: `\an`
- Positioning: `\pos`, `\move`
- Karaoke: `\k`, `\kf`, `\ko`
- Clipping: `\clip`, `\iclip`

If you need the exact list, review `src/formats/text/ass/tags.ts`.

## Parsing

```ts
import { parseASS, parseASSResult } from 'subforge/ass'

const doc = parseASS(assText)
const result = parseASSResult(assText, { onError: 'collect' })
```

## Serialization

```ts
import { toASS } from 'subforge/ass'

const out = toASS(doc)
```

## Notes

- ASS is the preferred format for lossless roundtrip.
- `segments` are lazily parsed; set `dirty = true` when editing segments.
