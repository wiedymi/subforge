import type { SubtitleDocument } from './types.ts'

export interface ParseOptions {
  onError: 'throw' | 'skip' | 'collect'
  strict?: boolean
  encoding?: 'utf-8' | 'utf-16le' | 'utf-16be' | 'shift-jis' | 'auto'
  preserveOrder?: boolean
}

export interface ParseResult {
  document: SubtitleDocument
  errors: ParseError[]
  warnings: ParseWarning[]
}

export interface ParseError {
  line: number
  column: number
  code: ErrorCode
  message: string
  raw?: string
}

export interface ParseWarning {
  line: number
  message: string
}

export type ErrorCode =
  | 'INVALID_TIMESTAMP'
  | 'UNCLOSED_TAG'
  | 'UNKNOWN_STYLE'
  | 'MALFORMED_EVENT'
  | 'INVALID_COLOR'
  | 'INVALID_SECTION'
  | 'MISSING_FIELD'
  | 'INVALID_ENCODING'
  | 'DUPLICATE_STYLE'
  | 'DUPLICATE_ID'

export class SubforgeError extends Error {
  code: ErrorCode
  line: number
  column: number

  constructor(code: ErrorCode, message: string, position: { line: number; column: number }) {
    super(`[${code}] ${message} at line ${position.line}, column ${position.column}`)
    this.name = 'SubforgeError'
    this.code = code
    this.line = position.line
    this.column = position.column
  }
}

export function detectEncoding(buffer: Uint8Array): string {
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) return 'utf-8'
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) return 'utf-16le'
  if (buffer[0] === 0xFE && buffer[1] === 0xFF) return 'utf-16be'
  return 'utf-8'
}
