# Getting Started

Subforge is a high-performance TypeScript subtitle library. It provides a common document model, fast parsers, and serializers for a wide range of subtitle formats.

## Install

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

## Use only what you need

Subpath entry points keep imports small:

```ts
import { parseASS } from 'subforge/ass'
import { parseSRT } from 'subforge/srt'
import { SubtitleDocument } from 'subforge/core'
```

## Build for browsers

The repository ships a Bun build pipeline that produces a universal ESM bundle in `dist/`.

```bash
bun run build
```

Then import from `dist/` in the browser:

```html
<script type="module">
  import { parseSRT } from './dist/index.js'
  const doc = parseSRT('1\n00:00:01,000 --> 00:00:02,000\nHello\n')
  console.log(doc.events.length)
</script>
```

## Where to go next

- Document model: see [Document Model](/document-model)
- Parsing: see [Parsing](/parsing)
- Serialization: see [Serialization](/serialization)
- Supported formats: see [Formats](/formats)
