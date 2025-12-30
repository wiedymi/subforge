/**
 * CEA-608 Closed Caption decoding tables and utilities.
 *
 * CEA-608 is the standard for closed captioning in North America, defining how caption data
 * is encoded and transmitted. This module provides decoding/encoding functionality for CEA-608
 * commands including control codes, special characters, and text data.
 *
 * Reference: CEA-608-E standard
 */

/**
 * CEA-608 control codes for caption manipulation.
 *
 * These control codes manage caption display, scrolling, positioning, and memory.
 * Each code is a 16-bit value (two bytes) that triggers specific caption behaviors.
 */
export const CONTROL_CODES = {
  // Caption control
  RCL: 0x9420, // Resume caption loading
  BS: 0x9421,  // Backspace
  AOF: 0x9422, // Reserved (formerly Alarm Off)
  AON: 0x9423, // Reserved (formerly Alarm On)
  DER: 0x9424, // Delete to end of row
  RU2: 0x9425, // Roll-up 2 rows
  RU3: 0x9426, // Roll-up 3 rows
  RU4: 0x9427, // Roll-up 4 rows
  FON: 0x9428, // Flash on
  RDC: 0x9429, // Resume direct captioning
  TR: 0x942a,  // Text restart
  RTD: 0x942b, // Resume text display
  EDM: 0x942c, // Erase displayed memory
  CR: 0x942d,  // Carriage return
  ENM: 0x942e, // Erase non-displayed memory
  EOC: 0x942f, // End of caption

  // Tab offsets (col 0-3)
  TO1: 0x9721, // Tab offset 1 column
  TO2: 0x9722, // Tab offset 2 columns
  TO3: 0x9723, // Tab offset 3 columns
} as const

const CONTROL_CODE_NAMES: { [code: number]: string } = {}
for (const [name, value] of Object.entries(CONTROL_CODES)) {
  CONTROL_CODE_NAMES[value] = name
}

/**
 * Preamble Address Codes (PAC) mapping codes to row numbers.
 *
 * PAC commands position the cursor on the screen, specifying both row and column.
 * Each code maps to a specific row number (1-15) on the caption display.
 * Format includes row + column/style information encoded in the byte pair.
 */
export const PAC_ROWS: { [code: number]: number } = {
  0x9140: 1, 0x9160: 1, 0x91e0: 1, 0x9240: 1, 0x9260: 1, 0x92e0: 1,
  0x9340: 2, 0x9360: 2, 0x93e0: 2, 0x1540: 2, 0x1560: 2, 0x15e0: 2,
  0x9440: 3, 0x9460: 3, 0x94e0: 3, 0x1640: 3, 0x1660: 3, 0x16e0: 3,
  0x9740: 4, 0x9760: 4, 0x97e0: 4, 0x9840: 4, 0x9860: 4, 0x98e0: 4,
  0x1040: 5, 0x1060: 5, 0x10e0: 5, 0x1340: 5, 0x1360: 5, 0x13e0: 5,
  0x1340: 6, 0x1360: 6, 0x13e0: 6, 0x1440: 6, 0x1460: 6, 0x14e0: 6,
  0x9540: 7, 0x9560: 7, 0x95e0: 7, 0x1740: 7, 0x1760: 7, 0x17e0: 7,
  0x1040: 8, 0x1060: 8, 0x10e0: 8, 0x1940: 8, 0x1960: 8, 0x19e0: 8,
  0x9140: 9, 0x9160: 9, 0x91e0: 9, 0x1a40: 9, 0x1a60: 9, 0x1ae0: 9,
  0x9240: 10, 0x9260: 10, 0x92e0: 10, 0x1b40: 10, 0x1b60: 10, 0x1be0: 10,
  0x9540: 11, 0x9560: 11, 0x95e0: 11, 0x1040: 11, 0x1060: 11, 0x10e0: 11,
  0x1340: 12, 0x1360: 12, 0x13e0: 12, 0x1c40: 12, 0x1c60: 12, 0x1ce0: 12,
  0x9440: 13, 0x9460: 13, 0x94e0: 13, 0x1d40: 13, 0x1d60: 13, 0x1de0: 13,
  0x9740: 14, 0x9760: 14, 0x97e0: 14, 0x1e40: 14, 0x1e60: 14, 0x1ee0: 14,
  0x1040: 15, 0x1060: 15, 0x10e0: 15, 0x1f40: 15, 0x1f60: 15, 0x1fe0: 15,
}

