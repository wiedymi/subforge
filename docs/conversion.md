# Conversion

Subforge provides a high-level conversion helper in `subforge/core`:

```ts
import { convert } from 'subforge/core'

const result = convert(doc, 'srt', {
  karaoke: 'strip',
  positioning: 'strip',
  reportLoss: true
})

console.log(result.output)
console.log(result.lostFeatures)
```

## Options

```ts
type ConvertOptions = {
  unsupported: 'drop' | 'comment'
  karaoke: 'preserve' | 'explode' | 'strip'
  positioning: 'preserve' | 'strip'
  reportLoss?: boolean
}
```

## Notes

- Conversion currently targets `ass`, `srt`, and `vtt`.
- When `reportLoss` is enabled, the result includes a list of features that could not be preserved.
