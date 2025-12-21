import { test, expect, describe } from 'bun:test'
import { detectEncoding, decode, encode } from '../../src/core/encoding.ts'

describe('BOM detection', () => {
  test('detects UTF-8 BOM', () => {
    const buffer = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F])
    expect(detectEncoding(buffer)).toBe('utf-8')
  })

  test('detects UTF-16LE BOM', () => {
    const buffer = new Uint8Array([0xFF, 0xFE, 0x48, 0x00, 0x65, 0x00])
    expect(detectEncoding(buffer)).toBe('utf-16le')
  })

  test('detects UTF-16BE BOM', () => {
    const buffer = new Uint8Array([0xFE, 0xFF, 0x00, 0x48, 0x00, 0x65])
    expect(detectEncoding(buffer)).toBe('utf-16be')
  })
})

describe('UTF-8 encoding', () => {
  test('decodes UTF-8 without BOM', () => {
    const buffer = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F])
    expect(decode(buffer, 'utf-8')).toBe('Hello')
  })

  test('decodes UTF-8 with BOM', () => {
    const buffer = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F])
    expect(decode(buffer, 'utf-8')).toBe('Hello')
  })

  test('encodes UTF-8', () => {
    const text = 'Hello 世界'
    const buffer = encode(text, 'utf-8')
    expect(Array.from(buffer)).toEqual([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0xE4, 0xB8, 0x96, 0xE7, 0x95, 0x8C])
  })

  test('round-trip UTF-8', () => {
    const text = 'Hello World! 你好世界 こんにちは 안녕하세요'
    const encoded = encode(text, 'utf-8')
    const decoded = decode(encoded, 'utf-8')
    expect(decoded).toBe(text)
  })
})

describe('UTF-16LE encoding', () => {
  test('decodes UTF-16LE with BOM', () => {
    const buffer = new Uint8Array([0xFF, 0xFE, 0x48, 0x00, 0x69, 0x00])
    expect(decode(buffer, 'utf-16le')).toBe('Hi')
  })

  test('decodes UTF-16LE without BOM', () => {
    const buffer = new Uint8Array([0x48, 0x00, 0x69, 0x00])
    expect(decode(buffer, 'utf-16le')).toBe('Hi')
  })

  test('encodes UTF-16LE', () => {
    const text = 'Hi'
    const buffer = encode(text, 'utf-16le')
    expect(Array.from(buffer)).toEqual([0xFF, 0xFE, 0x48, 0x00, 0x69, 0x00])
  })

  test('round-trip UTF-16LE', () => {
    const text = 'Hello 世界'
    const encoded = encode(text, 'utf-16le')
    const decoded = decode(encoded, 'utf-16le')
    expect(decoded).toBe(text)
  })
})

describe('UTF-16BE encoding', () => {
  test('decodes UTF-16BE with BOM', () => {
    const buffer = new Uint8Array([0xFE, 0xFF, 0x00, 0x48, 0x00, 0x69])
    expect(decode(buffer, 'utf-16be')).toBe('Hi')
  })

  test('decodes UTF-16BE without BOM', () => {
    const buffer = new Uint8Array([0x00, 0x48, 0x00, 0x69])
    expect(decode(buffer, 'utf-16be')).toBe('Hi')
  })

  test('encodes UTF-16BE', () => {
    const text = 'Hi'
    const buffer = encode(text, 'utf-16be')
    expect(Array.from(buffer)).toEqual([0xFE, 0xFF, 0x00, 0x48, 0x00, 0x69])
  })

  test('round-trip UTF-16BE', () => {
    const text = 'Hello 世界'
    const encoded = encode(text, 'utf-16be')
    const decoded = decode(encoded, 'utf-16be')
    expect(decoded).toBe(text)
  })
})

