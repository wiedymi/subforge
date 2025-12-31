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
| DVB | 5.19 |
| PAC | 6.68 |
| VobSub idx | 6.97 |
| Teletext | 9.32 |
| SCC | 11.42 |
| TTML | 12.49 |
| DFXP | 12.68 |
| SMPTE-TT | 12.83 |
| SBV | 12.96 |
| LRC | 12.97 |
| RealText | 13.77 |
| QT | 14.27 |
| ASS | 14.96 |
| Spruce STL | 15.02 |
| SSA | 15.06 |
| PGS | 15.36 |
| EBU-STL | 16.99 |
| SAMI | 17.15 |
| CAP | 17.17 |
| VobSub none | 17.93 |
| VobSub rle | 36.37 |
| VobSub | 40.93 |

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
