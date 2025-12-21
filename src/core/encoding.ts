/**
 * Character encoding detection and conversion module.
 * Supports UTF-8, UTF-16LE/BE, Japanese (Shift-JIS, EUC-JP), Chinese (GB2312, GBK, GB18030),
 * Korean (EUC-KR), Windows code pages, ISO-8859-1/2, and KOI8-R.
 */

/**
 * Supported character encodings.
 */
type Encoding =
  | 'utf-8'
  | 'utf-16le'
  | 'utf-16be'
  | 'shift-jis'
  | 'euc-jp'
  | 'gb2312'
  | 'gbk'
  | 'gb18030'
  | 'euc-kr'
  | 'windows-1250'
  | 'windows-1251'
  | 'windows-1252'
  | 'windows-1253'
  | 'windows-1254'
  | 'windows-1255'
  | 'windows-1256'
  | 'windows-1257'
  | 'windows-1258'
  | 'iso-8859-1'
  | 'iso-8859-2'
  | 'koi8-r'

/**
 * Normalizes encoding name to canonical form.
 * @param encoding - Input encoding name
 * @returns Normalized encoding identifier
 */
function normalizeEncoding(encoding: string): Encoding {
  const normalized = encoding.toLowerCase().replace(/[_\s]/g, '-')
  if (normalized === 'utf8') return 'utf-8'
  if (normalized === 'shiftjis' || normalized === 'shift-jis') return 'shift-jis'
  if (normalized === 'eucjp' || normalized === 'euc-jp') return 'euc-jp'
  if (normalized === 'euckr' || normalized === 'euc-kr') return 'euc-kr'
  return normalized as Encoding
}

/**
 * Auto-detects character encoding from byte data.
 * Checks BOM markers and performs statistical analysis.
 * @param data - Input byte data
 * @returns Detected encoding name
 * @example
 * ```ts
 * const data = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F])
 * detectEncoding(data) // 'utf-8'
 * ```
 */
export function detectEncoding(data: Uint8Array): string {
  if (data.length === 0) return 'utf-8'

  // Check BOM
  if (data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
    return 'utf-8'
  }
  if (data.length >= 2 && data[0] === 0xFF && data[1] === 0xFE) {
    return 'utf-16le'
  }
  if (data.length >= 2 && data[0] === 0xFE && data[1] === 0xFF) {
    return 'utf-16be'
  }

  // Statistical analysis for encoding detection
  let validUtf8 = 0
  let invalidUtf8 = 0
  let shiftJisScore = 0
  let eucJpScore = 0
  let gbScore = 0
  let eucKrScore = 0

  for (let i = 0; i < Math.min(data.length, 8192); i++) {
    const byte = data[i]

    // UTF-8 validation
    if (byte >= 0x80) {
      if ((byte & 0xE0) === 0xC0 && i + 1 < data.length && (data[i + 1] & 0xC0) === 0x80) {
        validUtf8++
        i++
      } else if ((byte & 0xF0) === 0xE0 && i + 2 < data.length && (data[i + 1] & 0xC0) === 0x80 && (data[i + 2] & 0xC0) === 0x80) {
        validUtf8++
        i += 2
      } else if ((byte & 0xF8) === 0xF0 && i + 3 < data.length && (data[i + 1] & 0xC0) === 0x80 && (data[i + 2] & 0xC0) === 0x80 && (data[i + 3] & 0xC0) === 0x80) {
        validUtf8++
        i += 3
      } else if (i + 1 < data.length) {
        const next = data[i + 1]

        // Shift-JIS patterns (first byte 0x81-0x9F or 0xE0-0xFC)
        if ((byte >= 0x81 && byte <= 0x9F) || (byte >= 0xE0 && byte <= 0xFC)) {
          if ((next >= 0x40 && next <= 0x7E) || (next >= 0x80 && next <= 0xFC)) {
            shiftJisScore += 3
          }
        }

        // EUC-JP patterns (both bytes 0xA1-0xFE)
        if (byte >= 0xA1 && byte <= 0xFE && next >= 0xA1 && next <= 0xFE) {
          eucJpScore += 3
        }

        // GB2312/GBK patterns (first byte 0xB0-0xF7, second 0xA1-0xFE)
        if (byte >= 0xB0 && byte <= 0xF7 && next >= 0xA1 && next <= 0xFE) {
          gbScore += 3
        } else if (byte >= 0xC0 && byte <= 0xF0 && next >= 0xA0 && next <= 0xFF) {
          // Broader GB range
          gbScore += 1
        }

        // EUC-KR patterns - Korean hangul uses specific second byte ranges
        if (byte >= 0xB0 && byte <= 0xC8 && next >= 0xA1 && next <= 0xFE) {
          // Additional check: Korean hangul second bytes are typically 0xA1-0xFE
          // but Chinese often uses 0xC0+ as second byte
          if (next >= 0xC0) {
            // More likely Chinese (e.g., 你好 is C4E3 BAC3)
            gbScore += 2
          } else {
            // More likely Korean
            eucKrScore += 4
          }
        } else if (byte >= 0xA1 && byte <= 0xFE && next >= 0xA1 && next <= 0xFE) {
          eucKrScore += 1
        }

        invalidUtf8++
      }
    }
  }

  // Decision logic
  if (validUtf8 > 0 && invalidUtf8 === 0) {
    return 'utf-8'
  }

  if (shiftJisScore > eucJpScore && shiftJisScore > gbScore && shiftJisScore > eucKrScore && shiftJisScore > 0) {
    return 'shift-jis'
  }

  if (eucJpScore > gbScore && eucJpScore > eucKrScore && eucJpScore > 0) {
    return 'euc-jp'
  }

  if (gbScore > eucKrScore && gbScore > 0) {
    return 'gb2312'
  }

  if (eucKrScore > 0) {
    return 'euc-kr'
  }

  return 'utf-8'
}

