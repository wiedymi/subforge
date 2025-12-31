# VobSub

VobSub is a DVD subtitle format using `.idx` (index) and `.sub` (bitmap data).

## Timing

- Index file timestamps in `HH:MM:SS:ms`

## Images

- Bitmap data decoded into image effects

## Parsing

```ts
import { parseVobSub, parseVobSubResult } from 'subforge/vobsub'

const idx = await fetch('/subs.idx').then(r => r.text())
const sub = new Uint8Array(await fetch('/subs.sub').then(r => r.arrayBuffer()))
const doc = parseVobSub(idx, sub)
```

## Serialization

```ts
import { toVobSub } from 'subforge/vobsub'

const { idx, sub } = toVobSub(doc)
```

## Notes

- Full parsing requires both `.idx` and `.sub`.
- `parseVobSubResult` returns `{ ok, data, errors }` instead of a `ParseResult`.