describe('Shift-JIS encoding', () => {
  test('decodes Shift-JIS hiragana', () => {
    const buffer = new Uint8Array([0x82, 0xA0, 0x82, 0xA2, 0x82, 0xA4]) // あいう
    expect(decode(buffer, 'shift-jis')).toBe('あいう')
  })

  test('decodes Shift-JIS katakana', () => {
    const buffer = new Uint8Array([0x83, 0x41, 0x83, 0x43, 0x83, 0x45]) // アイウ
    expect(decode(buffer, 'shift-jis')).toBe('アイウ')
  })

  test('decodes Shift-JIS kanji', () => {
    const buffer = new Uint8Array([0x93, 0xFA, 0x96, 0x7B]) // 日本
    expect(decode(buffer, 'shift-jis')).toBe('日本')
  })

  test('encodes Shift-JIS', () => {
    const text = 'あいう'
    const buffer = encode(text, 'shift-jis')
    expect(Array.from(buffer)).toEqual([0x82, 0xA0, 0x82, 0xA2, 0x82, 0xA4])
  })

  test('round-trip Shift-JIS', () => {
    const text = 'こんにちは日本'
    const encoded = encode(text, 'shift-jis')
    const decoded = decode(encoded, 'shift-jis')
    expect(decoded).toBe(text)
  })

  test('auto-detects Shift-JIS', () => {
    const buffer = new Uint8Array([0x82, 0xA0, 0x82, 0xA2, 0x82, 0xA4])
    expect(detectEncoding(buffer)).toBe('shift-jis')
  })
})

describe('EUC-JP encoding', () => {
  test('decodes EUC-JP hiragana', () => {
    const buffer = new Uint8Array([0xA4, 0xA2, 0xA4, 0xA4, 0xA4, 0xA6]) // あいう
    expect(decode(buffer, 'euc-jp')).toBe('あいう')
  })

  test('decodes EUC-JP katakana', () => {
    const buffer = new Uint8Array([0xA5, 0xA2, 0xA5, 0xA4, 0xA5, 0xA6]) // アイウ
    expect(decode(buffer, 'euc-jp')).toBe('アイウ')
  })

  test('encodes EUC-JP', () => {
    const text = 'あいう'
    const buffer = encode(text, 'euc-jp')
    expect(Array.from(buffer)).toEqual([0xA4, 0xA2, 0xA4, 0xA4, 0xA4, 0xA6])
  })

  test('round-trip EUC-JP', () => {
    const text = 'こんにちは'
    const encoded = encode(text, 'euc-jp')
    const decoded = decode(encoded, 'euc-jp')
    expect(decoded).toBe(text)
  })

  test('auto-detects EUC-JP', () => {
    const buffer = new Uint8Array([0xA4, 0xA2, 0xA4, 0xA4, 0xA4, 0xA6])
    expect(detectEncoding(buffer)).toBe('euc-jp')
  })
})

describe('GB2312/GBK/GB18030 encoding', () => {
  test('decodes GB2312', () => {
    const buffer = new Uint8Array([0xC4, 0xE3, 0xBA, 0xC3]) // 你好
    expect(decode(buffer, 'gb2312')).toBe('你好')
  })

  test('decodes GBK', () => {
    const buffer = new Uint8Array([0xC4, 0xE3, 0xBA, 0xC3])
    expect(decode(buffer, 'gbk')).toBe('你好')
  })

  test('decodes GB18030', () => {
    const buffer = new Uint8Array([0xC4, 0xE3, 0xBA, 0xC3])
    expect(decode(buffer, 'gb18030')).toBe('你好')
  })

  test('encodes GB2312', () => {
    const text = '你好'
    const buffer = encode(text, 'gb2312')
    expect(Array.from(buffer)).toEqual([0xC4, 0xE3, 0xBA, 0xC3])
  })

  test('round-trip GBK', () => {
    const text = '中国'
    const encoded = encode(text, 'gbk')
    const decoded = decode(encoded, 'gbk')
    expect(decoded).toBe(text)
  })

  test('auto-detects GB2312/GBK', () => {
    const buffer = new Uint8Array([0xC4, 0xE3, 0xBA, 0xC3])
    expect(detectEncoding(buffer)).toMatch(/gb2312|gbk|gb18030/)
  })
})

