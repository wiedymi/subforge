# Teletext

Teletext subtitles are broadcast packet data decoded into text.

## Timing

- Packet-based; current parser assigns a default 5s duration when no PTS is available

## Parsing

```ts
import { parseTeletext } from 'subforge/teletext'
import { unwrap } from 'subforge/core'

const data = new Uint8Array(await fetch('/subs.t42').then(r => r.arrayBuffer()))
const doc = unwrap(parseTeletext(data))
```

## Serialization

```ts
import { toTeletext } from 'subforge/teletext'

const out = toTeletext(doc) // Uint8Array
```
