# SAMI

SAMI is a legacy HTML-like subtitle format from Microsoft.

## Timing

- `SYNC Start=` values are milliseconds

## Styling

- CSS classes in the `<STYLE>` block
- `<P Class=...>` references

## Parsing

```ts
import { parseSAMI } from 'subforge/sami'
import { unwrap } from 'subforge/core'

const doc = unwrap(parseSAMI(samiText))
```

## Serialization

```ts
import { toSAMI } from 'subforge/sami'
```
