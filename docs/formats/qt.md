# QuickTime Text

QuickTime Text is a simple text subtitle format used by Apple tools.

## Timing

- Format: `[HH:MM:SS.ff]` where `ff` is centiseconds

## Styling

- Header directives like `{font:Arial}` and `{size:24}`

## API

```ts
import { parseQT, toQT } from 'subforge/qt'
```
