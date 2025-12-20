import { bench, run, group } from 'mitata'
import { parseTags as parseASSTags, stripTags as stripASSTags } from '../../src/ass/tags.ts'
import { parseTags as parseSRTTags, stripTags as stripSRTTags } from '../../src/srt/tags.ts'
import { parseTags as parseVTTTags, stripTags as stripVTTTags } from '../../src/vtt/tags.ts'
import { parseColor, formatColor } from '../../src/ass/color.ts'
import { parseTime as parseASSTime, formatTime as formatASSTime } from '../../src/ass/time.ts'
import { parseTime as parseSRTTime, formatTime as formatSRTTime } from '../../src/srt/time.ts'
import { parseTime as parseVTTTime, formatTime as formatVTTTime } from '../../src/vtt/time.ts'

const simpleTags = '{\\b1}bold text{\\b0}'
const complexTags = '{\\pos(100,200)\\fad(500,0)\\c&HFF0000&\\t(0,500,\\alpha&HFF&)}animated text'
const karaokeTags = '{\\k50}Hel{\\k30}lo {\\k40}World{\\k60}!'
const nestedTags = '{\\b1\\i1\\u1\\s1\\fnImpact\\fs72\\1c&H00FFFF&\\3c&H000000&}styled text'

const srtTags = '<b><i>bold italic</i></b> <font color="#FF0000">red</font>'
const vttTags = '<b><i>bold italic</i></b> <c.red>red</c>'

group('ASS tag parsing', () => {
  bench('simple tags', () => parseASSTags(simpleTags))
  bench('complex tags', () => parseASSTags(complexTags))
  bench('karaoke tags', () => parseASSTags(karaokeTags))
  bench('nested tags', () => parseASSTags(nestedTags))
})

group('ASS strip tags', () => {
  bench('simple', () => stripASSTags(simpleTags))
  bench('complex', () => stripASSTags(complexTags))
  bench('karaoke', () => stripASSTags(karaokeTags))
  bench('nested', () => stripASSTags(nestedTags))
})

group('SRT tag parsing', () => {
  bench('parse', () => parseSRTTags(srtTags))
  bench('strip', () => stripSRTTags(srtTags))
})

group('VTT tag parsing', () => {
  bench('parse', () => parseVTTTags(vttTags))
  bench('strip', () => stripVTTTags(vttTags))
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
