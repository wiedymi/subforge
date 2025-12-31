# PGS

Presentation Graphic Stream (PGS) is a bitmap subtitle format used by Blu-ray.

## Timing

- PTS in a 90 kHz clock

## Images

- Subforge converts PGS segments into image effects attached to events.
- Events contain `segments` with `image` effects.

## Parsing

```ts
import { parsePGS } from 'subforge/pgs'
import { unwrap } from 'subforge/core'

const data = new Uint8Array(await fetch('/subs.pgs').then(r => r.arrayBuffer()))
const doc = unwrap(parsePGS(data))
```

## Serialization

```ts
import { toPGS } from 'subforge/pgs'

const out = toPGS(doc) // Uint8Array
```
