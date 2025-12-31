# STL (EBU-STL and Spruce STL)

Subforge supports both the binary EBU-STL format and the text-based Spruce STL variant.

## Timing

- Frame-based timecodes in `HH:MM:SS:FF`

## EBU-STL

- Binary format
- Suitable for broadcast workflows
- Inline styling control codes are currently ignored

## Spruce STL

- Plain text format used in authoring tools
- One subtitle per line

## Parsing

```ts
import { parseEBUSTL, parseSpruceSTL } from 'subforge/stl'
import { unwrap } from 'subforge/core'

const ebu = unwrap(parseEBUSTL(new Uint8Array(await fetch('/subs.stl').then(r => r.arrayBuffer()))))
const spruce = unwrap(parseSpruceSTL(await fetch('/subs.spruce').then(r => r.text())))
```

## Serialization

```ts
import { toEBUSTL, toSpruceSTL } from 'subforge/stl'

const ebu = toEBUSTL(doc, { frameRate: 25, cct: 0x00, languageCode: '0A' })
const spruce = toSpruceSTL(doc, { frameRate: 25 })
```