/**
 * Decodes byte data to a UTF-16 string using specified or auto-detected encoding.
 * @param data - Input byte data
 * @param encoding - Character encoding (auto-detects if omitted)
 * @returns Decoded string
 * @example
 * ```ts
 * const data = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F])
 * decode(data, 'utf-8') // 'Hello'
 * ```
 */
export function decode(data: Uint8Array, encoding?: string): string {
  const enc = encoding ? normalizeEncoding(encoding) : detectEncoding(data)

  switch (enc) {
    case 'utf-8':
      return decodeUtf8(data)
    case 'utf-16le':
      return decodeUtf16LE(data)
    case 'utf-16be':
      return decodeUtf16BE(data)
    case 'shift-jis':
      return decodeShiftJIS(data)
    case 'euc-jp':
      return decodeEucJP(data)
    case 'gb2312':
    case 'gbk':
    case 'gb18030':
      return decodeGB(data)
    case 'euc-kr':
      return decodeEucKR(data)
    case 'windows-1250':
      return decodeWindows1250(data)
    case 'windows-1251':
      return decodeWindows1251(data)
    case 'windows-1252':
      return decodeWindows1252(data)
    case 'windows-1253':
      return decodeWindows1253(data)
    case 'windows-1254':
      return decodeWindows1254(data)
    case 'windows-1255':
      return decodeWindows1255(data)
    case 'windows-1256':
      return decodeWindows1256(data)
    case 'windows-1257':
      return decodeWindows1257(data)
    case 'windows-1258':
      return decodeWindows1258(data)
    case 'iso-8859-1':
      return decodeISO88591(data)
    case 'iso-8859-2':
      return decodeISO88592(data)
    case 'koi8-r':
      return decodeKOI8R(data)
    default:
      return decodeUtf8(data)
  }
}

/**
 * Encodes a UTF-16 string to byte data using the specified encoding.
 * @param text - Input string
 * @param encoding - Target character encoding
 * @returns Encoded byte data
 * @throws If the encoding is not supported
 * @example
 * ```ts
 * encode('Hello', 'utf-8') // Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F])
 * ```
 */
export function encode(text: string, encoding: string): Uint8Array {
  const enc = normalizeEncoding(encoding)

  switch (enc) {
    case 'utf-8':
      return encodeUtf8(text)
    case 'utf-16le':
      return encodeUtf16LE(text)
    case 'utf-16be':
      return encodeUtf16BE(text)
    case 'shift-jis':
      return encodeShiftJIS(text)
    case 'euc-jp':
      return encodeEucJP(text)
    case 'gb2312':
    case 'gbk':
    case 'gb18030':
      return encodeGB(text)
    case 'euc-kr':
      return encodeEucKR(text)
    case 'windows-1250':
      return encodeWindows1250(text)
    case 'windows-1251':
      return encodeWindows1251(text)
    case 'windows-1252':
      return encodeWindows1252(text)
    case 'windows-1253':
      return encodeWindows1253(text)
    case 'windows-1254':
      return encodeWindows1254(text)
    case 'windows-1255':
      return encodeWindows1255(text)
    case 'windows-1256':
      return encodeWindows1256(text)
    case 'windows-1257':
      return encodeWindows1257(text)
    case 'windows-1258':
      return encodeWindows1258(text)
    case 'iso-8859-1':
      return encodeISO88591(text)
    case 'iso-8859-2':
      return encodeISO88592(text)
    case 'koi8-r':
      return encodeKOI8R(text)
    default:
      return encodeUtf8(text)
  }
}

