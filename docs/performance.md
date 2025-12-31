# Performance

Subforge is tuned for large subtitle sets and supports fast paths for common patterns.

## Benchmarks

Run the full benchmark suite:

```bash
bun run bench
```

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
