# Teletext

Teletext subtitles are broadcast packet data decoded into text.

## Timing

- Packet-based; current parser assigns a default 5s duration when no PTS is available

## Parsing

```ts
import { parseTeletext, parseTeletextResult } from 'subforge/teletext'

const data = new Uint8Array(await fetch('/subs.t42').then(r => r.arrayBuffer()))
const doc = parseTeletext(data)
```

## Serialization

```ts
import { toTeletext } from 'subforge/teletext'

const out = toTeletext(doc) // Uint8Array
```
