import type { SubtitleDocument, SubtitleEvent } from '../core/types.ts'
import type { ParseOptions, ParseResult, ParseError, ErrorCode } from '../core/errors.ts'
import { SubforgeError } from '../core/errors.ts'
import { createDocument, generateId, EMPTY_SEGMENTS } from '../core/document.ts'
import { decodeCEA608, type CEA608Command } from './cea608.ts'

// SCC uses drop-frame timecode at 29.97 fps (30000/1001)
const FRAME_RATE = 29.97

class SCCParser {
  private src: string
  private pos = 0
  private len: number
  private doc: SubtitleDocument
  private errors: ParseError[] = []
  private opts: ParseOptions
  private lineNum = 1

  // Caption state
  private currentCaption: string[] = []
  private captionStart: number = 0
  private inCaption = false

  constructor(input: string, opts: Partial<ParseOptions> = {}) {
    // Handle BOM
    let start = 0
    if (input.charCodeAt(0) === 0xFEFF) start = 1

    this.src = input
    this.pos = start
    this.len = input.length
    this.opts = {
      onError: opts.onError ?? 'throw',
      strict: opts.strict ?? false,
      preserveOrder: opts.preserveOrder ?? true
    }
    this.doc = createDocument()
  }

  parse(): ParseResult {
    // Check for SCC header
    this.skipWhitespace()
    if (!this.checkHeader()) {
      this.addError('INVALID_FORMAT', 'Missing SCC header "Scenarist_SCC V1.0"')
    }

    while (this.pos < this.len) {
      this.skipWhitespace()
      if (this.pos >= this.len) break

      this.parseCaptionBlock()
    }

    // Flush any remaining caption
    this.flushCaption(this.len * 1000 / FRAME_RATE)

    return { document: this.doc, errors: this.errors, warnings: [] }
  }

  private checkHeader(): boolean {
    const header = 'Scenarist_SCC V1.0'
    const headerEnd = this.pos + header.length

    if (headerEnd > this.len) return false

    const found = this.src.substring(this.pos, headerEnd)
    if (found === header) {
      this.pos = headerEnd
      this.skipToNextLine()
      return true
    }

    return false
  }

