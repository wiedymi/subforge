# RealText

RealText is an XML-like format used by RealNetworks.

## Timing

- `time begin="HH:MM:SS.xx"` or `HH:MM:SS.mmm`
- `<clear/>` marks line boundaries

## Styling

- Basic tags such as `<b>`, `<i>`, `<u>` may be preserved in text

## Parsing

```ts
import { parseRealText } from 'subforge/realtext'
import { unwrap } from 'subforge/core'

const doc = unwrap(parseRealText(realText))
```

## Serialization

```ts
import { toRealText } from 'subforge/realtext'
```

## Notes

- Serializer converts newlines to `<br/>`.
```
