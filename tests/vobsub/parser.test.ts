import { test, expect } from 'bun:test'
import { parseIdx, serializeIdx, parseTime, formatTime, formatColor, type VobSubIndex } from '../../src/vobsub/parser.ts'

test('parseTime converts VobSub time format to milliseconds', () => {
  expect(parseTime('00:00:01:000')).toBe(1000)
  expect(parseTime('00:01:30:500')).toBe(90500)
  expect(parseTime('01:30:45:123')).toBe(5445123)
})

test('formatTime converts milliseconds to VobSub time format', () => {
  expect(formatTime(1000)).toBe('00:00:01:000')
  expect(formatTime(90500)).toBe('00:01:30:500')
  expect(formatTime(5445123)).toBe('01:30:45:123')
})

test('parseIdx parses VobSub index file', () => {
  const idxContent = `# VobSub index file, v7 (do not modify this line!)

size: 720x480
palette: 000000, ffffff, 808080, c0c0c0, ff0000, 00ff00, 0000ff, ffff00, ff00ff, 00ffff, 800000, 008000, 000080, 808000, 800080, 008080

id: en, index: 0
timestamp: 00:00:01:000, filepos: 000000000
timestamp: 00:00:05:000, filepos: 000001000
`

  const index = parseIdx(idxContent)

  expect(index.size.width).toBe(720)
  expect(index.size.height).toBe(480)
  expect(index.palette.length).toBe(16)
  expect(index.palette[0]).toBe(0x000000FF)
  expect(index.palette[1]).toBe(0xFFFFFFFF)
  expect(index.tracks.length).toBe(1)
  expect(index.tracks[0].language).toBe('en')
  expect(index.tracks[0].index).toBe(0)
  expect(index.tracks[0].timestamps.length).toBe(2)
  expect(index.tracks[0].timestamps[0].time).toBe(1000)
  expect(index.tracks[0].timestamps[0].filepos).toBe(0)
  expect(index.tracks[0].timestamps[1].time).toBe(5000)
  expect(index.tracks[0].timestamps[1].filepos).toBe(0x1000)
})

test('parseIdx handles multiple tracks', () => {
  const idxContent = `# VobSub index file

size: 720x480
palette: 000000, ffffff, 808080, c0c0c0, ff0000, 00ff00, 0000ff, ffff00, ff00ff, 00ffff, 800000, 008000, 000080, 808000, 800080, 008080

id: en, index: 0
timestamp: 00:00:01:000, filepos: 000000000

id: es, index: 1
timestamp: 00:00:01:500, filepos: 000002000
`

  const index = parseIdx(idxContent)

  expect(index.tracks.length).toBe(2)
  expect(index.tracks[0].language).toBe('en')
  expect(index.tracks[1].language).toBe('es')
})

test('serializeIdx creates valid index content', () => {
  const index: VobSubIndex = {
    size: { width: 720, height: 480 },
    palette: [
      0x000000FF, 0xFFFFFFFF, 0x808080FF, 0xC0C0C0FF,
      0xFF0000FF, 0x00FF00FF, 0x0000FFFF, 0xFFFF00FF,
      0xFF00FFFF, 0x00FFFFFF, 0x800000FF, 0x008000FF,
      0x000080FF, 0x808000FF, 0x800080FF, 0x008080FF,
    ],
    tracks: [{
      language: 'en',
      index: 0,
      timestamps: [
        { time: 1000, filepos: 0 },
        { time: 5000, filepos: 0x1000 },
      ],
    }],
  }

  const content = serializeIdx(index)

  expect(content).toContain('size: 720x480')
  expect(content).toContain('palette:')
  expect(content).toContain('id: en, index: 0')
  expect(content).toContain('timestamp: 00:00:01:000, filepos: 000000000')
  expect(content).toContain('timestamp: 00:00:05:000, filepos: 000001000')
})

test('formatColor converts RGBA to hex', () => {
  expect(formatColor(0x000000FF)).toBe('000000')
  expect(formatColor(0xFFFFFFFF)).toBe('ffffff')
  expect(formatColor(0xFF0000FF)).toBe('ff0000')
  expect(formatColor(0x00FF00FF)).toBe('00ff00')
  expect(formatColor(0x0000FFFF)).toBe('0000ff')
})
