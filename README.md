# Subforge

High-performance subtitle toolkit for parsing, converting, and authoring across 20+ formats.

[![Version](https://img.shields.io/npm/v/subforge?style=flat-square)](https://www.npmjs.com/package/subforge)
[![Gzip Size](https://img.shields.io/bundlephobia/minzip/subforge?style=flat-square)](https://bundlephobia.com/package/subforge)
[![Docs](https://img.shields.io/badge/docs-vitepress-blue?style=flat-square)](https://subforge.pages.dev/)
[![GitHub](https://img.shields.io/badge/-GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/wiedymi)
[![Twitter](https://img.shields.io/badge/-Twitter-1DA1F2?style=flat-square&logo=twitter&logoColor=white)](https://x.com/wiedymi)
[![Email](https://img.shields.io/badge/-Email-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:contact@wiedymi.com)
[![Discord](https://img.shields.io/badge/-Discord-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/eKW7GNesuS)
[![Support me](https://img.shields.io/badge/-Support%20me-ff69b4?style=flat-square&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/vivy-company)

## Highlights

- Unified document model with explicit feature loss tracking
- Parsers and serializers for text, XML, binary, and broadcast formats
- Fast paths for large subtitle collections
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
import { unwrap } from 'subforge/core'

const doc = unwrap(parseSRT('1\n00:00:01,000 --> 00:00:02,000\nHello\n'))
const ass = toASS(doc)
```

Use subpath entry points to keep imports small:

```ts
import { parseASS } from 'subforge/ass'
import { parseSRT } from 'subforge/srt'
import { SubtitleDocument } from 'subforge/core'
```

## Parsing

All parsers return a `ParseResult` so you can choose strict or best-effort flows:

```ts
import { parseSRT } from 'subforge/srt'
import { unwrap } from 'subforge/core'

const result = parseSRT(srtText)
const doc = unwrap(result)
```

## Conversion

```ts
import { convert } from 'subforge/core'

const result = convert(doc, {
  to: 'vtt',
  karaoke: 'strip',
  positioning: 'strip',
  reportLoss: true
})

console.log(result.lostFeatures)
```

## Bitmap formats

PGS, DVB, and VobSub store image payloads on `event.image` and metadata on `event.pgs` or `event.vobsub`:

```ts
import { parseVobSub, parseIdx } from 'subforge/vobsub'
import { unwrap } from 'subforge/core'

const idx = await fetch('/subs.idx').then(r => r.text())
const sub = new Uint8Array(await fetch('/subs.sub').then(r => r.arrayBuffer()))
const index = parseIdx(idx)
const doc = unwrap(parseVobSub(index, sub))

const first = doc.events[0]
console.log(first.image?.width, first.image?.height)
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
  const result = parseSRT('1\n00:00:01,000 --> 00:00:02,000\nHello\n')
  console.log(result.document.events.length)
</script>
```

## Formats

Subpath entry points:
`core`, `ass`, `ssa`, `srt`, `vtt`, `sbv`, `lrc`, `microdvd`, `ttml`, `sami`, `realtext`, `qt`, `stl`, `pgs`, `dvb`, `vobsub`, `pac`, `scc`, `cap`, `teletext`.

## Commands

```bash
bun test
bun run build
bun run bench
```

## Documentation

Live docs: [subforge.pages.dev](https://subforge.pages.dev/)

VitePress source is in `docs/`:

```bash
bun run docs:dev
bun run docs:build
bun run docs:preview
```

## License

MIT
