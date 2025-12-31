# DVB

DVB subtitles are bitmap-based and commonly used in broadcast streams.

## Timing

- PTS-based timing and page timeouts

## Images

- Parsed into `event.image` bitmap payloads

## Parsing

```ts
import { parseDVB } from 'subforge/dvb'
import { unwrap } from 'subforge/core'

const data = new Uint8Array(await fetch('/subs.dvb').then(r => r.arrayBuffer()))
const doc = unwrap(parseDVB(data))
```

## Serialization

```ts
import { toDVB } from 'subforge/dvb'

const out = toDVB(doc) // Uint8Array
```
