# Formats

Subforge supports text, XML, binary, and broadcast subtitle formats through a consistent API.

## Supported formats

| Format | Parse | Serialize | Notes |
| --- | --- | --- | --- |
| ASS | yes | yes | Full-featured reference format |
| SSA | yes | yes | Legacy ASS predecessor |
| SRT | yes | yes | Popular simple format |
| VTT | yes | yes | WebVTT with region support |
| SBV | yes | yes | YouTube SBV |
| LRC | yes | yes | Lyric timestamps |
| MicroDVD | yes | yes | Frame-based timing |
| TTML | yes | yes | W3C standard |
| DFXP | yes | yes | TTML profile |
| SMPTE-TT | yes | yes | TTML profile |
| SAMI | yes | yes | Microsoft SAMI |
| RealText | yes | yes | RealNetworks |
| QuickTime Text | yes | yes | QT text |
| EBU-STL | yes | yes | Binary STL |
| Spruce STL | yes | yes | Text STL |
| PGS | yes | yes | Blu-ray bitmap |
| DVB | yes | yes | DVB subtitles |
| VobSub | yes | yes | Requires .idx + .sub |
| PAC | yes | yes | Cavena/Screen Electronics |
| SCC | yes | yes | CEA-608 |
| CAP | yes | yes | CaptionMAX |
| Teletext | yes | yes | Broadcast teletext |

## Subpath entry points

`core`, `ass`, `ssa`, `srt`, `vtt`, `sbv`, `lrc`, `microdvd`, `ttml`, `sami`, `realtext`, `qt`, `stl`, `pgs`, `dvb`, `vobsub`, `pac`, `scc`, `cap`, `teletext`

Example:

```ts
import { parseVTT } from 'subforge/vtt'
import { toPGS } from 'subforge/pgs'
```
