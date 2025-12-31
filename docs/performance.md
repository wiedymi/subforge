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
| DVB | 4.27 |
| VobSub idx | 6.01 |
| PAC | 8.18 |
| Teletext | 9.65 |
| SCC | 10.31 |
| LRC | 10.77 |
| SBV | 12.68 |
| QT | 13.52 |
| Spruce STL | 14.19 |
| TTML | 14.28 |
| SMPTE-TT | 14.28 |
| RealText | 14.61 |
| SAMI | 14.62 |
| EBU-STL | 14.81 |
| PGS | 14.82 |
| DFXP | 15.24 |
| ASS | 15.75 |
| CAP | 16.23 |
| SSA | 17.35 |

Results vary by hardware and Bun version. Re-run the command to refresh numbers.

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
