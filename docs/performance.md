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
| DVB | 5.08 |
| PAC | 7.01 |
| VobSub idx | 7.24 |
| Teletext | 8.69 |
| SCC | 10.79 |
| SBV | 11.70 |
| SMPTE-TT | 12.67 |
| DFXP | 12.75 |
| TTML | 13.04 |
| LRC | 13.13 |
| RealText | 13.72 |
| VobSub none | 13.78 |
| SSA | 14.42 |
| ASS | 14.43 |
| QT | 14.45 |
| Spruce STL | 15.08 |
| PGS | 16.27 |
| SAMI | 16.48 |
| CAP | 17.35 |
| EBU-STL | 18.37 |
| VobSub rle | 40.59 |
| VobSub | 47.34 |

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
