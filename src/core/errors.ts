import type { SubtitleDocument } from './types.ts'

/**
 * Options for parsing subtitle files.
 */
export interface ParseOptions {
  /** How to handle parse errors: throw exception, skip invalid entries, or collect errors */
  onError: 'throw' | 'skip' | 'collect'
  /** Enable strict validation of format compliance */
  strict?: boolean
  /** Character encoding (auto-detects if not specified) */
  encoding?: 'utf-8' | 'utf-16le' | 'utf-16be' | 'shift-jis' | 'auto'
  /** Preserve original event ordering instead of sorting by time */
  preserveOrder?: boolean
}

/**
 * Result of parsing a subtitle file.
 */
export interface ParseResult {
  /** Parsed subtitle document */
  document: SubtitleDocument
  /** Errors encountered during parsing */
  errors: ParseError[]
  /** Non-fatal warnings about the input */
  warnings: ParseWarning[]
}

/**
 * A parse error with location information.
 */
export interface ParseError {
  /** Line number where error occurred (1-indexed) */
  line: number
  /** Column number where error occurred (1-indexed) */
  column: number
  /** Error code identifier */
  code: ErrorCode
  /** Human-readable error message */
  message: string
  /** Raw input that caused the error */
  raw?: string
}

/**
 * A non-fatal warning encountered during parsing.
 */
export interface ParseWarning {
  /** Line number where warning occurred (1-indexed) */
  line: number
  /** Human-readable warning message */
  message: string
}

/**
 * Categorized error codes for parse failures.
 */
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

/**
 * Subforge-specific error with parse location.
 */
export class SubforgeError extends Error {
  /** Error code identifier */
  code: ErrorCode
  /** Line number where error occurred */
  line: number
  /** Column number where error occurred */
  column: number

  /**
   * Creates a new SubforgeError.
   * @param code - Error code identifier
   * @param message - Human-readable error message
   * @param position - Line and column where error occurred
   */
  constructor(code: ErrorCode, message: string, position: { line: number; column: number }) {
    super(`[${code}] ${message} at line ${position.line}, column ${position.column}`)
    this.name = 'SubforgeError'
    this.code = code
    this.line = position.line
    this.column = position.column
  }
}
