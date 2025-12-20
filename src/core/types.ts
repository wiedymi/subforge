// === Document ===

export interface SubtitleDocument {
  info: ScriptInfo
  styles: Map<string, Style>
  events: SubtitleEvent[]
  comments: Comment[]

  // Embedded data (ASS-specific, preserved for roundtrip)
  fonts?: EmbeddedData[]
  graphics?: EmbeddedData[]

  // VTT-specific (preserved for roundtrip)
  regions?: VTTRegion[]
}

export interface ScriptInfo {
  title?: string
  author?: string
  playResX: number
  playResY: number
  scaleBorderAndShadow: boolean
  wrapStyle: 0 | 1 | 2 | 3
}

export interface Comment {
  text: string
  beforeEventIndex?: number
}

export interface EmbeddedData {
  name: string
  data: string
}

export interface VTTRegion {
  id: string
  width: string
  lines: number
  regionAnchor: string
  viewportAnchor: string
  scroll: 'up' | 'none'
}

// === Styles ===

export interface Style {
  name: string
  fontName: string
  fontSize: number
  primaryColor: number
  secondaryColor: number
  outlineColor: number
  backColor: number
  bold: boolean
  italic: boolean
  underline: boolean
  strikeout: boolean
  scaleX: number
  scaleY: number
  spacing: number
  angle: number
  borderStyle: 1 | 3
  outline: number
  shadow: number
  alignment: Alignment
  marginL: number
  marginR: number
  marginV: number
  encoding: number
}

export type Alignment = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// === Events ===

export interface SubtitleEvent {
  id: number
  start: number
  end: number
  layer: number
  style: string
  actor: string
  marginL: number
  marginR: number
  marginV: number
  effect: string

  text: string
  segments: TextSegment[]

  dirty: boolean
}

// === Text Segments ===

export interface TextSegment {
  text: string
  style: InlineStyle | null
  effects: Effect[]
}

export interface InlineStyle {
  fontName?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikeout?: boolean
  primaryColor?: number
  secondaryColor?: number
  outlineColor?: number
  backColor?: number
  alpha?: number
  pos?: [number, number]
  alignment?: Alignment
}

// === Effects ===

export interface Effect<T extends string = string, P = unknown> {
  type: T
  params: P
}

export type KaraokeEffect = Effect<'karaoke', {
  duration: number
  mode: 'fill' | 'fade' | 'outline'
}>

export type BlurEffect = Effect<'blur', { strength: number }>
export type BorderEffect = Effect<'border', { size: number }>
export type ShadowEffect = Effect<'shadow', { depth: number }>

export type ScaleEffect = Effect<'scale', { x: number; y: number }>
export type RotateEffect = Effect<'rotate', { x?: number; y?: number; z?: number }>
export type ShearEffect = Effect<'shear', { x?: number; y?: number }>
export type SpacingEffect = Effect<'spacing', { value: number }>

export type FadeEffect = Effect<'fade', { in: number; out: number }>
export type FadeComplexEffect = Effect<'fadeComplex', {
  alphas: [number, number, number]
  times: [number, number, number, number]
}>

export type MoveEffect = Effect<'move', {
  from: [number, number]
  to: [number, number]
  t1?: number
  t2?: number
}>

export type ClipEffect = Effect<'clip', { path: string; inverse: boolean }>
export type DrawingEffect = Effect<'drawing', { scale: number; commands: string }>

export type AnimateEffect = Effect<'animate', {
  start: number
  end: number
  accel?: number
  target: Partial<InlineStyle> | Effect
}>

export type ResetEffect = Effect<'reset', { style?: string }>

export type UnknownEffect = Effect<'unknown', { format: string; raw: string }>

export type KnownEffect =
  | KaraokeEffect
  | BlurEffect | BorderEffect | ShadowEffect
  | ScaleEffect | RotateEffect | ShearEffect | SpacingEffect
  | FadeEffect | FadeComplexEffect
  | MoveEffect | ClipEffect | DrawingEffect
  | AnimateEffect | ResetEffect
  | UnknownEffect
