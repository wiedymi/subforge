# MicroDVD

MicroDVD is a frame-based subtitle format with inline tags.

## Timing

- Frame-based: `{start}{end}`
- Requires an FPS value for conversion to milliseconds

## Styling

Inline tags use `{y:...}` syntax and support basic formatting.

## Parsing

```ts
import { parseMicroDVD } from 'subforge/microdvd'
import { unwrap } from 'subforge/core'

const doc = unwrap(parseMicroDVD(mdvdText, { fps: 23.976 }))
```

## Serialization

```ts
import { toMicroDVD } from 'subforge/microdvd'

const out = toMicroDVD(doc, { fps: 25 })
```