/**
 * Decodes a basic ASCII character from CEA-608 byte.
 *
 * Basic character set uses standard ASCII mapping for printable characters (0x20-0x7F).
 *
 * @param byte - Byte value to decode
 * @returns Decoded character string, or empty string if byte is outside valid range
 */
export function decodeBasicChar(byte: number): string {
  if (byte >= 0x20 && byte <= 0x7F) {
    return String.fromCharCode(byte)
  }
  return ''
}

/**
 * Special character mapping for extended CEA-608 character set.
 *
 * Includes accented characters, symbols, currency signs, and other special characters
 * not available in the basic ASCII set. Covers multiple language support including
 * Spanish, French, Portuguese, and German characters.
 *
 * Code ranges: 0x91-0x92, 0x93-0x94, 0x9a-0x9b
 */
export const SPECIAL_CHARS: { [code: number]: string } = {
  0x9130: '®',  // Registered mark
  0x9131: '°',  // Degree sign
  0x9132: '½',  // 1/2
  0x9133: '¿',  // Inverted question mark
  0x9134: '™',  // Trademark
  0x9135: '¢',  // Cent sign
  0x9136: '£',  // Pound sterling
  0x9137: '♪',  // Music note
  0x9138: 'à',  // a grave
  0x9139: ' ',  // Transparent space
  0x913a: 'è',  // e grave
  0x913b: 'â',  // a circumflex
  0x913c: 'ê',  // e circumflex
  0x913d: 'î',  // i circumflex
  0x913e: 'ô',  // o circumflex
  0x913f: 'û',  // u circumflex

  0x9230: 'Á',  // A acute
  0x9231: 'É',  // E acute
  0x9232: 'Ó',  // O acute
  0x9233: 'Ú',  // U acute
  0x9234: 'Ü',  // U umlaut
  0x9235: 'ü',  // u umlaut
  0x9236: '\u2018',  // Opening single quote
  0x9237: '¡',  // Inverted exclamation
  0x9238: '*',  // Asterisk
  0x9239: '\u2019',  // Closing single quote (apostrophe)
  0x923a: '—',  // Em dash
  0x923b: '©',  // Copyright
  0x923c: '℠',  // Service mark
  0x923d: '•',  // Round bullet
  0x923e: '\u201c',  // Opening double quote
  0x923f: '\u201d',  // Closing double quote

  // Extended Spanish/French
  0x9a20: 'Á',
  0x9a21: 'É',
  0x9a22: 'Ó',
  0x9a23: 'Ú',
  0x9a24: 'Ü',
  0x9a25: 'ü',
  0x9a26: '\u2018',
  0x9a27: '¡',
  0x9a28: '*',
  0x9a29: '\u2019',
  0x9a2a: '—',
  0x9a2b: '©',
  0x9a2c: '℠',
  0x9a2d: '•',
  0x9a2e: '\u201c',
  0x9a2f: '\u201d',

  // Extended Portuguese/German
  0x9a30: 'À',
  0x9a31: 'Â',
  0x9a32: 'Ç',
  0x9a33: 'È',
  0x9a34: 'Ê',
  0x9a35: 'Ë',
  0x9a36: 'ë',
  0x9a37: 'Î',
  0x9a38: 'Ï',
  0x9a39: 'ï',
  0x9a3a: 'Ô',
  0x9a3b: 'Ù',
  0x9a3c: 'ù',
  0x9a3d: 'Û',
  0x9a3e: '«',
  0x9a3f: '»',

  // Extended Portuguese/German continued
  0x9b20: 'Ã',
  0x9b21: 'ã',
  0x9b22: 'Í',
  0x9b23: 'Ì',
  0x9b24: 'ì',
  0x9b25: 'Ò',
  0x9b26: 'ò',
  0x9b27: 'Õ',
  0x9b28: 'õ',
  0x9b29: '{',
  0x9b2a: '}',
  0x9b2b: '\\',
  0x9b2c: '^',
  0x9b2d: '_',
  0x9b2e: '¦',
  0x9b2f: '~',

  // Extended French
  0x9b30: 'Ä',
  0x9b31: 'ä',
  0x9b32: 'Ö',
  0x9b33: 'ö',
  0x9b34: 'ß',
  0x9b35: '¥',
  0x9b36: '¤',
  0x9b37: '│',
  0x9b38: 'Å',
  0x9b39: 'å',
  0x9b3a: 'Ø',
  0x9b3b: 'ø',
  0x9b3c: '┌',
  0x9b3d: '┐',
  0x9b3e: '└',
  0x9b3f: '┘',
}