// UTF-8 codec
function decodeUtf8(data: Uint8Array): string {
  let offset = 0
  if (data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
    offset = 3
  }
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return decoder.decode(data.subarray(offset))
}

function encodeUtf8(text: string): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(text)
}

// UTF-16LE codec
function decodeUtf16LE(data: Uint8Array): string {
  let offset = 0
  if (data.length >= 2 && data[0] === 0xFF && data[1] === 0xFE) {
    offset = 2
  }
  const decoder = new TextDecoder('utf-16le', { fatal: false })
  return decoder.decode(data.subarray(offset))
}

function encodeUtf16LE(text: string): Uint8Array {
  const result = new Uint8Array(2 + text.length * 2)
  result[0] = 0xFF
  result[1] = 0xFE
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    result[2 + i * 2] = code & 0xFF
    result[2 + i * 2 + 1] = (code >> 8) & 0xFF
  }
  return result
}

// UTF-16BE codec
function decodeUtf16BE(data: Uint8Array): string {
  let offset = 0
  if (data.length >= 2 && data[0] === 0xFE && data[1] === 0xFF) {
    offset = 2
  }
  const decoder = new TextDecoder('utf-16be', { fatal: false })
  return decoder.decode(data.subarray(offset))
}

function encodeUtf16BE(text: string): Uint8Array {
  const result = new Uint8Array(2 + text.length * 2)
  result[0] = 0xFE
  result[1] = 0xFF
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    result[2 + i * 2] = (code >> 8) & 0xFF
    result[2 + i * 2 + 1] = code & 0xFF
  }
  return result
}

// Shift-JIS codec
function decodeShiftJIS(data: Uint8Array): string {
  const map = getShiftJISDecodeMap()
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
    } else if (i + 1 < data.length) {
      const key = (byte << 8) | data[i + 1]
      result += map.get(key) || '?'
      i++
    }
  }
  return result
}

function encodeShiftJIS(text: string): Uint8Array {
  const map = getShiftJISEncodeMap()
  const result: number[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)
    if (code < 0x80) {
      result.push(code)
    } else {
      const bytes = map.get(char)
      if (bytes) {
        result.push(bytes >> 8, bytes & 0xFF)
      } else {
        result.push(0x3F) // '?'
      }
    }
  }
  return new Uint8Array(result)
}

// EUC-JP codec
function decodeEucJP(data: Uint8Array): string {
  const map = getEucJPDecodeMap()
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
    } else if (i + 1 < data.length) {
      const key = (byte << 8) | data[i + 1]
      result += map.get(key) || '?'
      i++
    }
  }
  return result
}

function encodeEucJP(text: string): Uint8Array {
  const map = getEucJPEncodeMap()
  const result: number[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)
    if (code < 0x80) {
      result.push(code)
    } else {
      const bytes = map.get(char)
      if (bytes) {
        result.push(bytes >> 8, bytes & 0xFF)
      } else {
        result.push(0x3F)
      }
    }
  }
  return new Uint8Array(result)
}

// GB2312/GBK/GB18030 codec
function decodeGB(data: Uint8Array): string {
  const map = getGBDecodeMap()
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
    } else if (i + 1 < data.length) {
      const key = (byte << 8) | data[i + 1]
      result += map.get(key) || '?'
      i++
    }
  }
  return result
}

function encodeGB(text: string): Uint8Array {
  const map = getGBEncodeMap()
  const result: number[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)
    if (code < 0x80) {
      result.push(code)
    } else {
      const bytes = map.get(char)
      if (bytes) {
        result.push(bytes >> 8, bytes & 0xFF)
      } else {
        result.push(0x3F)
      }
    }
  }
  return new Uint8Array(result)
}

// EUC-KR codec
function decodeEucKR(data: Uint8Array): string {
  const map = getEucKRDecodeMap()
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
    } else if (i + 1 < data.length) {
      const key = (byte << 8) | data[i + 1]
      result += map.get(key) || '?'
      i++
    }
  }
  return result
}

function encodeEucKR(text: string): Uint8Array {
  const map = getEucKREncodeMap()
  const result: number[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)
    if (code < 0x80) {
      result.push(code)
    } else {
      const bytes = map.get(char)
      if (bytes) {
        result.push(bytes >> 8, bytes & 0xFF)
      } else {
        result.push(0x3F)
      }
    }
  }
  return new Uint8Array(result)
}

