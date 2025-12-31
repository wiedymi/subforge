# SSA

SubStation Alpha v4 is the predecessor of ASS. It uses a similar structure with fewer styling features.

## Timing

- Format: `H:MM:SS.cc`

## Styling

- Basic style definitions and limited override tags
- Alignment and margins are supported

## API

```ts
import { parseSSA, toSSA } from 'subforge/ssa'
```

## Notes

- SSA is parsed into the same internal model as ASS.
