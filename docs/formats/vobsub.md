# VobSub

VobSub is a DVD subtitle format using `.idx` (index) and `.sub` (bitmap data).

## Timing

- Index file timestamps in `HH:MM:SS:ms`

## Images

- Bitmap data decoded into image effects

## API

```ts
import { parseVobSub, toVobSub } from 'subforge/vobsub'
```

## Notes

- Full parsing requires both `.idx` and `.sub`.