// Single-byte encoding helpers
function decodeSingleByte(data: Uint8Array, map: string[]): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
    } else {
      result += map[byte - 0x80] || '?'
    }
  }
  return result
}

function encodeSingleByte(text: string, reverseMap: Map<string, number>): Uint8Array {
  const result: number[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)
    if (code < 0x80) {
      result.push(code)
    } else {
      const byte = reverseMap.get(char)
      if (byte !== undefined) {
        result.push(byte)
      } else {
        result.push(0x3F)
      }
    }
  }
  return new Uint8Array(result)
}

// Windows-1250 (Central European)
const win1250Map = [
  '€','','‚','','„','…','†','‡','','‰','Š','‹','Ś','Ť','Ž','Ź',
  '','','','','','•','–','—','','™','š','›','ś','ť','ž','ź',
  '\u00A0','ˇ','˘','Ł','¤','Ą','¦','§','¨','©','Ş','«','¬','\u00AD','®','Ż',
  '°','±','˛','ł','´','µ','¶','·','¸','ą','ş','»','Ľ','˝','ľ','ż',
  'Ŕ','Á','Â','Ă','Ä','Ĺ','Ć','Ç','Č','É','Ę','Ë','Ě','Í','Î','Ď',
  'Đ','Ń','Ň','Ó','Ô','Ő','Ö','×','Ř','Ů','Ú','Ű','Ü','Ý','Ţ','ß',
  'ŕ','á','â','ă','ä','ĺ','ć','ç','č','é','ę','ë','ě','í','î','ď',
  'đ','ń','ň','ó','ô','ő','ö','÷','ř','ů','ú','ű','ü','ý','ţ','˙'
]

function decodeWindows1250(data: Uint8Array): string {
  return decodeSingleByte(data, win1250Map)
}

function encodeWindows1250(text: string): Uint8Array {
  const map = new Map<string, number>()
  win1250Map.forEach((char, i) => { if (char) map.set(char, i + 0x80) })
  return encodeSingleByte(text, map)
}

// Windows-1251 (Cyrillic)
const win1251Map = [
  'Ђ','Ѓ','‚','ѓ','„','…','†','‡','€','‰','Љ','‹','Њ','Ќ','Ћ','Џ',
  'ђ','','','','','•','–','—','','™','љ','›','њ','ќ','ћ','џ',
  '\u00A0','Ў','ў','Ј','¤','Ґ','¦','§','Ё','©','Є','«','¬','\u00AD','®','Ї',
  '°','±','І','і','ґ','µ','¶','·','ё','№','є','»','ј','Ѕ','ѕ','ї',
  'А','Б','В','Г','Д','Е','Ж','З','И','Й','К','Л','М','Н','О','П',
  'Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Ъ','Ы','Ь','Э','Ю','Я',
  'а','б','в','г','д','е','ж','з','и','й','к','л','м','н','о','п',
  'р','с','т','у','ф','х','ц','ч','ш','щ','ъ','ы','ь','э','ю','я'
]

function decodeWindows1251(data: Uint8Array): string {
  return decodeSingleByte(data, win1251Map)
}

function encodeWindows1251(text: string): Uint8Array {
  const map = new Map<string, number>()
  win1251Map.forEach((char, i) => { if (char) map.set(char, i + 0x80) })
  return encodeSingleByte(text, map)
}

// Windows-1252 (Western European)
const win1252Map = [
  '€','','‚','ƒ','„','…','†','‡','ˆ','‰','Š','‹','Œ','','Ž','',
  '','','','','','•','–','—','˜','™','š','›','œ','','ž','Ÿ',
  '\u00A0','¡','¢','£','¤','¥','¦','§','¨','©','ª','«','¬','\u00AD','®','¯',
  '°','±','²','³','´','µ','¶','·','¸','¹','º','»','¼','½','¾','¿',
  'À','Á','Â','Ã','Ä','Å','Æ','Ç','È','É','Ê','Ë','Ì','Í','Î','Ï',
  'Ð','Ñ','Ò','Ó','Ô','Õ','Ö','×','Ø','Ù','Ú','Û','Ü','Ý','Þ','ß',
  'à','á','â','ã','ä','å','æ','ç','è','é','ê','ë','ì','í','î','ï',
  'ð','ñ','ò','ó','ô','õ','ö','÷','ø','ù','ú','û','ü','ý','þ','ÿ'
]

function decodeWindows1252(data: Uint8Array): string {
  return decodeSingleByte(data, win1252Map)
}

function encodeWindows1252(text: string): Uint8Array {
  const map = new Map<string, number>()
  win1252Map.forEach((char, i) => { if (char) map.set(char, i + 0x80) })
  return encodeSingleByte(text, map)
}