/**
 * Mid-row codes for changing text styling within a caption row.
 *
 * These codes allow style changes (color, italic, underline) to occur in the middle
 * of a caption line without repositioning the cursor or starting a new line.
 */
export const MID_ROW_CODES: { [code: number]: { style?: string; underline?: boolean } } = {
  0x9120: { style: 'white' },
  0x9121: { style: 'white', underline: true },
  0x9122: { style: 'green' },
  0x9123: { style: 'green', underline: true },
  0x9124: { style: 'blue' },
  0x9125: { style: 'blue', underline: true },
  0x9126: { style: 'cyan' },
  0x9127: { style: 'cyan', underline: true },
  0x9128: { style: 'red' },
  0x9129: { style: 'red', underline: true },
  0x912a: { style: 'yellow' },
  0x912b: { style: 'yellow', underline: true },
  0x912c: { style: 'magenta' },
  0x912d: { style: 'magenta', underline: true },
  0x912e: { style: 'italic' },
  0x912f: { style: 'italic', underline: true },
}

/**
 * Control command for caption flow and display management.
 */
export interface ControlCommand {
  /** Command type identifier */
  type: 'control'
  /** 16-bit command code */
  code: number
  /** Human-readable command name (e.g., 'RCL', 'EOC', 'CR') */
  name: string
}

/**
 * Preamble Address Code command for cursor positioning.
 */
export interface PACCommand {
  /** Command type identifier */
  type: 'pac'
  /** Target row number (1-15) */
  row: number
  /** Target column position */
  column: number
  /** Whether text should be underlined */
  underline: boolean
  /** Optional text color */
  color?: string
}

/**
 * Mid-row code command for inline style changes.
 */
export interface MidRowCommand {
  /** Command type identifier */
  type: 'midrow'
  /** Style name (e.g., 'white', 'italic', 'red') */
  style?: string
  /** Whether text should be underlined */
  underline?: boolean
}

/**
 * Character data command containing displayable text.
 */
export interface CharCommand {
  /** Command type identifier */
  type: 'char'
  /** Decoded character(s) to display */
  text: string
}

/**
 * Union type representing all possible CEA-608 commands.
 */
export type CEA608Command = ControlCommand | PACCommand | MidRowCommand | CharCommand

/**
 * Decodes a CEA-608 byte pair into a command object.
 *
 * CEA-608 data is transmitted as byte pairs (16-bit values). This function interprets
 * the byte pair and returns the appropriate command type (control, PAC, mid-row, or character).
 *
 * @param b1 - First byte (high byte)
 * @param b2 - Second byte (low byte)
 * @returns Decoded command object, or null if the byte pair represents padding/unknown data
 *
 * @example
 * ```ts
 * // Decode Resume Caption Loading command
 * const cmd = decodeCEA608(0x94, 0x20);
 * // Returns: { type: 'control', code: 0x9420, name: 'RCL' }
 *
 * // Decode character data
 * const chars = decodeCEA608(0x48, 0x69);
 * // Returns: { type: 'char', text: 'Hi' }
 * ```
 */
