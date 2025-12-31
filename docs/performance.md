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
| VobSub none | 4.53 |
| DVB | 5.30 |
| PAC | 7.26 |
| VobSub idx | 7.51 |
| SCC | 11.09 |
| SBV | 11.99 |
| LRC | 12.34 |
| Teletext | 12.51 |
| DFXP | 12.61 |
| SMPTE-TT | 12.66 |
| TTML | 12.89 |
| QT | 14.08 |
| RealText | 14.21 |
| ASS | 14.45 |
| SSA | 14.88 |
| Spruce STL | 16.13 |
| VobSub rle | 16.48 |
| PGS | 16.60 |
| CAP | 17.48 |
| SAMI | 17.96 |
| EBU-STL | 18.23 |
| VobSub | 21.19 |

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
