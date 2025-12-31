# DVB

DVB subtitles are bitmap-based and commonly used in broadcast streams.

## Timing

- PTS-based timing and page timeouts

## Images

- Parsed into image effects in event segments

## Parsing

```ts
import { parseDVB, parseDVBResult } from 'subforge/dvb'

const data = new Uint8Array(await fetch('/subs.dvb').then(r => r.arrayBuffer()))
const doc = parseDVB(data)
```

## Serialization

```ts
import { toDVB } from 'subforge/dvb'

const out = toDVB(doc) // Uint8Array
```
