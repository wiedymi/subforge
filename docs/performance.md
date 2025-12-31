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
| DVB | 4.88 |
| VobSub idx | 7.00 |
| PAC | 7.43 |
| Teletext | 10.13 |
| SBV | 11.48 |
| SCC | 11.57 |
| TTML | 12.60 |
| DFXP | 12.87 |
| LRC | 13.47 |
| SMPTE-TT | 13.96 |
| RealText | 14.08 |
| QT | 14.38 |
| Spruce STL | 14.85 |
| SSA | 15.24 |
| ASS | 15.28 |
| SAMI | 16.19 |
| VobSub none | 17.39 |
| PGS | 17.40 |
| CAP | 17.96 |
| EBU-STL | 18.12 |
| VobSub rle | 35.48 |
| VobSub | 41.17 |

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
