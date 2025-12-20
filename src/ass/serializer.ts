import type { SubtitleDocument, SubtitleEvent, Style } from '../core/types.ts'
import { formatTime } from './time.ts'
import { formatColor } from './color.ts'
import { serializeTags } from './tags.ts'

export function toASS(doc: SubtitleDocument): string {
  let result = '[Script Info]\n'
  if (doc.info.title) result += 'Title: ' + doc.info.title + '\n'
  if (doc.info.author) result += 'Original Author: ' + doc.info.author + '\n'
  result += 'PlayResX: ' + doc.info.playResX + '\n'
  result += 'PlayResY: ' + doc.info.playResY + '\n'
  result += 'ScaledBorderAndShadow: ' + (doc.info.scaleBorderAndShadow ? 'yes' : 'no') + '\n'
  result += 'WrapStyle: ' + doc.info.wrapStyle + '\n\n'

  result += '[V4+ Styles]\n'
  result += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n'

  const styleValues = Array.from(doc.styles.values())
  const styleLen = styleValues.length
  for (let i = 0; i < styleLen; i++) {
    result += serializeStyle(styleValues[i]!) + '\n'
  }
  result += '\n'

  result += '[Events]\n'
  result += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'

  const comments = doc.comments
  const commentLen = comments.length
  const events = doc.events
  const eventLen = events.length
  let eventIndex = 0

  for (let j = 0; j < commentLen; j++) {
    if (comments[j]!.beforeEventIndex === eventIndex) {
      result += 'Comment: 0,0:00:00.00,0:00:00.00,Default,,0,0,0,,' + comments[j]!.text + '\n'
    }
  }

  for (let i = 0; i < eventLen; i++) {
    for (let j = 0; j < commentLen; j++) {
      if (comments[j]!.beforeEventIndex === eventIndex) {
        result += 'Comment: 0,0:00:00.00,0:00:00.00,Default,,0,0,0,,' + comments[j]!.text + '\n'
      }
    }
    result += serializeEvent(events[i]!) + '\n'
    eventIndex++
  }
  result += '\n'

  if (doc.fonts && doc.fonts.length > 0) {
    result += '[Fonts]\n'
    const fonts = doc.fonts
    const fontLen = fonts.length
    for (let i = 0; i < fontLen; i++) {
      const font = fonts[i]!
      result += 'fontname: ' + font.name + '\n'
      const chunkSize = 80
      const dataLen = font.data.length
      for (let j = 0; j < dataLen; j += chunkSize) {
        result += font.data.slice(j, j + chunkSize) + '\n'
      }
    }
    result += '\n'
  }

  if (doc.graphics && doc.graphics.length > 0) {
    result += '[Graphics]\n'
    const graphics = doc.graphics
    const graphicLen = graphics.length
    for (let i = 0; i < graphicLen; i++) {
      const graphic = graphics[i]!
      result += 'filename: ' + graphic.name + '\n'
      const chunkSize = 80
      const dataLen = graphic.data.length
      for (let j = 0; j < dataLen; j += chunkSize) {
        result += graphic.data.slice(j, j + chunkSize) + '\n'
      }
    }
    result += '\n'
  }

  return result
}

function serializeStyle(style: Style): string {
  return `Style: ${style.name},${style.fontName},${style.fontSize},${formatColor(style.primaryColor)},${formatColor(style.secondaryColor)},${formatColor(style.outlineColor)},${formatColor(style.backColor)},${style.bold ? -1 : 0},${style.italic ? -1 : 0},${style.underline ? -1 : 0},${style.strikeout ? -1 : 0},${style.scaleX},${style.scaleY},${style.spacing},${style.angle},${style.borderStyle},${style.outline},${style.shadow},${style.alignment},${style.marginL},${style.marginR},${style.marginV},${style.encoding}`
}

function serializeEvent(event: SubtitleEvent): string {
  const text = event.dirty && event.segments.length > 0
    ? serializeTags(event.segments)
    : event.text

  return `Dialogue: ${event.layer},${formatTime(event.start)},${formatTime(event.end)},${event.style},${event.actor},${event.marginL},${event.marginR},${event.marginV},${event.effect},${text}`
}
