# Subforge

High-performance TypeScript subtitle library with a unified ASS-first document model, fast parsers, and serializers for a wide range of formats.

## Features

- Parse and serialize text, XML, binary, and broadcast subtitle formats
- ASS-first internal model with explicit feature loss handling
- High-throughput parsing paths tuned for large subtitle sets
- Universal ESM build for browsers, Node, and Bun

## Installation

```bash
bun add subforge
```

```bash
npm install subforge
```

```bash
pnpm add subforge
```

## Quickstart

```ts
import { parseSRT, toASS } from 'subforge'

const doc = parseSRT('1\n00:00:01,000 --> 00:00:02,000\nHello\n')
const ass = toASS(doc)
```

Use subpath entry points to keep imports small:

```ts
import { parseASS } from 'subforge/ass'
import { parseSRT } from 'subforge/srt'
import { SubtitleDocument } from 'subforge/core'
```

## Browser usage

Build the universal ESM bundle:

```bash
bun run build
```

Then import from `dist/`:

```html
<script type="module">
  import { parseSRT } from './dist/index.js'
  const doc = parseSRT('1\n00:00:01,000 --> 00:00:02,000\nHello\n')
  console.log(doc.events.length)
</script>
```

## Commands

```bash
bun test
bun run build
bun run bench
```

## Documentation

VitePress docs are in `docs/`:

```bash
bun run docs:dev
bun run docs:build
bun run docs:preview
```

## Formats

Subpath entry points:
`core`, `ass`, `ssa`, `srt`, `vtt`, `sbv`, `lrc`, `microdvd`, `ttml`, `sami`, `realtext`, `qt`, `stl`, `pgs`, `dvb`, `vobsub`, `pac`, `scc`, `cap`, `teletext`.

## License

MIT
