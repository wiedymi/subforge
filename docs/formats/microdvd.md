# MicroDVD

MicroDVD is a frame-based subtitle format with inline tags.

## Timing

- Frame-based: `{start}{end}`
- Requires an FPS value for conversion to milliseconds

## Styling

Inline tags use `{y:...}` syntax and support basic formatting.

## Parsing

```ts
import { parseMicroDVD, parseMicroDVDResult } from 'subforge/microdvd'

const doc = parseMicroDVD(mdvdText, 23.976)
```

## Serialization

```ts
import { toMicroDVD } from 'subforge/microdvd'

const out = toMicroDVD(doc, 25)
```
