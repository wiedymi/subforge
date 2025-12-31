# QuickTime Text

QuickTime Text is a simple text subtitle format used by Apple tools.

## Timing

- Format: `[HH:MM:SS.mmm]` or `[MM:SS.mmm]`

## Styling

- Header directives like `{font:Arial}`, `{size:24}`, `{textColor: r, g, b}`

## Parsing

```ts
import { parseQT, parseQTResult } from 'subforge/qt'
```

## Serialization

```ts
import { toQT } from 'subforge/qt'

const qt = toQT(doc, {
  font: 'Arial',
  size: 24,
  textColor: [255, 255, 255],
  timeScale: 1000
})
```
