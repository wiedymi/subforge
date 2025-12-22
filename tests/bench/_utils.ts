/**
 * Shared utilities for benchmarks
 */

import { createDocument, createEvent } from '../../src/core/document.ts'
import type { SubtitleDocument, SubtitleEvent } from '../../src/core/types.ts'

// ============================================================================
// Fixture Loading
// ============================================================================

const FIXTURES_DIR = './tests/fixtures'

/**
 * Load a fixture file, returns null if not found
 */
export async function loadFixture(path: string): Promise<string | null> {
  try {
    return await Bun.file(`${FIXTURES_DIR}/${path}`).text()
  } catch {
    return null
  }
}

/**
 * Load a binary fixture file, returns null if not found
 */
export async function loadBinaryFixture(path: string): Promise<Uint8Array | null> {
  try {
    const file = Bun.file(`${FIXTURES_DIR}/${path}`)
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Load fixture or generate synthetic data as fallback
 */
export async function loadFixtureOrGenerate(
  path: string,
  generator: (count: number) => string,
  count: number = 1000
): Promise<string> {
  const content = await loadFixture(path)
  if (content) return content
  console.warn(`Fixture not found: ${path}, using synthetic data`)
  return generator(count)
}

// ============================================================================
// Time Formatting
// ============================================================================

function formatASSTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}

function formatSRTTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`
}

function formatVTTTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
}

function formatLRCTime(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}

// ============================================================================
// Document Generators
// ============================================================================

/**
 * Generate a SubtitleDocument with N events
 */
export function generateDocument(count: number): SubtitleDocument {
  const doc = createDocument()
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    doc.events[doc.events.length] = createEvent(start, end, `Line number ${i + 1}`)
  }
  return doc
}

/**
 * Generate events with randomized timing (for ops benchmarks)
 */
export function generateRandomEvents(count: number): SubtitleEvent[] {
  const events: SubtitleEvent[] = []
  const styles = ['Default', 'Sign', 'Title', 'Italic']
  for (let i = 0; i < count; i++) {
    const start = Math.floor(Math.random() * 3600000)
    const end = start + Math.floor(Math.random() * 5000) + 1000
    const layer = Math.floor(Math.random() * 5)
    const style = styles[Math.floor(Math.random() * 4)]!
    events[events.length] = createEvent(start, end, `Line ${i + 1} with some text`, { layer, style })
  }
  return events
}

// ============================================================================
// Format-Specific Generators
// ============================================================================

export function generateASS(count: number): string {
  const lines = [
    '[Script Info]',
    'Title: Benchmark',
    'PlayResX: 1920',
    'PlayResY: 1080',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    lines[lines.length] = `Dialogue: 0,${formatASSTime(start)},${formatASSTime(end)},Default,,0,0,0,,Line number ${i + 1}`
  }
  return lines.join('\n')
}

export function generateSSA(count: number): string {
  const lines = [
    '[Script Info]',
    'Title: Benchmark',
    'ScriptType: v4.00',
    '',
    '[V4 Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding',
    'Style: Default,Arial,48,16777215,255,0,0,0,0,1,2,2,2,10,10,10,0,1',
    '',
    '[Events]',
    'Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    lines[lines.length] = `Dialogue: Marked=0,${formatASSTime(start)},${formatASSTime(end)},Default,,0,0,0,,Line number ${i + 1}`
  }
  return lines.join('\n')
}

export function generateSRT(count: number): string {
  const lines: string[] = []
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    lines[lines.length] = `${i + 1}`
    lines[lines.length] = `${formatSRTTime(start)} --> ${formatSRTTime(end)}`
    lines[lines.length] = `Line number ${i + 1}`
    lines[lines.length] = ''
  }
  return lines.join('\n')
}

export function generateVTT(count: number): string {
  const lines = ['WEBVTT', '']
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    lines[lines.length] = `${formatVTTTime(start)} --> ${formatVTTTime(end)}`
    lines[lines.length] = `Line number ${i + 1}`
    lines[lines.length] = ''
  }
  return lines.join('\n')
}

export function generateSBV(count: number): string {
  const lines: string[] = []
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    const formatTime = (ms: number) => {
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      const millis = ms % 1000
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
    }
    lines[lines.length] = `${formatTime(start)},${formatTime(end)}`
    lines[lines.length] = `Line number ${i + 1}`
    lines[lines.length] = ''
  }
  return lines.join('\n')
}

export function generateLRC(count: number): string {
  const lines = [
    '[ti:Benchmark]',
    '[ar:Test]',
    ''
  ]
  for (let i = 0; i < count; i++) {
    const time = i * 3000
    lines[lines.length] = `[${formatLRCTime(time)}]Line number ${i + 1}`
  }
  return lines.join('\n')
}

export function generateMicroDVD(count: number, fps: number = 25): string {
  const lines: string[] = []
  for (let i = 0; i < count; i++) {
    const startMs = i * 3000
    const endMs = startMs + 2500
    const startFrame = Math.floor(startMs * fps / 1000)
    const endFrame = Math.floor(endMs * fps / 1000)
    lines[lines.length] = `{${startFrame}}{${endFrame}}Line number ${i + 1}`
  }
  return lines.join('\n')
}

export function generateSAMI(count: number): string {
  const lines = [
    '<SAMI>',
    '<HEAD>',
    '<TITLE>Benchmark</TITLE>',
    '<STYLE TYPE="text/css">',
    '<!--',
    'P { margin-left: 8pt; margin-right: 8pt; margin-bottom: 2pt; margin-top: 2pt; font-size: 24pt; text-align: center; font-family: Arial; }',
    '.ENCC { Name: English; lang: en-US; }',
    '-->',
    '</STYLE>',
    '</HEAD>',
    '<BODY>',
  ]
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    lines[lines.length] = `<SYNC Start=${start}><P Class=ENCC>Line number ${i + 1}</P></SYNC>`
    lines[lines.length] = `<SYNC Start=${end}><P Class=ENCC>&nbsp;</P></SYNC>`
  }
  lines[lines.length] = '</BODY>'
  lines[lines.length] = '</SAMI>'
  return lines.join('\n')
}

export function generateCAP(count: number): string {
  const lines: string[] = []
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    const formatTime = (ms: number) => {
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      const f = Math.floor((ms % 1000) / (1000 / 30))
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`
    }
    lines[lines.length] = `${formatTime(start)}\t${formatTime(end)}`
    lines[lines.length] = `Line number ${i + 1}`
    lines[lines.length] = ''
  }
  return lines.join('\n')
}