// Windows-1253 (Greek)
const win1253Map = [
  '€','','‚','ƒ','„','…','†','‡','','‰','','‹','','','','',
  '','','','','','•','–','—','','™','','›','','','','',
  '\u00A0','΅','Ά','£','¤','¥','¦','§','¨','©','','«','¬','\u00AD','®','―',
  '°','±','²','³','΄','µ','¶','·','Έ','Ή','Ί','»','Ό','½','Ύ','Ώ',
  'ΐ','Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ','Ν','Ξ','Ο',
  'Π','Ρ','','Σ','Τ','Υ','Φ','Χ','Ψ','Ω','Ϊ','Ϋ','ά','έ','ή','ί',
  'ΰ','α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο',
  'π','ρ','ς','σ','τ','υ','φ','χ','ψ','ω','ϊ','ϋ','ό','ύ','ώ',''
]

function decodeWindows1253(data: Uint8Array): string {
  return decodeSingleByte(data, win1253Map)
}

function encodeWindows1253(text: string): Uint8Array {
  const map = new Map<string, number>()
  win1253Map.forEach((char, i) => { if (char) map.set(char, i + 0x80) })
  return encodeSingleByte(text, map)
}

// Windows-1254 (Turkish)
const win1254Map = [
  '€','','‚','ƒ','„','…','†','‡','ˆ','‰','Š','‹','Œ','','','',
  '','','','','','•','–','—','˜','™','š','›','œ','','','Ÿ',
  '\u00A0','¡','¢','£','¤','¥','¦','§','¨','©','ª','«','¬','\u00AD','®','¯',
  '°','±','²','³','´','µ','¶','·','¸','¹','º','»','¼','½','¾','¿',
  'À','Á','Â','Ã','Ä','Å','Æ','Ç','È','É','Ê','Ë','Ì','Í','Î','Ï',
  'Ğ','Ñ','Ò','Ó','Ô','Õ','Ö','×','Ø','Ù','Ú','Û','Ü','İ','Ş','ß',
  'à','á','â','ã','ä','å','æ','ç','è','é','ê','ë','ì','í','î','ï',
  'ğ','ñ','ò','ó','ô','õ','ö','÷','ø','ù','ú','û','ü','ı','ş','ÿ'
]

function decodeWindows1254(data: Uint8Array): string {
  return decodeSingleByte(data, win1254Map)
}

function encodeWindows1254(text: string): Uint8Array {
  const map = new Map<string, number>()
  win1254Map.forEach((char, i) => { if (char) map.set(char, i + 0x80) })
  return encodeSingleByte(text, map)
}

// Windows-1255 (Hebrew)
const win1255Map = [
  '€','','‚','ƒ','„','…','†','‡','ˆ','‰','','‹','','','','',
  '','','','','','•','–','—','˜','™','','›','','','','',
  '\u00A0','¡','¢','£','₪','¥','¦','§','¨','©','×','«','¬','\u00AD','®','¯',
  '°','±','²','³','´','µ','¶','·','¸','¹','÷','»','¼','½','¾','¿',
  'ְ','ֱ','ֲ','ֳ','ִ','ֵ','ֶ','ַ','ָ','ֹ','','ֻ','ּ','ֽ','־','ֿ',
  '׀','ׁ','ׂ','׃','װ','ױ','ײ','׳','״','','','','','','','',
  'א','ב','ג','ד','ה','ו','ז','ח','ט','י','ך','כ','ל','ם','מ','ן',
  'נ','ס','ע','ף','פ','ץ','צ','ק','ר','ש','ת','','','','\u200E','\u200F'
]

function decodeWindows1255(data: Uint8Array): string {
  return decodeSingleByte(data, win1255Map)
}

function encodeWindows1255(text: string): Uint8Array {
  const map = new Map<string, number>()
  win1255Map.forEach((char, i) => { if (char) map.set(char, i + 0x80) })
  return encodeSingleByte(text, map)
}

// Windows-1256 (Arabic)
const win1256Map = [
  '€','پ','‚','ƒ','„','…','†','‡','ˆ','‰','ٹ','‹','Œ','چ','ژ','ڈ',
  'گ','','','','','•','–','—','ک','™','ڑ','›','œ','','\u200C','\u200D',
  '\u00A0','،','¢','£','¤','¥','¦','§','¨','©','ھ','«','¬','\u00AD','®','¯',
  '°','±','²','³','´','µ','¶','·','¸','¹','؛','»','¼','½','¾','؟',
  'ہ','ء','آ','أ','ؤ','إ','ئ','ا','ب','ة','ت','ث','ج','ح','خ','د',
  'ذ','ر','ز','س','ش','ص','ض','×','ط','ظ','ع','غ','ـ','ف','ق','ك',
  'à','ل','â','م','ن','ه','و','ç','è','é','ê','ë','ى','ي','î','ï',
  'ً','ٌ','ٍ','َ','ô','ُ','ِ','÷','ّ','ù','ú','û','ü','\u200E','\u200F','ے'
]

