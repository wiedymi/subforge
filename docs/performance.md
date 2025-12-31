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
| DVB | 5.58 |
| VobSub idx | 7.29 |
| PAC | 7.40 |
| Teletext | 9.81 |
| SCC | 11.07 |
| SBV | 12.27 |
| SMPTE-TT | 12.71 |
| TTML | 13.02 |
| DFXP | 13.06 |
| LRC | 13.15 |
| QT | 14.13 |
| RealText | 14.16 |
| SSA | 14.57 |
| Spruce STL | 15.17 |
| ASS | 16.00 |
| CAP | 17.22 |
| VobSub none | 17.30 |
| PGS | 18.75 |
| EBU-STL | 18.85 |
| SAMI | 18.96 |
| VobSub rle | 35.30 |
| VobSub | 40.71 |

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
