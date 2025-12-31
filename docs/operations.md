# Operations

Core utilities live in `subforge/core` and operate on `SubtitleEvent[]`.

## Timing and sorting

```ts
import { shiftEvents, scaleEvents, sortByTime } from 'subforge/core'

shiftEvents(doc.events, 1500)
scaleEvents(doc.events, 1.05)
sortByTime(doc.events)
```

## Filtering and search

```ts
import { getEventsAt, getEventsBetween } from 'subforge/core'

const at30s = getEventsAt(doc.events, 30000)
const inRange = getEventsBetween(doc.events, 10000, 60000)
```

```ts
import { findByStyle, findByActor, findByText, findOverlapping } from 'subforge/core'

const defaults = findByStyle(doc.events, 'Default')
const lines = findByText(doc.events, /hello/i)
const overlaps = findOverlapping(doc.events)
```

## Text operations

```ts
import { searchReplace, changeStyle } from 'subforge/core'

searchReplace(doc.events, 'color', 'colour')
changeStyle(doc.events, 'Default', 'Narration')
```

## Karaoke

```ts
import { getKaraoke, getKaraokeOffset, scaleKaraoke } from 'subforge/core'

const k = getKaraoke(doc.events[0]!.segments[0]!)
const offset = getKaraokeOffset(doc.events[0]!.segments, 2)
scaleKaraoke(doc.events[0]!.segments, 0.9)
```
