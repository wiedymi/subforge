# Errors

All parsing APIs return a `ParseResult` and never throw. If you want a strict path, use `unwrap` to turn parse errors into a `SubforgeError`.

## SubforgeError

```ts
import { parseSRT } from 'subforge/srt'
import { SubforgeError, unwrap } from 'subforge/core'

try {
  const doc = unwrap(parseSRT(input))
  console.log(doc.events.length)
} catch (err) {
  if (err instanceof SubforgeError) {
    console.error(err.code, err.line, err.column)
  }
}
```

## ParseResult

```ts
const result = parseSRT(input, { onError: 'collect' })
console.log(result.ok)
console.log(result.errors)
console.log(result.warnings)
```

## Error codes

Common error codes include:

- `INVALID_TIMESTAMP`
- `MALFORMED_EVENT`
- `INVALID_SECTION`
- `INVALID_COLOR`
- `INVALID_ENCODING`
