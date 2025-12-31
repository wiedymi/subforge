# MicroDVD

MicroDVD is a frame-based subtitle format with inline tags.

## Timing

- Frame-based: `{start}{end}`
- Requires an FPS value for conversion to milliseconds

## Styling

Inline tags use `{y:...}` syntax and support basic formatting.

## API

```ts
import { parseMicroDVD, toMicroDVD } from 'subforge/microdvd'
```
