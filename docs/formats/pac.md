# PAC

PAC is a binary subtitle format used by Screen Electronics/Cavena.

## Timing

- Frame-based timecodes in `HH:MM:SS:FF`
- PAL (25 fps) and NTSC (29.97 fps) supported

## Styling

- Control codes for italic and underline are mapped to tags

## Parsing

```ts
import { parsePAC, parsePACResult } from 'subforge/pac'

const data = new Uint8Array(await fetch('/subs.pac').then(r => r.arrayBuffer()))
const doc = parsePAC(data)
```

## Serialization

```ts
import { toPAC } from 'subforge/pac'

const pac = toPAC(doc, 25) // Uint8Array
```
