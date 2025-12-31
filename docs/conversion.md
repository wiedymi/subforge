# Conversion

Subforge provides a high-level conversion helper in `subforge/core`:

```ts
import { convert } from 'subforge/core'

const result = convert(doc, {
  to: 'srt',
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
  to: FormatId
  unsupported?: 'drop' | 'comment'
  karaoke?: 'preserve' | 'explode' | 'strip'
  positioning?: 'preserve' | 'strip'
  reportLoss?: boolean
  formatOptions?: Record<string, unknown>
}
```

## Notes

- Conversion supports all formats that have serializers available.
- When `reportLoss` is enabled, the result includes a list of features that could not be preserved.
- Image-based formats are converted using `event.image`/metadata when present, or `segments` with image effects.
