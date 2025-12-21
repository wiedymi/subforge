import { bench, run, group } from 'mitata'
import { parseTags as parseASSTags, stripTags as stripASSTags, serializeTags as serializeASSTags } from '../../src/ass/tags.ts'
import { parseTags as parseSRTTags, stripTags as stripSRTTags, serializeTags as serializeSRTTags } from '../../src/srt/tags.ts'
import { parseTags as parseVTTTags, stripTags as stripVTTTags, serializeTags as serializeVTTTags } from '../../src/vtt/tags.ts'
import { parseColor, formatColor } from '../../src/ass/color.ts'
import { parseTime as parseASSTime, formatTime as formatASSTime } from '../../src/ass/time.ts'
import { parseTime as parseSRTTime, formatTime as formatSRTTime } from '../../src/srt/time.ts'
import { parseTime as parseVTTTime, formatTime as formatVTTTime } from '../../src/vtt/time.ts'

// ASS tag samples
const simpleTags = '{\\b1}bold text{\\b0}'
const complexTags = '{\\pos(100,200)\\fad(500,0)\\c&HFF0000&\\t(0,500,\\alpha&HFF&)}animated text'
const karaokeTags = '{\\k50}Hel{\\k30}lo {\\k40}World{\\k60}!'
const nestedTags = '{\\b1\\i1\\u1\\s1\\fnImpact\\fs72\\1c&H00FFFF&\\3c&H000000&}styled text'
// Real karaoke from railgun_op.ass
const realKaraoke = '{\\fscy0\\fscx0\\an5\\be1\\fade(255,128,0,0,90,90,360)\\move(411,46,419,46,0,200)\\frx-270\\t(0,360,\\frx0)\\t(0,360,\\fscy120\\fscx120)\\t(360,520,\\fscx100\\fscy100)}s'
const multiTransform = '{\\an5\\pos(431,46)\\3c&H8AFDFF&\\t(0,33,\\3c&H8AFDFF&\\bord10\\blur10\\fscx110\\fscy110)\\t(33,100,\\3c&H8AFDFF&\\bord3\\bord3)\\t(33,0,\\fscx100\\fscy100)\\fad(0,300)}sis'
// New tags: per-channel alpha, per-axis border/shadow, origin, encoding, wrap
const newTags = '{\\1a&H80&\\2a&H40&\\3a&H20&\\4a&HFF&\\xbord3\\ybord5\\xshad2\\yshad-3\\org(320,240)\\fe1\\q2\\kt100\\pbo10}text'
const legacyAlignment = '{\\a6}old style alignment'
const escapeSequences = 'line1\\Nline2\\hword'

// SRT tag samples
const srtTags = '<b><i>bold italic</i></b> <font color="#FF0000">red</font>'
const srtNested = '<b><i><u><s>all styles</s></u></i></b>'
const srtMultiple = 'normal <b>bold</b> <i>italic</i> <u>underline</u>'

// VTT tag samples
const vttTags = '<b><i>bold italic</i></b> <c.red>red</c>'
const vttVoice = '<v Alice>Hello, how are you?</v>'
const vttRuby = '<ruby>漢字<rt>かんじ</rt></ruby>'
const vttTimestamp = 'Hello <00:00:01.000>world <00:00:02.000>test'

// Pre-parsed for serialization benchmarks
const assSimpleParsed = parseASSTags(simpleTags)
const assComplexParsed = parseASSTags(complexTags)
const srtParsed = parseSRTTags(srtTags)
const vttParsed = parseVTTTags(vttTags)

group('ASS tag parsing', () => {
  bench('simple tags', () => parseASSTags(simpleTags))
  bench('complex tags', () => parseASSTags(complexTags))
  bench('karaoke tags', () => parseASSTags(karaokeTags))
  bench('nested tags', () => parseASSTags(nestedTags))
  bench('real karaoke', () => parseASSTags(realKaraoke))
  bench('multi-transform', () => parseASSTags(multiTransform))
  bench('new tags (alpha/border/shadow/org)', () => parseASSTags(newTags))
  bench('legacy alignment', () => parseASSTags(legacyAlignment))
  bench('escape sequences', () => parseASSTags(escapeSequences))
})

group('ASS tag serialization', () => {
  bench('simple', () => serializeASSTags(assSimpleParsed))
  bench('complex', () => serializeASSTags(assComplexParsed))
})

group('ASS strip tags', () => {
  bench('simple', () => stripASSTags(simpleTags))
  bench('complex', () => stripASSTags(complexTags))
  bench('karaoke', () => stripASSTags(karaokeTags))
  bench('nested', () => stripASSTags(nestedTags))
  bench('real karaoke', () => stripASSTags(realKaraoke))
})

group('SRT tag parsing', () => {
  bench('basic', () => parseSRTTags(srtTags))
  bench('nested', () => parseSRTTags(srtNested))
  bench('multiple', () => parseSRTTags(srtMultiple))
})

group('SRT tag serialization', () => {
  bench('basic', () => serializeSRTTags(srtParsed))
})

group('SRT strip tags', () => {
  bench('basic', () => stripSRTTags(srtTags))
  bench('nested', () => stripSRTTags(srtNested))
  bench('multiple', () => stripSRTTags(srtMultiple))
})

group('VTT tag parsing', () => {
  bench('basic', () => parseVTTTags(vttTags))
  bench('voice', () => parseVTTTags(vttVoice))
  bench('ruby', () => parseVTTTags(vttRuby))
  bench('timestamp', () => parseVTTTags(vttTimestamp))
})

group('VTT tag serialization', () => {
  bench('basic', () => serializeVTTTags(vttParsed))
})

group('VTT strip tags', () => {
  bench('basic', () => stripVTTTags(vttTags))
  bench('voice', () => stripVTTTags(vttVoice))
  bench('ruby', () => stripVTTTags(vttRuby))
  bench('timestamp', () => stripVTTTags(vttTimestamp))
})

group('ASS color', () => {
  bench('parse 8-digit', () => parseColor('&H800000FF&'))
  bench('parse 6-digit', () => parseColor('&HFFFFFF&'))
  bench('format', () => formatColor(0x800000FF))
})

group('ASS time', () => {
  bench('parse', () => parseASSTime('1:23:45.67'))
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

run()