export function generateQT(count: number): string {
  const lines = ['{QTtext} {font:Arial} {size:24}']
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    const formatTime = (ms: number) => {
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      const f = Math.floor((ms % 1000) / (1000 / 30))
      return `[${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${f.toString().padStart(2, '0')}]`
    }
    lines[lines.length] = `${formatTime(start)}`
    lines[lines.length] = `Line number ${i + 1}`
    lines[lines.length] = `${formatTime(end)}`
    lines[lines.length] = ''
  }
  return lines.join('\n')
}

export function generateRealText(count: number): string {
  const lines = [
    '<window type="generic" duration="99:00:00.00">',
    '<font size="24" face="Arial">',
  ]
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const formatTime = (ms: number) => {
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      const cs = Math.floor((ms % 1000) / 10)
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
    }
    lines[lines.length] = `<time begin="${formatTime(start)}"/>Line number ${i + 1}<clear/>`
  }
  lines[lines.length] = '</font>'
  lines[lines.length] = '</window>'
  return lines.join('\n')
}

export function generateTTML(count: number): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en">',
    '<body>',
    '<div>',
  ]
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const end = start + 2500
    const formatTime = (ms: number) => {
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      const millis = ms % 1000
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
    }
    lines[lines.length] = `<p begin="${formatTime(start)}" end="${formatTime(end)}">Line number ${i + 1}</p>`
  }
  lines[lines.length] = '</div>'
  lines[lines.length] = '</body>'
  lines[lines.length] = '</tt>'
  return lines.join('\n')
}

export function generateSCC(count: number): string {
  const lines = ['Scenarist_SCC V1.0', '']
  for (let i = 0; i < count; i++) {
    const start = i * 3000
    const h = Math.floor(start / 3600000)
    const m = Math.floor((start % 3600000) / 60000)
    const s = Math.floor((start % 60000) / 1000)
    const f = Math.floor((start % 1000) / (1000 / 30))
    const tc = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`
    // Simple SCC encoding for "Hi" (just for benchmarking)
    lines[lines.length] = `${tc}\t9420 9420 94ad 94ad c8e9 c8e9`
  }
  return lines.join('\n')
}

// ============================================================================
// Benchmark Sizes
// ============================================================================

export const SIZES = {
  small: 100,
  medium: 1000,
  large: 10000,
  stress: 100000,
} as const

export type Size = keyof typeof SIZES