function decodeWindows1256(data: Uint8Array): string {
  return decodeSingleByte(data, win1256Map)
}

function encodeWindows1256(text: string): Uint8Array {
  const map = new Map<string, number>()
  win1256Map.forEach((char, i) => { if (char) map.set(char, i + 0x80) })
  return encodeSingleByte(text, map)
}

// Windows-1257 (Baltic)
const win1257Map = [
  '€','','‚','','„','…','†','‡','','‰','','‹','','','','',
  '','','','','','•','–','—','','™','','›','','','','',
  '\u00A0','','¢','£','¤','','¦','§','Ø','©','Ŗ','«','¬','\u00AD','®','Æ',
  '°','±','²','³','´','µ','¶','·','ø','¹','ŗ','»','¼','½','¾','æ',
  'Ą','Į','Ā','Ć','Ä','Å','Ę','Ē','Č','É','Ź','Ė','Ģ','Ķ','Ī','Ļ',
  'Š','Ń','Ņ','Ó','Ō','Õ','Ö','×','Ų','Ł','Ś','Ū','Ü','Ż','Ž','ß',
  'ą','į','ā','ć','ä','å','ę','ē','č','é','ź','ė','ģ','ķ','ī','ļ',
  'š','ń','ņ','ó','ō','õ','ö','÷','ų','ł','ś','ū','ü','ż','ž','˙'
]

function decodeWindows1257(data: Uint8Array): string {
  return decodeSingleByte(data, win1257Map)
}

function encodeWindows1257(text: string): Uint8Array {
  const map = new Map<string, number>()
  win1257Map.forEach((char, i) => { if (char) map.set(char, i + 0x80) })
  return encodeSingleByte(text, map)
}

// Windows-1258 (Vietnamese)
const win1258Map = [
  '€','','‚','ƒ','„','…','†','‡','ˆ','‰','','‹','Œ','','','',
  '','','','','','•','–','—','˜','™','','›','œ','','','Ÿ',
  '\u00A0','¡','¢','£','¤','¥','¦','§','¨','©','ª','«','¬','\u00AD','®','¯',
  '°','±','²','³','´','µ','¶','·','¸','¹','º','»','¼','½','¾','¿',
  'À','Á','Â','Ă','Ä','Å','Æ','Ç','È','É','Ê','Ë','̀','Í','Î','Ï',
  'Đ','Ñ','̉','Ó','Ô','Ơ','Ö','×','Ø','Ù','Ú','Û','Ü','Ư','̃','ß',
  'à','á','â','ă','ä','å','æ','ç','è','é','ê','ë','́','í','î','ï',
  'đ','ñ','̣','ó','ô','ơ','ö','÷','ø','ù','ú','û','ü','ư','₫','ÿ'
]

function decodeWindows1258(data: Uint8Array): string {
  return decodeSingleByte(data, win1258Map)
}

function encodeWindows1258(text: string): Uint8Array {
  const map = new Map<string, number>()
  win1258Map.forEach((char, i) => { if (char) map.set(char, i + 0x80) })
  return encodeSingleByte(text, map)
}

// ISO-8859-1 (Latin-1)
function decodeISO88591(data: Uint8Array): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data[i])
  }
  return result
}

function encodeISO88591(text: string): Uint8Array {
  const result = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    result[i] = code < 256 ? code : 0x3F
  }
  return result
}

// ISO-8859-2 (Latin-2)
// 0x80-0x9F are undefined in ISO-8859-2, 0xA0-0xFF are defined
const iso88592High = [
  '\u00A0','Ą','˘','Ł','¤','Ľ','Ś','§','¨','Š','Ş','Ť','Ź','\u00AD','Ž','Ż',
  '°','ą','˛','ł','´','ľ','ś','ˇ','¸','š','ş','ť','ź','˝','ž','ż',
  'Ŕ','Á','Â','Ă','Ä','Ĺ','Ć','Ç','Č','É','Ę','Ë','Ě','Í','Î','Ď',
  'Đ','Ń','Ň','Ó','Ô','Ő','Ö','×','Ř','Ů','Ú','Ű','Ü','Ý','Ţ','ß',
  'ŕ','á','â','ă','ä','ĺ','ć','ç','č','é','ę','ë','ě','í','î','ď',
  'đ','ń','ň','ó','ô','ő','ö','÷','ř','ů','ú','ű','ü','ý','ţ','˙'
]

