# subforge

To install dependencies:

```bash
bun install
```

To run tests:

```bash
bun test
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

Subpath entry points:
`core`, `ass`, `ssa`, `srt`, `vtt`, `sbv`, `lrc`, `microdvd`, `ttml`, `sami`, `realtext`, `qt`, `stl`, `pgs`, `dvb`, `vobsub`, `pac`, `scc`, `cap`, `teletext`.

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