export function decodeCEA608(b1: number, b2: number): CEA608Command | null {
  const code = (b1 << 8) | b2

  // Check for control codes
  if ((b1 & 0xf0) === 0x90 && b1 >= 0x94 && b1 <= 0x97) {
    const name = CONTROL_CODE_NAMES[code]
    if (name) return { type: 'control', code, name }
  }

  // Check for PAC (preamble address codes)
  if (PAC_ROWS[code] !== undefined) {
    const row = PAC_ROWS[code]!
    const column = (b2 & 0x10) ? ((b2 & 0x0f) * 4) : 0
    const underline = (b2 & 0x01) === 1
    return { type: 'pac', row, column, underline }
  }

  // Check for mid-row codes
  if (MID_ROW_CODES[code]) {
    return { type: 'midrow', ...MID_ROW_CODES[code] }
  }

  // Check for special characters
  if (SPECIAL_CHARS[code]) {
    return { type: 'char', text: SPECIAL_CHARS[code]! }
  }

  // Check for basic characters (both bytes should be valid ASCII range)
  if (b1 >= 0x20 && b1 <= 0x7f && b2 >= 0x20 && b2 <= 0x7f) {
    return { type: 'char', text: String.fromCharCode(b1) + String.fromCharCode(b2) }
  }

  // Check for single character
  if (b1 >= 0x20 && b1 <= 0x7f && b2 === 0x00) {
    return { type: 'char', text: String.fromCharCode(b1) }
  }

  // Unknown or padding
  return null
}

// Reverse lookup map: character -> CEA-608 code (built once)
const CHAR_TO_CODE: Map<string, number> = new Map()
for (const [codeStr, char] of Object.entries(SPECIAL_CHARS)) {
  CHAR_TO_CODE.set(char, parseInt(codeStr))
}

/**
 * Encodes text string into CEA-608 byte pairs.
 *
 * Converts a text string into an array of bytes suitable for CEA-608 transmission.
 * Handles both basic ASCII characters and special characters, pairing characters
 * when possible for efficient encoding.
 *
 * @param text - Text string to encode
 * @returns Array of bytes representing the encoded text (pairs of bytes)
 *
 * @example
 * ```ts
 * const bytes = encodeCEA608Text('Hello');
 * // Returns array of byte pairs for each character
 *
 * const specialBytes = encodeCEA608Text('© 2024');
 * // Handles special characters like copyright symbol
 * ```
 */
export function encodeCEA608Text(text: string): number[] {
  const bytes: number[] = []
  const len = text.length

  for (let i = 0; i < len; i++) {
    const char = text[i]!
    const charCode = char.charCodeAt(0)

    // Check special characters via O(1) map lookup
    const specialCode = CHAR_TO_CODE.get(char)
    if (specialCode !== undefined) {
      bytes[bytes.length] = (specialCode >> 8) & 0xff
      bytes[bytes.length] = specialCode & 0xff
      continue
    }

    // Basic ASCII
    if (charCode >= 0x20 && charCode <= 0x7f) {
      // Pair characters when possible
      if (i + 1 < len) {
        const nextCode = text.charCodeAt(i + 1)
        if (nextCode >= 0x20 && nextCode <= 0x7f) {
          bytes[bytes.length] = charCode
          bytes[bytes.length] = nextCode
          i++
          continue
        }
      }
      bytes[bytes.length] = charCode
      bytes[bytes.length] = 0x00
    }
  }

  return bytes
}

/**
 * Retrieves the byte pair for a named control code.
 *
 * Looks up a control code by name and returns its two-byte representation
 * for encoding into SCC format.
 *
 * @param name - Control code name (e.g., 'RCL', 'EOC', 'CR')
 * @returns Tuple of [high byte, low byte]
 *
 * @example
 * ```ts
 * const [b1, b2] = getControlCode('EOC');
 * // Returns [0x94, 0x2f] for End of Caption command
 * ```
 */
export function getControlCode(name: keyof typeof CONTROL_CODES): [number, number] {
  const code = CONTROL_CODES[name]
  return [(code >> 8) & 0xff, code & 0xff]
}