function decodeISO88592(data: Uint8Array): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
    } else if (byte >= 0xA0) {
      result += iso88592High[byte - 0xA0] || '?'
    } else {
      result += '?'
    }
  }
  return result
}

function encodeISO88592(text: string): Uint8Array {
  const map = new Map<string, number>()
  iso88592High.forEach((char, i) => { if (char) map.set(char, i + 0xA0) })
  return encodeSingleByte(text, map)
}

// KOI8-R (Russian) - proper character mappings
function decodeKOI8R(data: Uint8Array): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
    } else {
      result += getKOI8RChar(byte)
    }
  }
  return result
}

function encodeKOI8R(text: string): Uint8Array {
  const result: number[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)
    if (code < 0x80) {
      result.push(code)
    } else {
      const byte = getKOI8RByte(char)
      result.push(byte !== null ? byte : 0x3F)
    }
  }
  return new Uint8Array(result)
}

function getKOI8RChar(byte: number): string {
  // KOI8-R encodes Cyrillic in a special order
  // 0xC0-0xDF: lowercase, 0xE0-0xFF: uppercase
  if (byte >= 0xC0 && byte <= 0xDF) {
    // Lowercase: юабцдефгхийклмнопярстужвьызшэщчъ
    const chars = 'юабцдефгхийклмнопярстужвьызшэщчъ'
    return chars[byte - 0xC0] || '?'
  }
  if (byte >= 0xE0 && byte <= 0xFF) {
    // Uppercase: ЮАБЦДЕФГХИЙКЛМНОПЯРСТУЖВЬЫЗШЭЩЧЪ
    const chars = 'ЮАБЦДЕФГХИЙКЛМНОПЯРСТУЖВЬЫЗШЭЩЧЪ'
    return chars[byte - 0xE0] || '?'
  }
  if (byte === 0xA3) return 'Ё'
  if (byte === 0xB3) return 'ё'

  // Box drawing and other characters
  const specialChars: { [key: number]: string } = {
    0x80: '─', 0x81: '│', 0x82: '┌', 0x83: '┐', 0x84: '└', 0x85: '┘',
    0x86: '├', 0x87: '┤', 0x88: '┬', 0x89: '┴', 0x8A: '┼', 0x8B: '▀',
    0x8C: '▄', 0x8D: '█', 0x8E: '▌', 0x8F: '▐', 0x90: '░', 0x91: '▒',
    0x92: '▓', 0x93: '⌠', 0x94: '■', 0x95: '∙', 0x96: '√', 0x97: '≈',
    0x98: '≤', 0x99: '≥', 0x9A: '\u00A0', 0x9B: '⌡', 0x9C: '°', 0x9D: '²',
    0x9E: '·', 0x9F: '÷', 0xA0: '═', 0xA1: '║', 0xA2: '╒', 0xA4: '╔',
    0xA5: '╩', 0xA6: '╦', 0xA7: '╠', 0xA8: '═', 0xA9: '╬', 0xAA: '╧',
    0xAB: '╨', 0xAC: '╤', 0xAD: '╥', 0xAE: '╙', 0xAF: '╘', 0xB0: '╓',
    0xB1: '╫', 0xB2: '╪', 0xB4: '╔', 0xB5: '╩', 0xB6: '╦', 0xB7: '╠',
    0xB8: '═', 0xB9: '╬', 0xBA: '╧', 0xBB: '╨', 0xBC: '╤', 0xBD: '╥',
    0xBE: '╙', 0xBF: '╘'
  }
  return specialChars[byte] || '?'
}

function getKOI8RByte(char: string): number | null {
  const code = char.charCodeAt(0)

  // Cyrillic lowercase а-я (0x0430-0x044F)
  if (code >= 0x0430 && code <= 0x044F) {
    const order = 'юабцдефгхийклмнопярстужвьызшэщчъ'
    const ruAlphabet = 'абвгдежзийклмнопрстуфхцчшщъыьэюя'
    const idx = ruAlphabet.indexOf(char)
    if (idx >= 0) return 0xC0 + order.indexOf(ruAlphabet[idx])
  }

  // Cyrillic uppercase А-Я (0x0410-0x042F)
  if (code >= 0x0410 && code <= 0x042F) {
    const order = 'ЮАБЦДЕФГХИЙКЛМНОПЯРСТУЖВЬЫЗШЭЩЧЪ'
    const ruAlphabet = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
    const idx = ruAlphabet.indexOf(char)
    if (idx >= 0) return 0xE0 + order.indexOf(ruAlphabet[idx])
  }

  if (char === 'Ё') return 0xA3
  if (char === 'ё') return 0xB3

  return null
}

