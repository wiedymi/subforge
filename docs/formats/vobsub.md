# VobSub

VobSub is a DVD subtitle format using `.idx` (index) and `.sub` (bitmap data).

## Timing

- Index file timestamps in `HH:MM:SS:ms`

## Images

- Default parsing decodes bitmap data into `image` effects (`format: 'indexed'`).
- Use `decode: 'rle'` to keep raw RLE data and skip bitmap decoding.
- Use `decode: 'none'` to skip sub packet parsing and keep only timing (no image effects).

## Parsing

```ts
import { parseVobSub } from 'subforge/vobsub'
import { unwrap } from 'subforge/core'

const idx = await fetch('/subs.idx').then(r => r.text())
const sub = new Uint8Array(await fetch('/subs.sub').then(r => r.arrayBuffer()))
const doc = unwrap(parseVobSub(idx, sub))
```

Fast metadata parse (skip bitmap decode):

```ts
import { parseVobSub } from 'subforge/vobsub'
import { unwrap } from 'subforge/core'

const idx = await fetch('/subs.idx').then(r => r.text())
const sub = new Uint8Array(await fetch('/subs.sub').then(r => r.arrayBuffer()))
const doc = unwrap(parseVobSub(idx, sub, { decode: 'rle' }))
```

Timing-only parse (skip sub packets):

```ts
import { parseVobSub } from 'subforge/vobsub'
import { unwrap } from 'subforge/core'

const idx = await fetch('/subs.idx').then(r => r.text())
const sub = new Uint8Array(await fetch('/subs.sub').then(r => r.arrayBuffer()))
const doc = unwrap(parseVobSub(idx, sub, { decode: 'none' }))
```

## Serialization

```ts
import { toVobSub } from 'subforge/vobsub'

const { idx, sub } = toVobSub(doc)
```

## Notes

- Full parsing requires both `.idx` and `.sub`.
