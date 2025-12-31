# TTML, DFXP, SMPTE-TT

TTML is the W3C timed text standard. Subforge supports TTML and its profiles DFXP and SMPTE-TT.

## Timing

- Clock time (`HH:MM:SS.mmm`) and offset time are supported

## Styling and layout

- Parses `<styling>` and `<layout>` sections
- Supports style references and region placement

## Parsing

```ts
import { parseTTML, toTTML, parseDFXP, toDFXP, parseSMPTETT, toSMPTETT } from 'subforge/ttml'
```

```ts
import { parseTTMLResult } from 'subforge/ttml'
```

## Serialization options

```ts
import { toTTML } from 'subforge/ttml'

const ttml = toTTML(doc, {
  xmlns: true,
  includeHead: true,
  format: 'clock'
})
```
