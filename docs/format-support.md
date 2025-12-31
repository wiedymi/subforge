# Format Support Matrix

This matrix summarizes core support per format. "Limited" means partial coverage of the format feature or a constrained subset.

| Format | Parse | Serialize | Timing | Styling | Positioning | Images |
| --- | --- | --- | --- | --- | --- | --- |
| ASS | Yes | Yes | Timecode (H:MM:SS.cc) | Common override tags | Pos/Move/Clip | No |
| SSA | Yes | Yes | Timecode (H:MM:SS.cc) | Limited override tags | Alignment/Margins | No |
| SRT | Yes | Yes | Timecode (HH:MM:SS,mmm) | Basic tags + font color | No | No |
| VTT | Yes | Yes | Timecode (HH:MM:SS.mmm) | Basic tags (b/i/u); v/c/lang parsed only | Regions | No |
| SBV | Yes | Yes | Timecode (H:MM:SS.mmm) | None | No | No |
| LRC | Yes | Yes | Timecode (MM:SS.xx) | Word timing | No | No |
| MicroDVD | Yes | Yes | Frame-based | Inline tags | No | No |
| TTML | Yes | Yes | Clock or offset | Basic styling | Regions (default) | No |
| DFXP | Yes | Yes | Clock or offset | Basic styling | Regions (default) | No |
| SMPTE-TT | Yes | Yes | Clock time | Basic styling | Regions (default) | No |
| SAMI | Yes | Yes | Milliseconds | CSS classes | Align/Margins | No |
| RealText | Yes | Yes | Clock time | Basic tags | No | No |
| QuickTime Text | Yes | Yes | Timecode | Header directives | No | No |
| EBU-STL | Yes | Yes | Frame-based | None | No | No |
| Spruce STL | Yes | Yes | Frame-based | None | No | No |
| PGS | Yes | Yes | 90 kHz PTS | N/A | N/A | Yes |
| DVB | Yes | Yes | PTS + timeouts | N/A | N/A | Yes |
| VobSub | Yes | Yes | Timecode | N/A | N/A | Yes |
| PAC | Yes | Yes | Frame-based | Limited (italic/underline) | No | No |
| SCC | Yes | Yes | SMPTE timecode | None | No | No |
| CAP | Yes | Yes | Frame-based | None | No | No |
| Teletext | Yes | Yes | Packet-based (placeholder timing) | None | No | No |

## Notes

- For bitmap formats (PGS, DVB, VobSub), Subforge stores bitmap payloads on `event.image` with metadata on `event.pgs` or `event.vobsub`.
- "Positioning" indicates explicit placement or region support.
- Teletext parsing currently assigns a default duration when no PTS is available.
