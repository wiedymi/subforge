# Serialization

Most formats provide `to<Format>(doc)` to serialize a `SubtitleDocument`:

```ts
import { toSRT } from 'subforge/srt'
import { toASS } from 'subforge/ass'

const srt = toSRT(doc)
const ass = toASS(doc)
```

## Serializer behavior

- If `event.dirty` is `false`, serializers can reuse `event.text` for lossless roundtrip.
- If you edit `segments`, set `dirty = true` to regenerate text.
- Bitmap formats (PGS, DVB, VobSub) read image payloads from `event.image` and metadata from `event.pgs` or `event.vobsub`.

## Format-specific options

Some serializers accept options (examples):

```ts
import { toTTML } from 'subforge/ttml'
import { toCAP } from 'subforge/cap'
import type { CAPSerializerOptions } from 'subforge/cap'

const ttml = toTTML(doc, { format: 'clock' })

const options: CAPSerializerOptions = { videoStandard: 'PAL' }
const cap = toCAP(doc, options)
```
