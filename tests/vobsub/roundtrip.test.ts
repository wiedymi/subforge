import { test, expect } from 'bun:test'
import { unwrap } from '../../src/core/errors.ts'
import { parseVobSub, toVobSub } from '../../src/formats/binary/vobsub/index.ts'
import type { SubtitleDocument, ImageEffect, VobSubEffect } from '../../src/core/types.ts'

test('parseVobSub parses empty VobSub', () => {
  const result = parseVobSub('# VobSub\nsize: 720x480', new Uint8Array(0))

  expect(result.ok).toBe(true)
  expect(result.document.events.length).toBe(0)
})

test('parseVobSub parses minimal valid VobSub', () => {
  const idx = `# VobSub index file

size: 720x480
palette: 000000, ffffff, 808080, c0c0c0, ff0000, 00ff00, 0000ff, ffff00, ff00ff, 00ffff, 800000, 008000, 000080, 808000, 800080, 008080

id: en, index: 0
`

  const sub = new Uint8Array(0)

  const doc = unwrap(parseVobSub(idx, sub))

  expect(doc.info.playResX).toBe(720)
  expect(doc.info.playResY).toBe(480)
  expect(doc.styles.size).toBe(1)
  expect(doc.events.length).toBe(0)
})

test('toVobSub creates valid VobSub files', () => {
  const doc: SubtitleDocument = {
    info: {
      playResX: 720,
      playResY: 480,
      scaleBorderAndShadow: true,
      wrapStyle: 0,
    },
    styles: new Map(),
    events: [{
      id: 0,
      start: 1000,
      end: 3000,
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
        effects: [
          {
            type: 'image',
            params: {
              format: 'indexed',
              width: 100,
              height: 50,
              x: 310,
              y: 215,
              data: new Uint8Array(100 * 50).fill(1),
              palette: [
                0x000000FF, 0xFFFFFFFF, 0x808080FF, 0xC0C0C0FF,
                0xFF0000FF, 0x00FF00FF, 0x0000FFFF, 0xFFFF00FF,
                0xFF00FFFF, 0x00FFFFFF, 0x800000FF, 0x008000FF,
                0x000080FF, 0x808000FF, 0x800080FF, 0x008080FF,
              ],
            },
          } as ImageEffect,
          {
            type: 'vobsub',
            params: {
              forced: false,
              originalIndex: 0,
            },
          } as VobSubEffect,
        ],
      }],
      dirty: false,
    }],
    comments: [],
  }

  const { idx, sub } = toVobSub(doc)

  expect(idx).toContain('size: 720x480')
  expect(idx).toContain('palette:')
  expect(idx).toContain('id: en, index: 0')
  expect(idx).toContain('timestamp: 00:00:01:000')
  expect(sub.length).toBeGreaterThan(0)
})

test('roundtrip preserves basic structure', () => {
  const originalDoc: SubtitleDocument = {
    info: {
      playResX: 720,
      playResY: 480,
      scaleBorderAndShadow: true,
      wrapStyle: 0,
    },
    styles: new Map(),
    events: [{
      id: 0,
      start: 2000,
      end: 5000,
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
        effects: [
          {
            type: 'image',
            params: {
              format: 'indexed',
              width: 50,
              height: 30,
              x: 100,
              y: 200,
              data: new Uint8Array(50 * 30).fill(2),
              palette: [
                0x000000FF, 0xFFFFFFFF, 0xFF0000FF, 0x00FF00FF,
                0x0000FFFF, 0xFFFF00FF, 0xFF00FFFF, 0x00FFFFFF,
                0x800000FF, 0x008000FF, 0x000080FF, 0x808000FF,
                0x800080FF, 0x008080FF, 0x808080FF, 0xC0C0C0FF,
              ],
            },
          } as ImageEffect,
        ],
      }],
      dirty: false,
    }],
    comments: [],
  }

  const { idx, sub } = toVobSub(originalDoc)
  const parsed = unwrap(parseVobSub(idx, sub))

  expect(parsed.info.playResX).toBe(720)
  expect(parsed.info.playResY).toBe(480)
  expect(parsed.events.length).toBe(1)

  const event = parsed.events[0]
  expect(event.start).toBe(2000)

  const imageEffect = event.segments[0].effects.find(e => e.type === 'image') as ImageEffect | undefined
  expect(imageEffect).toBeDefined()
  if (imageEffect) {
    expect(imageEffect.params.width).toBe(50)
    expect(imageEffect.params.height).toBe(30)
    expect(imageEffect.params.palette?.length).toBe(16)
  }
})