  private skipWhitespace(): void {
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 10) { // \n
        this.pos++
        this.lineNum++
      } else if (c === 13) { // \r
        this.pos++
        if (this.pos < this.len && this.src.charCodeAt(this.pos) === 10) this.pos++
        this.lineNum++
      } else if (c === 32 || c === 9) { // space or tab
        this.pos++
      } else {
        break
      }
    }
  }

  private skipToNextLine(): void {
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)
      this.pos++
      if (c === 10) {
        this.lineNum++
        break
      } else if (c === 13) {
        if (this.pos < this.len && this.src.charCodeAt(this.pos) === 10) this.pos++
        this.lineNum++
        break
      }
    }
  }

  private parseCaptionBlock(): void {
    // Parse timecode (HH:MM:SS;FF or HH:MM:SS:FF)
    const timecode = this.parseTimecode()
    if (timecode === null) {
      this.skipToNextLine()
      return
    }

    // Skip tab or spaces
    this.skipSpacesAndTabs()

    // Parse CEA-608 data (hex pairs)
    const commands = this.parseHexData()

    // Process commands
    this.processCommands(timecode, commands)

    this.skipToNextLine()
  }

  private parseTimecode(): number | null {
    const start = this.pos

    // HH:MM:SS;FF or HH:MM:SS:FF
    // Find end of timecode (either tab, space, or newline)
    let end = this.pos
    while (end < this.len) {
      const c = this.src.charCodeAt(end)
      if (c === 9 || c === 32 || c === 10 || c === 13) break
      end++
    }

    const timecodeStr = this.src.substring(start, end)

    // Parse: HH:MM:SS;FF or HH:MM:SS:FF
    const match = timecodeStr.match(/^(\d{2}):(\d{2}):(\d{2})[:;](\d{2})$/)
    if (!match) {
      return null
    }

    const hours = parseInt(match[1]!)
    const minutes = parseInt(match[2]!)
    const seconds = parseInt(match[3]!)
    const frames = parseInt(match[4]!)

    // Convert to milliseconds
    // frames / 29.97 gives seconds for that frame portion
    const ms = (hours * 3600 + minutes * 60 + seconds) * 1000 + Math.round(frames * 1000 / FRAME_RATE)

    this.pos = end
    return ms
  }

  private skipSpacesAndTabs(): void {
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)
      if (c === 32 || c === 9) {
        this.pos++
      } else {
        break
      }
    }
  }

  private parseHexData(): CEA608Command[] {
    const commands: CEA608Command[] = []

    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos)

      // End of line
      if (c === 10 || c === 13) break

      // Skip whitespace
      if (c === 32 || c === 9) {
        this.pos++
        continue
      }

      // Parse hex pair (4 hex digits)
      if (this.pos + 3 < this.len) {
        const hexStr = this.src.substring(this.pos, this.pos + 4)
        const hexMatch = hexStr.match(/^[0-9a-fA-F]{4}$/)

        if (hexMatch) {
          const value = parseInt(hexStr, 16)
          const b1 = (value >> 8) & 0xff
          const b2 = value & 0xff

          const cmd = decodeCEA608(b1, b2)
          if (cmd) {
            commands.push(cmd)
          }

          this.pos += 4
          continue
        }
      }

      // Invalid character
      this.pos++
    }

    return commands
  }

  private processCommands(timecode: number, commands: CEA608Command[]): void {
    for (const cmd of commands) {
      if (cmd.type === 'control') {
        this.handleControlCommand(timecode, cmd)
      } else if (cmd.type === 'char') {
        this.handleCharCommand(cmd)
      } else if (cmd.type === 'pac') {
        // PAC commands position cursor - for now, treat as newline if we have text
        if (this.currentCaption.length > 0 && this.currentCaption[this.currentCaption.length - 1] !== '\n') {
          this.currentCaption.push('\n')
        }
      } else if (cmd.type === 'midrow') {
        // Mid-row codes change styling - ignore for now (basic text only)
      }
    }
  }

  private handleControlCommand(timecode: number, cmd: { code: number; name: string }): void {
    switch (cmd.name) {
      case 'RCL': // Resume caption loading - start new caption
        if (this.inCaption) {
          this.flushCaption(timecode)
        }
        this.inCaption = true
        this.captionStart = timecode
        this.currentCaption = []
        break

      case 'EDM': // Erase displayed memory - end current caption
        if (this.inCaption) {
          this.flushCaption(timecode)
        }
        this.inCaption = false
        this.currentCaption = []
        break

      case 'EOC': // End of caption - display caption
        if (this.inCaption) {
          this.flushCaption(timecode)
        }
        this.inCaption = false
        this.currentCaption = []
        break

      case 'CR': // Carriage return - newline
        this.currentCaption.push('\n')
        break

      case 'BS': // Backspace
        if (this.currentCaption.length > 0) {
          const last = this.currentCaption[this.currentCaption.length - 1]!
          if (last.length > 1) {
            this.currentCaption[this.currentCaption.length - 1] = last.slice(0, -1)
          } else {
            this.currentCaption.pop()
          }
        }
        break

      case 'RU2': // Roll-up 2 rows
      case 'RU3': // Roll-up 3 rows
      case 'RU4': // Roll-up 4 rows
      case 'RDC': // Resume direct captioning
      case 'ENM': // Erase non-displayed memory
        // These modes not fully implemented - treat as caption start
        if (!this.inCaption) {
          this.inCaption = true
          this.captionStart = timecode
          this.currentCaption = []
        }
        break
    }
  }

  private handleCharCommand(cmd: { text: string }): void {
    if (this.inCaption) {
      this.currentCaption.push(cmd.text)
    }
  }

  private flushCaption(endTime: number): void {
    if (this.currentCaption.length > 0) {
      const text = this.currentCaption.join('').trim()

      if (text.length > 0) {
        const event: SubtitleEvent = {
          id: generateId(),
          start: this.captionStart,
          end: endTime,
          layer: 0,
          style: 'Default',
          actor: '',
          marginL: 0,
          marginR: 0,
          marginV: 0,
          effect: '',
          text,
          segments: EMPTY_SEGMENTS,
          dirty: false
        }

        this.doc.events.push(event)
      }

      this.currentCaption = []
    }
  }

  private addError(code: ErrorCode, message: string, raw?: string): void {
    if (this.opts.onError === 'throw') {
      throw new SubforgeError(code, message, { line: this.lineNum, column: 1 })
    }
    this.errors.push({ line: this.lineNum, column: 1, code, message, raw })
  }
}

/**
 * Parses SCC (Scenarist Closed Caption) format subtitle file.
 *
 * SCC is a format developed by Scenarist for closed captioning, primarily used in North American broadcast.
 * It encodes CEA-608 closed caption data with SMPTE timecodes at 29.97 fps (drop-frame).
 *
 * @param input - SCC file content as a string
 * @returns Parsed subtitle document
 * @throws {SubforgeError} If the input is not valid SCC format or missing required header
 *
 * @example
 * ```ts
 * const sccContent = `Scenarist_SCC V1.0
 *
 * 00:00:00;00	9420 9420 94ad 94ad 9470 9470 4c6f 7265 6d20 6970 7375 6d20
 *
 * 00:00:03;00	942c 942c
 * `;
 * const doc = parseSCC(sccContent);
 * ```
 */
export function parseSCC(input: string): SubtitleDocument {
  const parser = new SCCParser(input, { onError: 'throw' })
  const result = parser.parse()
  return result.document
}

/**
 * Parses SCC format subtitle file with detailed error reporting.
 *
 * Similar to parseSCC but returns a ParseResult object containing the document,
 * errors, and warnings. Allows customization of error handling behavior.
 *
 * @param input - SCC file content as a string
 * @param opts - Parse options for error handling and parsing behavior
 * @returns Parse result containing document, errors array, and warnings array
 *
 * @example
 * ```ts
 * const result = parseSCCResult(sccContent, {
 *   onError: 'collect', // Collect errors instead of throwing
 *   strict: false
 * });
 * console.log(`Parsed ${result.document.events.length} events`);
 * console.log(`Found ${result.errors.length} errors`);
 * ```
 */
export function parseSCCResult(input: string, opts?: Partial<ParseOptions>): ParseResult {
  const parser = new SCCParser(input, opts)
  return parser.parse()
}
