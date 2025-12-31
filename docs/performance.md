# Performance

Subforge is tuned for large subtitle sets and supports fast paths for common patterns.

## Benchmarks

Run the full benchmark suite:

```bash
bun run bench
```

## 100k parse benchmark

These numbers are from isolated runs (each format executed in its own process) using `bun tests/bench/quick-isolated.ts --sort`.

| Format | 100k parse (ms) |
| --- | ---: |
| DVB | 5.29 |
| PAC | 6.90 |
| VobSub idx | 7.15 |
| Teletext | 8.31 |
| SCC | 11.58 |
| SBV | 12.11 |
| DFXP | 12.57 |
| TTML | 12.64 |
| SMPTE-TT | 12.73 |
| RealText | 13.93 |
| QT | 14.02 |
| ASS | 14.14 |
| LRC | 14.38 |
| SSA | 14.89 |
| PGS | 15.11 |
| Spruce STL | 16.36 |
| SAMI | 16.70 |
| CAP | 17.06 |
| EBU-STL | 17.13 |
| VobSub | 64.93 |

Results vary by hardware and Bun version. Re-run the command to refresh numbers.
VobSub full parses include RLE image decode; use index-only parsing (`parseIdx`) when you only need timing metadata.

Quick 100k parse matrix:

```bash
bun tests/bench/quick.ts
```

Isolated per-format matrix (avoids GC drift):

```bash
bun tests/bench/quick-isolated.ts --sort
```

## Tips

- Prefer subpath entry points to reduce bundle size.
- Keep `event.dirty` false when you do not need to reserialize text.
