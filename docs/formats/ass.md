# ASS

Advanced SubStation Alpha is the richest text format supported by Subforge. It is the internal superset model used across the library.

## Timing

- Format: `H:MM:SS.cc`
- Centiseconds are used for fractional time.

## Styling and tags

ASS supports a large set of override tags and style definitions. Subforge parses common override tags and preserves styling in `segments`:

- Font: `\fn`, `\fs`
- Styles: `\b`, `\i`, `\u`, `\s`
- Colors: `\c`, `\1c` to `\4c`, alpha variants
- Positioning: `\pos`, `\move`, `\an`
- Karaoke: `\k`, `\kf`, `\ko`
- Drawing: `\p` and vector drawing mode

## API

```ts
import { parseASS, toASS } from 'subforge/ass'

const doc = parseASS(assText)
const out = toASS(doc)
```

## Notes

- ASS is the preferred format for lossless roundtrip.
- `segments` are lazily parsed; set `dirty = true` when editing segments.
