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

## Regions

VTT region blocks are parsed into `document.regions`.

## API

```ts
import { parseVTT, toVTT } from 'subforge/vtt'
```