describe('EUC-KR encoding', () => {
  test('decodes EUC-KR', () => {
    const buffer = new Uint8Array([0xBE, 0xC8, 0xB3, 0xE7]) // 안녕
    expect(decode(buffer, 'euc-kr')).toBe('안녕')
  })

  test('encodes EUC-KR', () => {
    const text = '안녕'
    const buffer = encode(text, 'euc-kr')
    expect(Array.from(buffer)).toEqual([0xBE, 0xC8, 0xB3, 0xE7])
  })

  test('round-trip EUC-KR', () => {
    const text = '한국어'
    const encoded = encode(text, 'euc-kr')
    const decoded = decode(encoded, 'euc-kr')
    expect(decoded).toBe(text)
  })

  test('auto-detects EUC-KR', () => {
    const buffer = new Uint8Array([0xBE, 0xC8, 0xB3, 0xE7])
    // Note: Short samples may be ambiguous between GB and EUC-KR
    const detected = detectEncoding(buffer)
    expect(['euc-kr', 'gb2312', 'gbk', 'gb18030']).toContain(detected)
  })
})

describe('Windows-1252 encoding', () => {
  test('decodes Windows-1252', () => {
    const buffer = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0xE9]) // Hello é
    expect(decode(buffer, 'windows-1252')).toBe('Hello é')
  })

  test('encodes Windows-1252', () => {
    const text = 'Café'
    const buffer = encode(text, 'windows-1252')
    expect(Array.from(buffer)).toEqual([0x43, 0x61, 0x66, 0xE9])
  })

  test('round-trip Windows-1252', () => {
    const text = 'résumé'
    const encoded = encode(text, 'windows-1252')
    const decoded = decode(encoded, 'windows-1252')
    expect(decoded).toBe(text)
  })
})

describe('Windows-1251 encoding', () => {
  test('decodes Windows-1251 Cyrillic', () => {
    const buffer = new Uint8Array([0xCF, 0xF0, 0xE8, 0xE2, 0xE5, 0xF2]) // Привет
    expect(decode(buffer, 'windows-1251')).toBe('Привет')
  })

  test('encodes Windows-1251', () => {
    const text = 'Привет'
    const buffer = encode(text, 'windows-1251')
    expect(Array.from(buffer)).toEqual([0xCF, 0xF0, 0xE8, 0xE2, 0xE5, 0xF2])
  })

  test('round-trip Windows-1251', () => {
    const text = 'Россия'
    const encoded = encode(text, 'windows-1251')
    const decoded = decode(encoded, 'windows-1251')
    expect(decoded).toBe(text)
  })
})

describe('KOI8-R encoding', () => {
  test('decodes KOI8-R Cyrillic', () => {
    const buffer = new Uint8Array([0xF0, 0xD2, 0xC9, 0xD7, 0xC5, 0xD4]) // Привет
    expect(decode(buffer, 'koi8-r')).toBe('Привет')
  })

  test('encodes KOI8-R', () => {
    const text = 'Привет'
    const buffer = encode(text, 'koi8-r')
    expect(Array.from(buffer)).toEqual([0xF0, 0xD2, 0xC9, 0xD7, 0xC5, 0xD4])
  })

  test('round-trip KOI8-R', () => {
    const text = 'Москва'
    const encoded = encode(text, 'koi8-r')
    const decoded = decode(encoded, 'koi8-r')
    expect(decoded).toBe(text)
  })
})

describe('ISO-8859-1 encoding', () => {
  test('decodes ISO-8859-1', () => {
    const buffer = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0xE9])
    expect(decode(buffer, 'iso-8859-1')).toBe('Hello é')
  })

  test('encodes ISO-8859-1', () => {
    const text = 'Café'
    const buffer = encode(text, 'iso-8859-1')
    expect(Array.from(buffer)).toEqual([0x43, 0x61, 0x66, 0xE9])
  })
})

