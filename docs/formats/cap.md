# CAP

CAP (CaptionMAX) is a text-based subtitle format with frame-accurate timing.

## Timing

- Format: `HH:MM:SS:FF` (frame-based)

## Parsing

```ts
import { parseCAP } from 'subforge/cap'
import { unwrap } from 'subforge/core'

const text = await fetch('/subs.cap').then(r => r.text())
const doc = unwrap(parseCAP(text))
```

## Serialization

```ts
import { toCAP } from 'subforge/cap'

const cap = toCAP(doc, { fps: 25, videoStandard: 'PAL' }) // string
```
