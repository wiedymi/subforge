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
| VobSub none | 4.59 |
| DVB | 5.03 |
| VobSub idx | 6.93 |
| PAC | 7.21 |
| Teletext | 8.74 |
| SBV | 11.61 |
| SCC | 11.74 |
| DFXP | 12.52 |
| TTML | 12.53 |
| SMPTE-TT | 12.88 |
| LRC | 13.02 |
| RealText | 14.31 |
| QT | 14.60 |
| ASS | 15.21 |
| SSA | 15.44 |
| Spruce STL | 15.75 |
| SAMI | 16.28 |
| EBU-STL | 16.28 |
| PGS | 17.48 |
| CAP | 17.70 |
| VobSub | 18.88 |
| VobSub rle | 19.09 |

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