describe('ISO-8859-2 encoding', () => {
  test('decodes ISO-8859-2', () => {
    const buffer = new Uint8Array([0xE8, 0xE9, 0xF8]) // čéř
    expect(decode(buffer, 'iso-8859-2')).toBe('čéř')
  })

  test('encodes ISO-8859-2', () => {
    const text = 'čéř'
    const buffer = encode(text, 'iso-8859-2')
    expect(Array.from(buffer)).toEqual([0xE8, 0xE9, 0xF8])
  })
})

describe('Auto-detection', () => {
  test('defaults to UTF-8 for ASCII', () => {
    const buffer = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F])
    expect(detectEncoding(buffer)).toBe('utf-8')
  })

  test('detects UTF-8 from multibyte sequences', () => {
    const buffer = new Uint8Array([0xE4, 0xB8, 0x96, 0xE7, 0x95, 0x8C]) // 世界
    expect(detectEncoding(buffer)).toBe('utf-8')
  })

  test('auto-decode works without explicit encoding', () => {
    const buffer = new Uint8Array([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F])
    expect(decode(buffer)).toBe('Hello')
  })
})

describe('Windows code pages', () => {
  test('decodes Windows-1250 (Central European)', () => {
    const buffer = new Uint8Array([0xE8, 0xE9, 0xF8]) // čéř in Windows-1250
    expect(decode(buffer, 'windows-1250')).toBe('čéř')
  })

  test('decodes Windows-1253 (Greek)', () => {
    const buffer = new Uint8Array([0xC1, 0xEB, 0xF6, 0xE1]) // Αλφα
    expect(decode(buffer, 'windows-1253')).toBe('Αλφα')
  })

  test('decodes Windows-1254 (Turkish)', () => {
    const buffer = new Uint8Array([0xD0, 0xDD, 0xDE, 0xFE])
    expect(decode(buffer, 'windows-1254')).toBe('ĞİŞş')
  })

  test('decodes Windows-1255 (Hebrew)', () => {
    const buffer = new Uint8Array([0xF9, 0xEC, 0xE5, 0xED]) // שלום
    expect(decode(buffer, 'windows-1255')).toBe('שלום')
  })

  test('decodes Windows-1256 (Arabic)', () => {
    const buffer = new Uint8Array([0xE3, 0xD1, 0xCD, 0xC8, 0xC7]) // مرحبا
    expect(decode(buffer, 'windows-1256')).toBe('مرحبا')
  })

  test('decodes Windows-1257 (Baltic)', () => {
    const buffer = new Uint8Array([0xE0, 0xE1, 0xE2, 0xE3])
    expect(decode(buffer, 'windows-1257')).toBe('ąįāć')
  })

  test('decodes Windows-1258 (Vietnamese)', () => {
    const buffer = new Uint8Array([0xE0, 0xE1, 0xE2, 0xE3])
    expect(decode(buffer, 'windows-1258')).toBe('àáâă')
  })
})

describe('Edge cases', () => {
  test('handles empty buffer', () => {
    const buffer = new Uint8Array([])
    expect(decode(buffer, 'utf-8')).toBe('')
    expect(detectEncoding(buffer)).toBe('utf-8')
  })

  test('handles BOM-only buffer', () => {
    const buffer = new Uint8Array([0xEF, 0xBB, 0xBF])
    expect(decode(buffer, 'utf-8')).toBe('')
  })

  test('handles invalid UTF-8 gracefully', () => {
    const buffer = new Uint8Array([0xFF, 0xFE, 0xFF])
    const result = decode(buffer, 'utf-8')
    expect(result).toBeDefined()
  })

  test('normalizes encoding names', () => {
    const buffer = new Uint8Array([0x48, 0x69])
    expect(decode(buffer, 'UTF-8')).toBe(decode(buffer, 'utf-8'))
    expect(decode(buffer, 'UTF8')).toBe(decode(buffer, 'utf-8'))
    expect(decode(buffer, 'Shift_JIS')).toBe(decode(buffer, 'shift-jis'))
  })
})
