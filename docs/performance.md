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
| DVB | 4.20 |
| VobSub idx | 6.26 |
| PAC | 6.48 |
| Teletext | 7.70 |
| SMPTE-TT | 9.51 |
| SCC | 10.19 |
| LRC | 11.29 |
| Spruce STL | 11.67 |
| SBV | 12.80 |
| QT | 13.74 |
| EBU-STL | 14.06 |
| RealText | 14.14 |
| TTML | 15.43 |
| PGS | 15.84 |
| ASS | 16.30 |
| CAP | 16.49 |
| DFXP | 16.71 |
| SSA | 17.29 |
| SAMI | 18.00 |

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
