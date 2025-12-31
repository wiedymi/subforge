# PGS

Presentation Graphic Stream (PGS) is a bitmap subtitle format used by Blu-ray.

## Timing

- PTS in a 90 kHz clock

## Images

- Subforge converts PGS segments into image effects attached to events.
- Events contain `segments` with `image` effects.

## API

```ts
import { parsePGS, toPGS } from 'subforge/pgs'
```
