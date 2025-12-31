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
| DVB | 4.87 |
| PAC | 7.07 |
| VobSub idx | 7.21 |
| Teletext | 8.81 |
| SCC | 11.13 |
| DFXP | 12.74 |
| SBV | 12.78 |
| SMPTE-TT | 12.90 |
| LRC | 12.92 |
| QT | 13.93 |
| TTML | 13.93 |
| RealText | 14.01 |
| SSA | 14.55 |
| Spruce STL | 15.48 |
| PGS | 15.59 |
| ASS | 15.73 |
| EBU-STL | 16.29 |
| SAMI | 16.75 |
| CAP | 17.20 |
| VobSub none | 19.04 |
| VobSub rle | 40.79 |
| VobSub | 43.95 |

Results vary by hardware and Bun version. Re-run the command to refresh numbers.
VobSub full parses include sub-packet processing and image handling; use `decode: 'none'` or `parseIdx` for timing-only workflows.

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
