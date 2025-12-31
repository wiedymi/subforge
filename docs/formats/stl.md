# STL (EBU-STL and Spruce STL)

Subforge supports both the binary EBU-STL format and the text-based Spruce STL variant.

## Timing

- Frame-based timecodes in `HH:MM:SS:FF`

## EBU-STL

- Binary format
- Suitable for broadcast workflows

## Spruce STL

- Plain text format used in authoring tools
- One subtitle per line

## API

```ts
import { parseEBUSTL, toEBUSTL, parseSpruceSTL, toSpruceSTL } from 'subforge/stl'
```
