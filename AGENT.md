# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
bun install          # Install dependencies
bun test             # Run all tests
bun test tests/ass   # Run tests for a specific format
bun test --watch     # Run tests in watch mode
bun run bench        # Run all benchmarks
bun run tests/bench/parse.bench.ts  # Run a specific benchmark
```

## Architecture

Subforge is a high-performance TypeScript subtitle library supporting 20+ formats. ASS (Advanced SubStation Alpha) is the internal superset format - all other formats map to/from it with explicit feature loss tracking.

### Core Principle
- **Core modules** work with numbers only (time in `ms`, colors in `ABGR` format)
- **Format modules** handle string parsing/serialization (e.g., `"0:00:00.00"` <-> ms)
- Core never imports format modules. Formats import core.

### Directory Structure

```
src/
├── core/               # Shared types, operations, utilities
│   ├── types.ts        # SubtitleDocument, SubtitleEvent, Style, TextSegment, Effect
│   ├── ops.ts          # Timing shifts, scaling, sorting, filtering, karaoke ops
│   ├── query.ts        # findByStyle, findByActor, findOverlapping, etc.
│   ├── convert.ts      # Format conversion with loss reporting
│   ├── color.ts        # ABGR color utilities (rgba, blend, lighten, darken)
│   ├── time.ts         # Duration formatting, overlap detection
│   └── document.ts     # createDocument, createEvent, cloneDocument
├── formats/
│   ├── text/           # Text-based formats
│   │   ├── ass/        # ASS format (full-featured reference)
│   │   ├── ssa/        # SSA format (predecessor to ASS)
│   │   ├── srt/        # SubRip format
│   │   ├── vtt/        # WebVTT format
│   │   ├── sbv/        # YouTube SBV format
│   │   ├── lrc/        # LRC lyrics format
│   │   └── microdvd/   # MicroDVD frame-based format
│   ├── xml/            # XML-based formats
│   │   ├── ttml/       # TTML/DFXP/SMPTE-TT
│   │   ├── sami/       # Microsoft SAMI format
│   │   ├── realtext/   # RealPlayer format
│   │   └── qt/         # QuickTime Text format
│   ├── binary/         # Binary formats
│   │   ├── stl/        # EBU-STL + Spruce STL
│   │   ├── pgs/        # Blu-ray PGS bitmaps
│   │   ├── dvb/        # DVB subtitles
│   │   ├── vobsub/     # DVD subtitles (.idx/.sub)
│   │   └── pac/        # PAC (Cavena) format
│   └── broadcast/      # Broadcast/caption formats
│       ├── scc/        # Scenarist Closed Caption (CEA-608)
│       ├── cap/        # Cheetah CAP format
│       └── teletext/   # Teletext format
```

### Key Types

```ts
interface SubtitleDocument {
  info: ScriptInfo
  styles: Map<string, Style>
  events: SubtitleEvent[]
  comments: Comment[]
}

interface SubtitleEvent {
  id: number
  start: number           // milliseconds
  end: number             // milliseconds
  text: string            // Raw text with tags
  segments: TextSegment[] // Parsed (lazy populated)
  dirty: boolean          // True if segments were modified
  style: string           // Reference to style name
  layer: number
  actor: string
}
```

### Lossless Roundtrip

Events keep original `text` string. `segments` are lazily parsed only when accessed. When serializing, if `dirty` is false, the original text is used unchanged.

### Parser Pattern

Each format follows this pattern:
- `parse<Format>(input: string): SubtitleDocument` - throws on error
- `parse<Format>Result(input: string, opts?: ParseOptions): ParseResult` - collects errors
- `to<Format>(doc: SubtitleDocument, opts?): string` - serialize

### Performance Patterns

When writing performance-critical code:
- Use `indexOf()` instead of character-by-character scanning
- Use `substring()` instead of `slice()` (~2x faster)
- Use `arr[arr.length] = item` instead of `push()`
- Inline hot-path functions (avoid function call overhead in tight loops)
- Avoid intermediate substring allocations - search directly in source string

## Bun Environment

- Use `bun <file>` instead of `node <file>`
- Use `bun test` instead of jest/vitest
- Use `Bun.file()` for file I/O
- Bun auto-loads `.env` files
