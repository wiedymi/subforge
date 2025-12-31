# SAMI

SAMI is a legacy HTML-like subtitle format from Microsoft.

## Timing

- `SYNC Start=` values are milliseconds

## Styling

- CSS classes in the `<STYLE>` block
- `<P Class=...>` references

## Parsing

```ts
import { parseSAMI, parseSAMIResult } from 'subforge/sami'
```

## Serialization

```ts
import { toSAMI } from 'subforge/sami'
```
```
