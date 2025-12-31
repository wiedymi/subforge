# TTML, DFXP, SMPTE-TT

TTML is the W3C timed text standard. Subforge supports TTML and its profiles DFXP and SMPTE-TT.

## Timing

- Clock time (`HH:MM:SS.mmm`) and offset time are supported

## Styling and layout

- Parses `<styling>` and `<layout>` sections
- Supports style references and region placement

## API

```ts
import { parseTTML, toTTML, parseDFXP, toDFXP, parseSMPTETT, toSMPTETT } from 'subforge/ttml'
```
