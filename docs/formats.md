# Formats

Subforge supports text, XML, binary, and broadcast subtitle formats through a consistent API. Each format has its own documentation page with specifics on timing syntax, styling, and options.

## Format matrix

See [Format Support Matrix](/format-support) for a concise overview of feature coverage.

## Text formats

- [ASS](/formats/ass)
- [SSA](/formats/ssa)
- [SRT](/formats/srt)
- [VTT](/formats/vtt)
- [SBV](/formats/sbv)
- [LRC](/formats/lrc)
- [MicroDVD](/formats/microdvd)

## XML formats

- [TTML](/formats/ttml)
- [SAMI](/formats/sami)
- [RealText](/formats/realtext)
- [QuickTime Text](/formats/qt)

## Binary formats

- [EBU-STL and Spruce STL](/formats/stl)
- [PGS](/formats/pgs)
- [DVB](/formats/dvb)
- [VobSub](/formats/vobsub)
- [PAC](/formats/pac)

## Broadcast formats

- [SCC](/formats/scc)
- [CAP](/formats/cap)
- [Teletext](/formats/teletext)

## Subpath entry points

`core`, `ass`, `ssa`, `srt`, `vtt`, `sbv`, `lrc`, `microdvd`, `ttml`, `sami`, `realtext`, `qt`, `stl`, `pgs`, `dvb`, `vobsub`, `pac`, `scc`, `cap`, `teletext`

Example:

```ts
import { parseVTT } from 'subforge/vtt'
import { toPGS } from 'subforge/pgs'
```
