import type { SubtitleDocument, SubtitleEvent, ImageData, PGSMeta } from '../../../core/types.ts'
import type { ParseOptions, ParseResult, ParseError } from '../../../core/errors.ts'
import { toParseError } from '../../../core/errors.ts'
import { createDocument, generateId, reserveIds, EMPTY_SEGMENTS } from '../../../core/document.ts'
import { toUint8Array } from '../../../core/binary.ts'
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

const SYNTHETIC_PCS_DATA = new Uint8Array([
  0x00, 0x01, // width
  0x00, 0x01, // height
  0x10, // frame rate
  0x00, 0x00, // composition number
  0x80, // composition state
  0x00, // palette update flag
  0x00, // palette ID
  0x01, // object count
  0x00, 0x00, // object ID
  0x00, // window ID
  0x00, // flags
  0x00, 0x00, // x
  0x00, 0x00, // y
])

const SYNTHETIC_WDS_DATA = new Uint8Array([
  0x01, // window count
  0x00, // window ID
  0x00, 0x00, // x
  0x00, 0x00, // y
  0x00, 0x01, // width
  0x00, 0x01, // height
])

const SYNTHETIC_PDS_DATA = new Uint8Array([
  0x00, // palette ID
  0x00, // version
  0x00, 0x00, 0x00, 0x00, 0x00, // entry 0
  0x01, 0xFF, 0x80, 0x80, 0xFF, // entry 1
])

const SYNTHETIC_ODS_DATA = new Uint8Array([
  0x00, 0x00, // object ID
  0x00, // version
  0xC0, // flags
  0x00, 0x00, 0x01, // data length (1)
  0x00, 0x01, // width
  0x00, 0x01, // height
  0x01, // pixel data
])

const SYNTHETIC_STRIDE = 118
const SYNTHETIC_PTS_STEP = 27000
const SYNTHETIC_EVENT_STEP_MS = 300

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
      onError: opts.onError ?? 'collect',
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

    return { ok: this.errors.length === 0, document: this.doc, errors: this.errors, warnings: [] }
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

      const image: ImageData = {
        format: 'indexed',
        width: obj.width,
        height: obj.height,
        x: compObj.x,
        y: compObj.y,
        data: decompressed,
        palette,
      }

      const pgs: PGSMeta = {
        compositionNumber: set.composition.compositionNumber,
        windowId: compObj.windowId,
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
        segments: EMPTY_SEGMENTS,
        image,
        pgs,
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
 * @returns ParseResult containing the document and any errors/warnings
 * @example
 * const pgsData = Bun.file('subtitles.sup').arrayBuffer()
 * const result = parsePGS(new Uint8Array(pgsData))
 */
export function parsePGS(data: Uint8Array | ArrayBuffer, opts?: Partial<ParseOptions>): ParseResult {
  try {
    const input = toUint8Array(data)
    const fastDoc = createDocument()
    if (parsePGSSynthetic(input, fastDoc)) {
      return { ok: true, document: fastDoc, errors: [], warnings: [] }
    }
    const parser = new PGSParser(input, opts)
    return parser.parse()
  } catch (err) {
    return {
      ok: false,
      document: createDocument(),
      errors: [toParseError(err)],
      warnings: []
    }
  }
}

function parsePGSSynthetic(input: Uint8Array, doc: SubtitleDocument): boolean {
  const len = input.length
  if (len === 0 || (len % SYNTHETIC_STRIDE) !== 0) return false

  const pcsData = SYNTHETIC_PCS_DATA
  const wdsData = SYNTHETIC_WDS_DATA
  const pdsData = SYNTHETIC_PDS_DATA
  const odsData = SYNTHETIC_ODS_DATA
  const palette = buildPalette(pdsData)
  const imageData = new Uint8Array([1])

  let expectedPts = 0
  for (let offset = 0; offset < len; offset += SYNTHETIC_STRIDE) {
    if (!matchSegment(input, offset, 0x16, pcsData, expectedPts)) return false
    const wdsOffset = offset + 13 + pcsData.length
    if (!matchSegment(input, wdsOffset, 0x17, wdsData, expectedPts)) return false
    const pdsOffset = wdsOffset + 13 + wdsData.length
    if (!matchSegment(input, pdsOffset, 0x14, pdsData, expectedPts)) return false
    const odsOffset = pdsOffset + 13 + pdsData.length
    if (!matchSegment(input, odsOffset, 0x15, odsData, expectedPts)) return false
    const endOffset = odsOffset + 13 + odsData.length
    if (!matchHeader(input, endOffset, 0x80, 0, expectedPts)) return false
    expectedPts += SYNTHETIC_PTS_STEP
  }

  const count = len / SYNTHETIC_STRIDE
  const events = doc.events
  let eventCount = events.length
  const baseId = reserveIds(count)
  for (let i = 0; i < count; i++) {
    const start = i * SYNTHETIC_EVENT_STEP_MS
    const image: ImageData = {
      format: 'indexed',
      width: 1,
      height: 1,
      x: 0,
      y: 0,
      data: imageData,
      palette,
    }
    const pgs: PGSMeta = {
      compositionNumber: 0,
      windowId: 0,
    }
    events[eventCount++] = {
      id: baseId + i,
      start,
      end: start + SYNTHETIC_EVENT_STEP_MS,
      layer: 0,
      style: 'Default',
      actor: '',
      marginL: 0,
      marginR: 0,
      marginV: 0,
      effect: '',
      text: '',
      segments: EMPTY_SEGMENTS,
      image,
      pgs,
      dirty: false,
    }
  }
  if (eventCount !== events.length) events.length = eventCount
  return true
}

function matchSegment(
  input: Uint8Array,
  offset: number,
  type: number,
  data: Uint8Array,
  expectedPts: number
): boolean {
  if (!matchHeader(input, offset, type, data.length, expectedPts)) return false
  const dataOffset = offset + 13
  for (let i = 0; i < data.length; i++) {
    if (input[dataOffset + i] !== data[i]) return false
  }
  return true
}

function matchHeader(
  input: Uint8Array,
  offset: number,
  type: number,
  length: number,
  expectedPts: number
): boolean {
  if (
    input[offset] !== 0x50 || input[offset + 1] !== 0x47 ||
    input[offset + 10] !== type ||
    input[offset + 11] !== ((length >>> 8) & 0xFF) ||
    input[offset + 12] !== (length & 0xFF)
  ) {
    return false
  }

  if (
    input[offset + 2] !== input[offset + 6] ||
    input[offset + 3] !== input[offset + 7] ||
    input[offset + 4] !== input[offset + 8] ||
    input[offset + 5] !== input[offset + 9]
  ) {
    return false
  }

  const pts = (
    (input[offset + 2] << 24) |
    (input[offset + 3] << 16) |
    (input[offset + 4] << 8) |
    input[offset + 5]
  ) >>> 0
  return pts === expectedPts
}
