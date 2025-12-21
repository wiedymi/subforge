import type { SubtitleDocument, SubtitleEvent, ImageEffect, PGSEffect } from '../core/types.ts'
import type { ParseOptions, ParseResult, ParseError } from '../core/errors.ts'
import { createDocument, generateId } from '../core/document.ts'
import {
  SegmentType,
  type SegmentHeader,
  type PaletteSegment,
  type ObjectSegment,
  type CompositionSegment,
  type WindowSegment,
  parseSegmentHeader,
  parsePaletteSegment,
  parseObjectSegment,
  parseCompositionSegment,
  parseWindowSegment,
  decompressRLE,
  buildPalette,
} from './segments.ts'

interface DisplaySet {
  pts: number
  composition: CompositionSegment | null
  windows: Map<number, WindowSegment>
  objects: Map<number, ObjectSegment>
  palette: PaletteSegment | null
}

class PGSParser {
  private view: DataView
  private pos = 0
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private displaySets: DisplaySet[] = []
  private currentSet: DisplaySet | null = null

  constructor(data: Uint8Array, opts: Partial<ParseOptions> = {}) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true,
    }
    this.doc = createDocument()
  }

  parse(): ParseResult {
    while (this.pos < this.view.byteLength) {
      const header = parseSegmentHeader(this.view, this.pos)
      if (!header) break

      const dataOffset = this.pos + 13
      this.processSegment(header, dataOffset)
      this.pos = dataOffset + header.size
    }

    // Convert display sets to events
    this.buildEvents()

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private processSegment(header: SegmentHeader, dataOffset: number): void {
    switch (header.type) {
      case SegmentType.PCS:
        this.handlePCS(header, dataOffset)
        break
      case SegmentType.WDS:
        this.handleWDS(header, dataOffset)
        break
      case SegmentType.PDS:
        this.handlePDS(header, dataOffset)
        break
      case SegmentType.ODS:
        this.handleODS(header, dataOffset)
        break
      case SegmentType.END:
        this.handleEND(header)
        break
    }
  }

  private handlePCS(header: SegmentHeader, dataOffset: number): void {
    const composition = parseCompositionSegment(this.view, dataOffset, header.size)
    if (!composition) return

    // Start new display set
    this.currentSet = {
      pts: header.pts,
      composition,
      windows: new Map(),
      objects: new Map(),
      palette: null,
    }
  }

  private handleWDS(header: SegmentHeader, dataOffset: number): void {
    if (!this.currentSet) return

    const window = parseWindowSegment(this.view, dataOffset, header.size)
    if (window) {
      this.currentSet.windows.set(window.windowId, window)
    }
  }

  private handlePDS(header: SegmentHeader, dataOffset: number): void {
    if (!this.currentSet) return

    const palette = parsePaletteSegment(this.view, dataOffset, header.size)
    if (palette) {
      this.currentSet.palette = palette
    }
  }

  private handleODS(header: SegmentHeader, dataOffset: number): void {
    if (!this.currentSet) return

    const object = parseObjectSegment(this.view, dataOffset, header.size)
    if (object) {
      const existing = this.currentSet.objects.get(object.objectId)
      if (existing && !object.firstInSequence) {
        // Append data to existing object
        const combined = new Uint8Array(existing.data.length + object.data.length)
        combined.set(existing.data)
        combined.set(object.data, existing.data.length)
        existing.data = combined
        if (object.lastInSequence) {
          existing.lastInSequence = true
        }
      } else {
        this.currentSet.objects.set(object.objectId, object)
      }
    }
  }

  private handleEND(_header: SegmentHeader): void {
    if (this.currentSet) {
      this.displaySets.push(this.currentSet)
      this.currentSet = null
    }
  }

  private buildEvents(): void {
    for (let i = 0; i < this.displaySets.length; i++) {
      const set = this.displaySets[i]
      const nextSet = this.displaySets[i + 1]

      if (!set.composition || set.composition.objects.length === 0) continue

      // Convert PTS from 90kHz to milliseconds
      const start = Math.round(set.pts / 90)
      const end = nextSet ? Math.round(nextSet.pts / 90) : start + 5000

      // Get palette
      const palette = set.palette ? buildPalette(set.palette.entries) : []

      // Process each composition object
      for (const compObj of set.composition.objects) {
        const obj = set.objects.get(compObj.objectId)
        if (!obj || !obj.width || !obj.height) continue

        // Decompress RLE data
        const decompressed = decompressRLE(obj.data, obj.width, obj.height)

        // Create image effect
        const imageEffect: ImageEffect = {
          type: 'image',
          params: {
            format: 'indexed',
            width: obj.width,
            height: obj.height,
            x: compObj.x,
            y: compObj.y,
            data: decompressed,
            palette,
          },
        }

        // Create PGS effect
        const pgsEffect: PGSEffect = {
          type: 'pgs',
          params: {
            compositionNumber: set.composition.compositionNumber,
            windowId: compObj.windowId,
          },
        }

        const event: SubtitleEvent = {
          id: generateId(),
          start,
          end,
          layer: 0,
          style: 'Default',
          actor: '',
          marginL: 0,
          marginR: 0,
          marginV: 0,
          effect: '',
          text: '',
          segments: [{
            text: '',
            style: null,
            effects: [imageEffect, pgsEffect],
          }],
          dirty: false,
        }

        this.doc.events.push(event)
      }
    }
  }
}

/**
 * Parse PGS (Presentation Graphic Stream) subtitle data
 * @param data - Binary PGS data
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If parsing fails
 * @example
 * const pgsData = Bun.file('subtitles.sup').arrayBuffer()
 * const doc = parsePGS(new Uint8Array(pgsData))
 */
export function parsePGS(data: Uint8Array): SubtitleDocument {
  const parser = new PGSParser(data, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parse PGS subtitle data with error handling options
 * @param data - Binary PGS data
 * @param opts - Parse options controlling error handling behavior
 * @returns Parse result containing document and any errors/warnings
 * @example
 * const result = parsePGSResult(data, { onError: 'collect', strict: false })
 * if (result.errors.length > 0) {
 *   console.log('Parsing errors:', result.errors)
 * }
 */
export function parsePGSResult(data: Uint8Array, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new PGSParser(data, opts)
  return parser.parse()
}
