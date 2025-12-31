# SBV

SBV is a simple YouTube subtitle format.

## Timing

- Format: `H:MM:SS.mmm,H:MM:SS.mmm`

## Styling

- No inline styling support

## Parsing

```ts
import { parseSBV } from 'subforge/sbv'
import { unwrap } from 'subforge/core'

const doc = unwrap(parseSBV(sbvText))
```

## Serialization

```ts
import { toSBV } from 'subforge/sbv'
```
