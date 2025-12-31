# subforge

To install dependencies:

```bash
bun install
```

To run tests:

```bash
bun test
```

To build (bundled ESM to `dist/` for Node/Bun/browsers):

```bash
bun run build
```

To run benchmarks:

```bash
bun run bench
```

## Usage

```ts
import { parseSRT, toASS } from 'subforge'

const doc = parseSRT('1\n00:00:01,000 --> 00:00:02,000\nHello\n')
const ass = toASS(doc)
```

```ts
import { parseASS, toASS } from 'subforge/ass'
import { SubtitleDocument } from 'subforge/core'
```

Browser (ESM) usage (after `bun run build`):

```html
<script type="module">
  import { parseSRT } from './dist/index.js'
  const doc = parseSRT('1\n00:00:01,000 --> 00:00:02,000\nHello\n')
  console.log(doc.events.length)
</script>
```

Subpath entry points:
`core`, `ass`, `ssa`, `srt`, `vtt`, `sbv`, `lrc`, `microdvd`, `ttml`, `sami`, `realtext`, `qt`, `stl`, `pgs`, `dvb`, `vobsub`, `pac`, `scc`, `cap`, `teletext`.

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
