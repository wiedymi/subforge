# LRC

LRC is commonly used for lyrics with timestamps. Subforge supports both simple and enhanced LRC.

## Timing

- Format: `[MM:SS.xx]` for line timing
- Enhanced format: `<MM:SS.xx>` word timing

## Metadata

Common metadata tags include `[ti:]`, `[ar:]`, `[al:]`, `[au:]`, `[offset:]`.

## Parsing

```ts
import { parseLRC } from 'subforge/lrc'
import { unwrap } from 'subforge/core'

const doc = unwrap(parseLRC(lrcText))
```

## Serialization

```ts
import { toLRC } from 'subforge/lrc'

const lrc = toLRC(doc, {
  includeMetadata: true,
  useCentiseconds: true,
  offset: 0
})
```