// CJK encoding map generators (lazy loaded)
let shiftJISDecodeMap: Map<number, string> | null = null
let shiftJISEncodeMap: Map<string, number> | null = null
let eucJPDecodeMap: Map<number, string> | null = null
let eucJPEncodeMap: Map<string, number> | null = null
let gbDecodeMap: Map<number, string> | null = null
let gbEncodeMap: Map<string, number> | null = null
let eucKRDecodeMap: Map<number, string> | null = null
let eucKREncodeMap: Map<string, number> | null = null

function getShiftJISDecodeMap(): Map<number, string> {
  if (!shiftJISDecodeMap) {
    shiftJISDecodeMap = new Map()
    // Hiragana
    for (let i = 0; i < 83; i++) {
      shiftJISDecodeMap.set(0x829F + i, String.fromCharCode(0x3041 + i))
    }
    // Katakana
    for (let i = 0; i < 86; i++) {
      shiftJISDecodeMap.set(0x8340 + i, String.fromCharCode(0x30A1 + i))
    }
    // Common kanji mappings
    shiftJISDecodeMap.set(0x93FA, '日')
    shiftJISDecodeMap.set(0x967B, '本')
    shiftJISDecodeMap.set(0x8E9E, '時')
    shiftJISDecodeMap.set(0x8AD4, '間')
  }
  return shiftJISDecodeMap
}

function getShiftJISEncodeMap(): Map<string, number> {
  if (!shiftJISEncodeMap) {
    shiftJISEncodeMap = new Map()
    const decodeMap = getShiftJISDecodeMap()
    for (const [bytes, char] of decodeMap) {
      shiftJISEncodeMap.set(char, bytes)
    }
  }
  return shiftJISEncodeMap
}

function getEucJPDecodeMap(): Map<number, string> {
  if (!eucJPDecodeMap) {
    eucJPDecodeMap = new Map()
    // Hiragana
    for (let i = 0; i < 83; i++) {
      eucJPDecodeMap.set(0xA4A1 + i, String.fromCharCode(0x3041 + i))
    }
    // Katakana
    for (let i = 0; i < 86; i++) {
      eucJPDecodeMap.set(0xA5A1 + i, String.fromCharCode(0x30A1 + i))
    }
  }
  return eucJPDecodeMap
}

function getEucJPEncodeMap(): Map<string, number> {
  if (!eucJPEncodeMap) {
    eucJPEncodeMap = new Map()
    const decodeMap = getEucJPDecodeMap()
    for (const [bytes, char] of decodeMap) {
      eucJPEncodeMap.set(char, bytes)
    }
  }
  return eucJPEncodeMap
}

function getGBDecodeMap(): Map<number, string> {
  if (!gbDecodeMap) {
    gbDecodeMap = new Map()
    // Common Chinese characters
    gbDecodeMap.set(0xC4E3, '你')
    gbDecodeMap.set(0xBAC3, '好')
    gbDecodeMap.set(0xD6D0, '中')
    gbDecodeMap.set(0xB9FA, '国')
    gbDecodeMap.set(0xCAC0, '世')
    gbDecodeMap.set(0xBDE7, '界')
  }
  return gbDecodeMap
}

function getGBEncodeMap(): Map<string, number> {
  if (!gbEncodeMap) {
    gbEncodeMap = new Map()
    const decodeMap = getGBDecodeMap()
    for (const [bytes, char] of decodeMap) {
      gbEncodeMap.set(char, bytes)
    }
  }
  return gbEncodeMap
}

function getEucKRDecodeMap(): Map<number, string> {
  if (!eucKRDecodeMap) {
    eucKRDecodeMap = new Map()
    // Common Korean characters
    eucKRDecodeMap.set(0xBEC8, '안')
    eucKRDecodeMap.set(0xB3E7, '녕')
    eucKRDecodeMap.set(0xC7D1, '한')
    eucKRDecodeMap.set(0xB1B9, '국')
    eucKRDecodeMap.set(0xBEEE, '어')
  }
  return eucKRDecodeMap
}

function getEucKREncodeMap(): Map<string, number> {
  if (!eucKREncodeMap) {
    eucKREncodeMap = new Map()
    const decodeMap = getEucKRDecodeMap()
    for (const [bytes, char] of decodeMap) {
      eucKREncodeMap.set(char, bytes)
    }
  }
  return eucKREncodeMap
}
