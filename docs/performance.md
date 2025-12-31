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
| VobSub none | 4.39 |
| DVB | 4.94 |
| PAC | 7.00 |
| VobSub idx | 7.16 |
| Teletext | 9.29 |
| SCC | 11.20 |
| SBV | 12.06 |
| SMPTE-TT | 12.65 |
| TTML | 12.75 |
| DFXP | 12.99 |
| LRC | 13.03 |
| RealText | 13.58 |
| QT | 14.19 |
| SSA | 14.59 |
| ASS | 14.88 |
| PGS | 15.92 |
| VobSub rle | 16.37 |
| Spruce STL | 16.45 |
| SAMI | 16.78 |
| EBU-STL | 17.42 |
| CAP | 17.63 |
| VobSub | 18.79 |

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
