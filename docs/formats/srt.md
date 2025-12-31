# SRT

SubRip is a simple and widely used subtitle format.

## Timing

- Format: `HH:MM:SS,mmm`

## Styling

Supported HTML-like tags:

- `<b>`, `<i>`, `<u>`, `<s>`
- `<font color="#RRGGBB">`

## Parsing

```ts
import { parseSRT } from 'subforge/srt'
import { unwrap } from 'subforge/core'

const doc = unwrap(parseSRT(srtText))
```

## Serialization

```ts
import { toSRT } from 'subforge/srt'
```
