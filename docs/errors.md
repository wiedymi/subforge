# Errors

Parsing functions follow two patterns:

- `parse<Format>(input)` throws `SubforgeError`.
- `parse<Format>Result(input, opts)` returns a `ParseResult` containing errors and warnings.

## SubforgeError

```ts
import { SubforgeError } from 'subforge/core'

try {
  parseSRT(input)
} catch (err) {
  if (err instanceof SubforgeError) {
    console.error(err.code, err.line, err.column)
  }
}
```

## ParseResult

```ts
const result = parseSRTResult(input, { onError: 'collect' })
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
