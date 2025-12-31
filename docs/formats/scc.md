# SCC

Scenarist Closed Caption (SCC) encodes CEA-608 data with SMPTE timecodes.

## Timing

- SMPTE timecode (29.97 drop-frame)

## Styling

- CEA-608 styling and positioning codes are not preserved; output is plain text with line breaks

## Parsing

```ts
import { parseSCC } from 'subforge/scc'
import { unwrap } from 'subforge/core'

const text = await fetch('/subs.scc').then(r => r.text())
const doc = unwrap(parseSCC(text))
```

## Serialization

```ts
import { toSCC } from 'subforge/scc'
```

## Notes

- Mid-row styling and PAC positioning are ignored during parsing.
