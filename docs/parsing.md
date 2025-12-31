# Parsing

Every format exposes two parsing functions:

- `parse<Format>(input)` throws on errors.
- `parse<Format>Result(input, opts)` returns a `ParseResult` with errors/warnings.

## Example

```ts
import { parseSRT } from 'subforge/srt'
import { parseASSResult } from 'subforge/ass'

const doc = parseSRT(srtText)

const result = parseASSResult(assText, { onError: 'collect', strict: false })
console.log(result.errors.length)
```

## Parse options

```ts
type ParseOptions = {
  onError: 'throw' | 'skip' | 'collect'
  strict?: boolean
  encoding?: 'utf-8' | 'utf-16le' | 'utf-16be' | 'shift-jis' | 'auto'
  preserveOrder?: boolean
}
```

- `onError` controls how invalid input is handled.
- `strict` enables stricter validation when supported by the parser.
- `encoding` overrides auto-detection.
- `preserveOrder` keeps original ordering instead of time-sorting.

## Parse result

```ts
type ParseResult = {
  document: SubtitleDocument
  errors: ParseError[]
  warnings: ParseWarning[]
}
```

Use `parse<Format>Result` when you need robust error reporting instead of throwing.
