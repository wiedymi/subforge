/**
 * Tag parsing benchmarks
 * Covers: ASS/SRT/VTT tag parsing, color parsing, time parsing
 */

import { bench, group, run } from 'mitata'

// ASS tag utilities
import {
  parseTags as parseASSTags,
  stripTags as stripASSTags,
  serializeTags as serializeASSTags,
} from '../../src/formats/text/ass/tags.ts'
import { parseColor, formatColor, parseAlpha } from '../../src/formats/text/ass/color.ts'
import { parseTime as parseASSTime, formatTime as formatASSTime } from '../../src/formats/text/ass/time.ts'

// SRT tag utilities
import {
  parseTags as parseSRTTags,
  stripTags as stripSRTTags,
  serializeTags as serializeSRTTags,
} from '../../src/formats/text/srt/tags.ts'
import { parseTime as parseSRTTime, formatTime as formatSRTTime } from '../../src/formats/text/srt/time.ts'

// VTT tag utilities
import {
  parseTags as parseVTTTags,
  stripTags as stripVTTTags,
  serializeTags as serializeVTTTags,
} from '../../src/formats/text/vtt/tags.ts'
import { parseTime as parseVTTTime, formatTime as formatVTTTime } from '../../src/formats/text/vtt/time.ts'

// ============================================================================
// ASS Tag Samples
// ============================================================================

const assSimple = '{\\b1}bold text{\\b0}'
const assComplex = '{\\pos(100,200)\\fad(500,0)\\c&HFF0000&\\t(0,500,\\alpha&HFF&)}animated'
const assKaraoke = '{\\k50}Hel{\\k30}lo {\\k40}World{\\k60}!'
const assNested = '{\\b1\\i1\\u1\\s1\\fnImpact\\fs72\\1c&H00FFFF&\\3c&H000000&}styled'
const assRealKaraoke = '{\\fscy0\\fscx0\\an5\\be1\\fade(255,128,0,0,90,90,360)\\move(411,46,419,46,0,200)\\frx-270\\t(0,360,\\frx0)\\t(0,360,\\fscy120\\fscx120)\\t(360,520,\\fscx100\\fscy100)}s'
const assMultiTransform = '{\\an5\\pos(431,46)\\3c&H8AFDFF&\\t(0,33,\\3c&H8AFDFF&\\bord10\\blur10\\fscx110\\fscy110)\\t(33,100,\\3c&H8AFDFF&\\bord3\\bord3)\\t(33,0,\\fscx100\\fscy100)\\fad(0,300)}sis'
const assNewTags = '{\\1a&H80&\\2a&H40&\\3a&H20&\\4a&HFF&\\xbord3\\ybord5\\xshad2\\yshad-3\\org(320,240)\\fe1\\q2\\kt100\\pbo10}text'
const assLegacy = '{\\a6}old style alignment'
const assEscape = 'line1\\Nline2\\hword'

// ============================================================================
// SRT Tag Samples
// ============================================================================

const srtBasic = '<b><i>bold italic</i></b> <font color="#FF0000">red</font>'
const srtNested = '<b><i><u><s>all styles</s></u></i></b>'
const srtMultiple = 'normal <b>bold</b> <i>italic</i> <u>underline</u>'

// ============================================================================
// VTT Tag Samples
// ============================================================================

const vttBasic = '<b><i>bold italic</i></b> <c.red>red</c>'
const vttVoice = '<v Alice>Hello, how are you?</v>'
const vttRuby = '<ruby>漢字<rt>かんじ</rt></ruby>'
const vttTimestamp = 'Hello <00:00:01.000>world <00:00:02.000>test'

// ============================================================================
// Pre-parsed for serialization
// ============================================================================

const assSimpleParsed = parseASSTags(assSimple)
const assComplexParsed = parseASSTags(assComplex)
const srtParsed = parseSRTTags(srtBasic)
const vttParsed = parseVTTTags(vttBasic)

// ============================================================================
// ASS Tag Parsing
// ============================================================================

group('ASS tag parse', () => {
  bench('simple', () => parseASSTags(assSimple))
  bench('complex', () => parseASSTags(assComplex))
  bench('karaoke', () => parseASSTags(assKaraoke))
  bench('nested', () => parseASSTags(assNested))
  bench('real karaoke', () => parseASSTags(assRealKaraoke))
  bench('multi-transform', () => parseASSTags(assMultiTransform))
  bench('new tags', () => parseASSTags(assNewTags))
  bench('legacy', () => parseASSTags(assLegacy))
  bench('escape', () => parseASSTags(assEscape))
})

group('ASS tag serialize', () => {
  bench('simple', () => serializeASSTags(assSimpleParsed))
  bench('complex', () => serializeASSTags(assComplexParsed))
})

group('ASS strip tags', () => {
  bench('simple', () => stripASSTags(assSimple))
  bench('complex', () => stripASSTags(assComplex))
  bench('karaoke', () => stripASSTags(assKaraoke))
  bench('nested', () => stripASSTags(assNested))
  bench('real karaoke', () => stripASSTags(assRealKaraoke))
})

// ============================================================================
// SRT Tag Parsing
// ============================================================================

group('SRT tag parse', () => {
  bench('basic', () => parseSRTTags(srtBasic))
  bench('nested', () => parseSRTTags(srtNested))
  bench('multiple', () => parseSRTTags(srtMultiple))
})

group('SRT tag serialize', () => {
  bench('basic', () => serializeSRTTags(srtParsed))
})

group('SRT strip tags', () => {
  bench('basic', () => stripSRTTags(srtBasic))
  bench('nested', () => stripSRTTags(srtNested))
  bench('multiple', () => stripSRTTags(srtMultiple))
})

// ============================================================================
// VTT Tag Parsing
// ============================================================================

group('VTT tag parse', () => {
  bench('basic', () => parseVTTTags(vttBasic))
  bench('voice', () => parseVTTTags(vttVoice))
  bench('ruby', () => parseVTTTags(vttRuby))
  bench('timestamp', () => parseVTTTags(vttTimestamp))
})

group('VTT tag serialize', () => {
  bench('basic', () => serializeVTTTags(vttParsed))
})

group('VTT strip tags', () => {
  bench('basic', () => stripVTTTags(vttBasic))
  bench('voice', () => stripVTTTags(vttVoice))
  bench('ruby', () => stripVTTTags(vttRuby))
  bench('timestamp', () => stripVTTTags(vttTimestamp))
})

// ============================================================================
// Color Parsing
// ============================================================================

group('ASS color parse', () => {
  bench('8-digit', () => parseColor('&H800000FF&'))
  bench('6-digit', () => parseColor('&HFFFFFF&'))
  bench('alpha', () => parseAlpha('&HFF&'))
})

group('ASS color format', () => {
  bench('with alpha', () => formatColor(0x800000FF))
  bench('no alpha', () => formatColor(0x00FFFFFF))
})

// ============================================================================
// Time Parsing
// ============================================================================

group('ASS time', () => {
  bench('parse', () => parseASSTime('1:23:45.67'))
  bench('parse short', () => parseASSTime('0:00:05.00'))
  bench('format', () => formatASSTime(5025670))
})

group('SRT time', () => {
  bench('parse', () => parseSRTTime('01:23:45,678'))
  bench('format', () => formatSRTTime(5025678))
})

group('VTT time', () => {
  bench('parse full', () => parseVTTTime('01:23:45.678'))
  bench('parse short', () => parseVTTTime('23:45.678'))
  bench('format', () => formatVTTTime(5025678))
})

await run()
