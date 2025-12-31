# Parsing

All parsers return a `ParseResult`. This makes error handling consistent across formats and avoids hidden throws.

## Example

```ts
import { parseSRT } from 'subforge/srt'
import { unwrap } from 'subforge/core'

const result = parseSRT(srtText)
console.log(result.ok, result.errors.length)

// Throw on errors when you want a strict path
const doc = unwrap(result)
```

## Multi-part formats

Some formats use multiple inputs. For example, VobSub requires both `.idx` and `.sub`:

```ts
import { parseIdx, parseVobSub } from 'subforge/vobsub'
import { unwrap } from 'subforge/core'

const idx = await fetch('/subs.idx').then(r => r.text())
const sub = new Uint8Array(await fetch('/subs.sub').then(r => r.arrayBuffer()))
const index = parseIdx(idx) // optional, but faster if you reuse it
const doc = unwrap(parseVobSub(index, sub))
```

## Parse options

```ts
type ParseOptions = {
  onError?: 'skip' | 'collect'
  strict?: boolean
  encoding?: 'utf-8' | 'utf-16le' | 'utf-16be' | 'shift-jis' | 'auto'
  preserveOrder?: boolean
}
```

- `onError` controls how invalid input is handled.
  - `collect` records errors in `ParseResult.errors`.
  - `skip` ignores invalid entries and continues without reporting them.
- `strict` enables stricter validation when supported by the parser.
- `encoding` overrides auto-detection.
- `preserveOrder` keeps original ordering instead of time-sorting.

## Parse result

```ts
type ParseResult = {
  ok: boolean
  document: SubtitleDocument
  errors: ParseError[]
  warnings: ParseWarning[]
}
```

Use `result.document` directly if you want best-effort parsing, or `unwrap(result)` when you want to treat errors as fatal.
