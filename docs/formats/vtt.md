# VTT

WebVTT is a web-native caption format with styling tags and region support.

## Timing

- Format: `HH:MM:SS.mmm`

## Styling

Supported tags:

- `<b>`, `<i>`, `<u>`
- `<v>` (voice)
- `<c>` (class)
- `<lang>`

Voice, class, and language tags are parsed, but only bold, italic, and underline are serialized.

## Regions

VTT region blocks are parsed into `document.regions`.

## Parsing

```ts
import { parseVTT } from 'subforge/vtt'
import { unwrap } from 'subforge/core'

const doc = unwrap(parseVTT(vttText))
```

## Serialization

```ts
import { toVTT } from 'subforge/vtt'
```
