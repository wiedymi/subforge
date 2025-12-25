import type { SubtitleDocument, SubtitleEvent, Style } from '../../../core/types.ts'
import { formatTime } from '../ass/time.ts'
import { formatColor } from '../ass/color.ts'
import { serializeTags } from '../ass/tags.ts'

/**
 * Serializes a SubtitleDocument into SSA (SubStation Alpha) v4 format.
 *
 * This function converts a subtitle document into the SSA v4 text format.
 * SSA v4 has some differences from ASS including different style field ordering
 * and alignment values, which are handled automatically during serialization.
 *
 * @param doc - The subtitle document to serialize
 * @returns The complete SSA v4 file content as a string
 *
 * @example
 * ```ts
 * const doc = parseASS(assContent)
 * // Convert to SSA v4 format
 * const ssaContent = toSSA(doc)
 * await Bun.write('output.ssa', ssaContent)
 * ```
 */
export function toSSA(doc: SubtitleDocument): string {
  let result = '[Script Info]\n'
  if (doc.info.title) result += 'Title: ' + doc.info.title + '\n'
  if (doc.info.author) result += 'Original Author: ' + doc.info.author + '\n'
  result += 'PlayResX: ' + doc.info.playResX + '\n'
  result += 'PlayResY: ' + doc.info.playResY + '\n'
  result += 'ScaledBorderAndShadow: ' + (doc.info.scaleBorderAndShadow ? 'yes' : 'no') + '\n'
  result += 'WrapStyle: ' + doc.info.wrapStyle + '\n\n'

  result += '[V4 Styles]\n'
  result += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding\n'

  const styleValues = Array.from(doc.styles.values())
  const styleLen = styleValues.length
  for (let i = 0; i < styleLen; i++) {
    result += serializeStyle(styleValues[i]!) + '\n'
  }
  result += '\n'

  result += '[Events]\n'
  result += 'Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'

  const comments = doc.comments
  const commentLen = comments.length
  const events = doc.events
  const eventLen = events.length
  let eventIndex = 0

  for (let i = 0; i < eventLen; i++) {
    for (let j = 0; j < commentLen; j++) {
      if (comments[j]!.beforeEventIndex === eventIndex) {
        result += 'Comment: 0,0:00:00.00,0:00:00.00,Default,,0,0,0,,' + comments[j]!.text + '\n'
      }
    }
    result += serializeEvent(events[i]!) + '\n'
    eventIndex++
  }

  for (let j = 0; j < commentLen; j++) {
    if (comments[j]!.beforeEventIndex === eventIndex) {
      result += 'Comment: 0,0:00:00.00,0:00:00.00,Default,,0,0,0,,' + comments[j]!.text + '\n'
    }
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
  // Convert ASS numpad alignment to SSA v4 alignment
  const ssaAlignment = convertASSToSSAAlignment(style.alignment)

  // SSA v4 Style format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
  return `Style: ${style.name},${style.fontName},${style.fontSize},${formatColor(style.primaryColor)},${formatColor(style.secondaryColor)},${formatColor(style.outlineColor)},${formatColor(style.backColor)},${style.bold ? -1 : 0},${style.italic ? -1 : 0},${style.borderStyle},${style.outline},${style.shadow},${ssaAlignment},${style.marginL},${style.marginR},${style.marginV},0,${style.encoding}`
}

function convertASSToSSAAlignment(assAlign: number): number {
  // ASS numpad: 1=bottom-left, 2=bottom-center, 3=bottom-right, 4=mid-left, 5=mid-center, 6=mid-right, 7=top-left, 8=top-center, 9=top-right
  // SSA v4: 1=left, 2=center, 3=right, 9=top-left, 10=top-center, 11=top-right
  switch (assAlign) {
    case 1: return 1  // bottom-left -> left
    case 2: return 2  // bottom-center -> center
    case 3: return 3  // bottom-right -> right
    case 7: return 9  // top-left
    case 8: return 10 // top-center
    case 9: return 11 // top-right
    default: return 2
  }
}

function serializeEvent(event: SubtitleEvent): string {
  const text = event.dirty && event.segments.length > 0
    ? serializeTags(event.segments)
    : event.text

  // SSA v4 Event format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
  // Marked is always 0 (unmarked)
  return `Dialogue: 0,${formatTime(event.start)},${formatTime(event.end)},${event.style},${event.actor},${event.marginL},${event.marginR},${event.marginV},${event.effect},${text}`
}
