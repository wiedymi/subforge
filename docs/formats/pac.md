# PAC

PAC is a binary subtitle format used by Screen Electronics/Cavena.

## Timing

- Frame-based timecodes in `HH:MM:SS:FF`
- PAL (25 fps) and NTSC (29.97 fps) supported

## Styling

- Basic control codes (italic, underline) mapped to tags

## API

```ts
import { parsePAC, toPAC } from 'subforge/pac'
```
