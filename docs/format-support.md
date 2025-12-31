# Format Support Matrix

This matrix summarizes core support per format. "Limited" means partial coverage of the format feature or a constrained subset.

| Format | Parse | Serialize | Timing | Styling | Positioning | Images |
| --- | --- | --- | --- | --- | --- | --- |
| ASS | Yes | Yes | Timecode (H:MM:SS.cc) | Full override tags | Yes | No |
| SSA | Yes | Yes | Timecode (H:MM:SS.cc) | Limited override tags | Limited | No |
| SRT | Yes | Yes | Timecode (HH:MM:SS,mmm) | Basic tags | No | No |
| VTT | Yes | Yes | Timecode (HH:MM:SS.mmm) | Basic tags | Regions | No |
| SBV | Yes | Yes | Timecode (H:MM:SS.mmm) | None | No | No |
| LRC | Yes | Yes | Timecode (MM:SS.xx) | Word timing | No | No |
| MicroDVD | Yes | Yes | Frame-based | Inline tags | Limited | No |
| TTML | Yes | Yes | Clock or offset | Basic styling | Regions | No |
| DFXP | Yes | Yes | Clock or offset | Basic styling | Regions | No |
| SMPTE-TT | Yes | Yes | Clock time | Basic styling | Regions | No |
| SAMI | Yes | Yes | Milliseconds | CSS classes | Limited | No |
| RealText | Yes | Yes | Clock time | Basic tags | No | No |
| QuickTime Text | Yes | Yes | Timecode | Inline directives | No | No |
| EBU-STL | Yes | Yes | Frame-based | Limited | Limited | No |
| Spruce STL | Yes | Yes | Frame-based | None | No | No |
| PGS | Yes | Yes | 90 kHz PTS | N/A | N/A | Yes |
| DVB | Yes | Yes | PTS + timeouts | N/A | N/A | Yes |
| VobSub | Yes | Yes | Timecode | N/A | N/A | Yes |
| PAC | Yes | Yes | Frame-based | Limited | Limited | No |
| SCC | Yes | Yes | SMPTE timecode | Limited | Limited | No |
| CAP | Yes | Yes | Frame-based | None | No | No |
| Teletext | Yes | Yes | Packet-based | None | No | No |

## Notes

- For bitmap formats (PGS, DVB, VobSub), Subforge emits image effects in `segments`.
- "Positioning" indicates explicit placement or region support.
