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
| DVB | 5.11 |
| PAC | 6.79 |
| VobSub idx | 7.65 |
| Teletext | 10.86 |
| SCC | 11.46 |
| SBV | 12.63 |
| DFXP | 12.66 |
| LRC | 12.80 |
| SMPTE-TT | 12.89 |
| TTML | 13.10 |
| SSA | 14.15 |
| RealText | 14.20 |
| QT | 14.61 |
| Spruce STL | 14.91 |
| ASS | 15.08 |
| PGS | 16.83 |
| EBU-STL | 17.35 |
| SAMI | 17.55 |
| CAP | 17.75 |
| VobSub none | 4.70 |
| VobSub rle | 16.51 |
| VobSub | 19.77 |

Results vary by hardware and Bun version. Re-run the command to refresh numbers.
VobSub numbers assume the `.idx` is parsed once (see `VobSub idx` row); the `VobSub` row measures `.sub` parsing + image decode.

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
