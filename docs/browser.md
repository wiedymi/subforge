# Browser Usage

Subforge builds a universal ESM bundle in `dist/` using Bun. The output is designed to run in browsers, Node, and Bun.

## Build

```bash
bun run build
```

## Use in the browser

```html
<script type="module">
  import { parseSRT } from './dist/index.js'

  const result = parseSRT('1\n00:00:01,000 --> 00:00:02,000\nHello\n')
  console.log(result.document.events.length)
</script>
```

## Notes

- The runtime code avoids Node-only APIs.
- Use the ESM build in environments that support ES modules.
