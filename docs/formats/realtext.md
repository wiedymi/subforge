# RealText

RealText is an XML-like format used by RealNetworks.

## Timing

- `time begin="HH:MM:SS.xx"` or `HH:MM:SS.mmm`
- `<clear/>` marks line boundaries

## Styling

- Basic tags such as `<b>`, `<i>`, `<u>` may be preserved in text

## API

```ts
import { parseRealText, toRealText } from 'subforge/realtext'
```
