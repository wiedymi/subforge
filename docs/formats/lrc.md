# LRC

LRC is commonly used for lyrics with timestamps. Subforge supports both simple and enhanced LRC.

## Timing

- Format: `[MM:SS.xx]` for line timing
- Enhanced format: `<MM:SS.xx>` word timing

## Metadata

Common metadata tags include `[ti:]`, `[ar:]`, `[al:]`, `[au:]`, `[offset:]`.

## API

```ts
import { parseLRC, toLRC } from 'subforge/lrc'
```
