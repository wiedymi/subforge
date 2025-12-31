// === Document ===

/**
 * Root document structure for a subtitle file.
 * Contains all metadata, styles, events, comments, and format-specific data.
 */
export interface SubtitleDocument {
  /** Script metadata and playback settings */
  info: ScriptInfo
  /** Named style definitions, keyed by style name */
  styles: Map<string, Style>
  /** Timed subtitle events */
  events: SubtitleEvent[]
  /** User comments in the subtitle file */
  comments: Comment[]

  /** Embedded font data (ASS-specific, preserved for roundtrip) */
  fonts?: EmbeddedData[]
  /** Embedded graphic data (ASS-specific, preserved for roundtrip) */
  graphics?: EmbeddedData[]

  /** VTT region definitions (WebVTT-specific, preserved for roundtrip) */
  regions?: VTTRegion[]
}

/**
 * Script metadata and playback configuration.
 */
export interface ScriptInfo {
  /** Title of the subtitle script */
  title?: string
  /** Author or creator of the subtitle script */
  author?: string
  /** Video horizontal resolution for positioning */
  playResX: number
  /** Video vertical resolution for positioning */
  playResY: number
  /** Whether to scale borders and shadows with font size */
  scaleBorderAndShadow: boolean
  /** Text wrapping behavior: 0 = smart, 1 = end-of-line, 2 = no wrap, 3 = smart lower-wider */
  wrapStyle: 0 | 1 | 2 | 3
}

/**
 * User comment in the subtitle file.
 */
export interface Comment {
  /** Comment text content */
  text: string
  /** Index of the event this comment precedes, if any */
  beforeEventIndex?: number
}

/**
 * Base64-encoded embedded binary data (fonts or graphics).
 */
export interface EmbeddedData {
  /** Filename of the embedded resource */
  name: string
  /** Base64-encoded binary data */
  data: string
}

/**
 * WebVTT region definition for positioning cues.
 */
export interface VTTRegion {
  /** Unique identifier for the region */
  id: string
  /** Width as percentage or pixels */
  width: string
  /** Number of lines in the region */
  lines: number
  /** Anchor point within the region */
  regionAnchor: string
  /** Anchor point within the viewport */
  viewportAnchor: string
  /** Scrolling behavior */
  scroll: 'up' | 'none'
}

// === Styles ===

/**
 * Named style definition with typography and layout properties.
 */
export interface Style {
  /** Unique name identifier for the style */
  name: string
  /** Font family name */
  fontName: string
  /** Font size in points */
  fontSize: number
  /** Primary text color (RGBA packed as 32-bit integer) */
  primaryColor: number
  /** Secondary text color for karaoke effects */
  secondaryColor: number
  /** Border/outline color */
  outlineColor: number
  /** Background/shadow color */
  backColor: number
  /** Bold font weight */
  bold: boolean
  /** Italic font style */
  italic: boolean
  /** Underline text decoration */
  underline: boolean
  /** Strikethrough text decoration */
  strikeout: boolean
  /** Horizontal scale percentage (100 = normal) */
  scaleX: number
  /** Vertical scale percentage (100 = normal) */
  scaleY: number
  /** Letter spacing in pixels */
  spacing: number
  /** Rotation angle in degrees */
  angle: number
  /** Border rendering mode: 1 = outline + shadow, 3 = opaque box */
  borderStyle: 1 | 3
  /** Outline/border thickness in pixels */
  outline: number
  /** Shadow depth in pixels */
  shadow: number
  /** Text alignment (numpad layout) */
  alignment: Alignment
  /** Left margin in pixels */
  marginL: number
  /** Right margin in pixels */
  marginR: number
  /** Vertical margin in pixels */
  marginV: number
  /** Character encoding identifier */
  encoding: number
}

/**
 * Text alignment following numpad layout:
 * 1-3 = bottom row (left, center, right)
 * 4-6 = middle row (left, center, right)
 * 7-9 = top row (left, center, right)
 */
export type Alignment = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// === Events ===

/**
 * A single timed subtitle event.
 * Contains timing, style reference, and text with optional rich formatting.
 */
export interface SubtitleEvent {
  /** Unique identifier for the event */
  id: number
  /** Start time in milliseconds */
  start: number
  /** End time in milliseconds */
  end: number
  /** Rendering layer (higher layers appear above lower layers) */
  layer: number
  /** Name of the style to use */
  style: string
  /** Actor/character name for this line */
  actor: string
  /** Override left margin in pixels (0 = use style default) */
  marginL: number
  /** Override right margin in pixels (0 = use style default) */
  marginR: number
  /** Override vertical margin in pixels (0 = use style default) */
  marginV: number
  /** ASS/SSA Effect field (format-specific legacy string) */
  effect?: string
  /** Region identifier for formats that support regions (TTML/VTT) */
  region?: string

  /** Plain text content (may be stale if dirty=true) */
  text: string
  /** Rich text segments with inline styles and effects */
  segments: TextSegment[]

  /** Whether segments have been modified and text needs regeneration */
  dirty: boolean
}

// === Text Segments ===

/**
 * A segment of text with optional inline style overrides and effects.
 * Events can contain multiple segments with different styles.
 */
export interface TextSegment {
  /** Text content of this segment */
  text: string
  /** Inline style overrides (null = use event's style) */
  style: InlineStyle | null
  /** Applied effects (animations, transforms, etc.) */
  effects: Effect[]
}

/**
 * Inline style overrides that can be applied to text segments.
 * Only specified properties override the base style.
 */
export interface InlineStyle {
  /** Override font family name */
  fontName?: string
  /** Override font size in points */
  fontSize?: number
  /** Override bold (boolean or font weight 100-900) */
  bold?: boolean | number
  /** Override italic style */
  italic?: boolean
  /** Override underline decoration */
  underline?: boolean
  /** Override strikethrough decoration */
  strikeout?: boolean
  /** Override primary text color */
  primaryColor?: number
  /** Override secondary color (for karaoke) */
  secondaryColor?: number
  /** Override outline color */
  outlineColor?: number
  /** Override background color */
  backColor?: number
  /** Override all alpha channels */
  alpha?: number
  /** Override primary color alpha */
  primaryAlpha?: number
  /** Override secondary color alpha */
  secondaryAlpha?: number
  /** Override outline color alpha */
  outlineAlpha?: number
  /** Override background color alpha */
  backAlpha?: number
  /** Absolute position [x, y] in pixels */
  pos?: [number, number]
  /** Override text alignment */
  alignment?: Alignment
  /** Override character encoding */
  fontEncoding?: number
  /** Override wrapping style */
  wrapStyle?: 0 | 1 | 2 | 3
}

// === Effects ===

/**
 * Base effect interface with type discriminator and parameters.
 * @template T - Effect type identifier
 * @template P - Parameters object type
 */
export interface Effect<T extends string = string, P = unknown> {
  /** Effect type identifier */
  type: T
  /** Effect-specific parameters */
  params: P
}

/**
 * Karaoke timing effect for syllable-by-syllable highlighting.
 */
export type KaraokeEffect = Effect<'karaoke', {
  /** Duration in milliseconds */
  duration: number
  /** Highlight mode: fill (color change), fade (alpha transition), or outline (border highlight) */
  mode: 'fill' | 'fade' | 'outline'
}>

/**
 * Karaoke effect with absolute time reference.
 */
export type KaraokeAbsoluteEffect = Effect<'karaokeAbsolute', {
  /** Absolute time in centiseconds */
  time: number
}>

/** Gaussian blur effect */
export type BlurEffect = Effect<'blur', { strength: number }>
/** Border thickness override */
export type BorderEffect = Effect<'border', { size: number; x?: number; y?: number }>
/** Shadow depth override */
export type ShadowEffect = Effect<'shadow', { depth: number; x?: number; y?: number }>
/** Transform origin point */
export type OriginEffect = Effect<'origin', { x: number; y: number }>

/** Scale transform */
export type ScaleEffect = Effect<'scale', { x: number; y: number }>
/** 3D rotation transform */
export type RotateEffect = Effect<'rotate', { x?: number; y?: number; z?: number }>
/** Shear/skew transform */
export type ShearEffect = Effect<'shear', { x?: number; y?: number }>
/** Letter spacing override */
export type SpacingEffect = Effect<'spacing', { value: number }>

/** Simple fade in/out */
export type FadeEffect = Effect<'fade', { in: number; out: number }>
/** Complex multi-point fade with alpha keyframes */
export type FadeComplexEffect = Effect<'fadeComplex', {
  /** Alpha values at keyframes */
  alphas: [number, number, number]
  /** Time points for fade transitions (ms) */
  times: [number, number, number, number]
}>

/** Movement animation */
export type MoveEffect = Effect<'move', {
  /** Starting position [x, y] */
  from: [number, number]
  /** Ending position [x, y] */
  to: [number, number]
  /** Start time offset (ms) */
  t1?: number
  /** End time offset (ms) */
  t2?: number
}>

/** Clipping path to hide parts of text */
export type ClipEffect = Effect<'clip', { path: string; inverse: boolean }>
/** Vector drawing commands */
export type DrawingEffect = Effect<'drawing', { scale: number; commands: string }>
/** Baseline offset for drawings */
export type DrawingBaselineEffect = Effect<'drawingBaseline', { offset: number }>

/** Animated property transition */
export type AnimateEffect = Effect<'animate', {
  /** Animation start time (ms) */
  start: number
  /** Animation end time (ms) */
  end: number
  /** Acceleration factor (1 = linear) */
  accel?: number
  /** Target style properties or effect */
  target: Partial<InlineStyle> | Effect
}>

/** Reset to named style or default */
export type ResetEffect = Effect<'reset', { style?: string }>

/**
 * Bitmap image subtitle (for VobSub, PGS, DVB, etc.)
 */
export type ImageEffect = Effect<'image', {
  /** Image data format */
  format: 'rle' | 'png' | 'raw' | 'indexed'
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** Horizontal position offset */
  x?: number
  /** Vertical position offset */
  y?: number
  /** Binary image data */
  data: Uint8Array
  /** Color palette for indexed formats (RGBA values) */
  palette?: number[]
}>

/**
 * VobSub-specific metadata.
 */
export type VobSubEffect = Effect<'vobsub', {
  /** Whether this is a forced subtitle */
  forced: boolean
  /** Original index in .idx file */
  originalIndex: number
}>

/**
 * PGS (Blu-ray) subtitle metadata.
 */
export type PGSEffect = Effect<'pgs', {
  /** Composition number */
  compositionNumber: number
  /** Window identifier */
  windowId: number
}>

/** Unparsed or unrecognized effect */
export type UnknownEffect = Effect<'unknown', { format: string; raw: string }>

/**
 * Union of all known effect types.
 */
export type KnownEffect =
  | KaraokeEffect | KaraokeAbsoluteEffect
  | BlurEffect | BorderEffect | ShadowEffect | OriginEffect
  | ScaleEffect | RotateEffect | ShearEffect | SpacingEffect
  | FadeEffect | FadeComplexEffect
  | MoveEffect | ClipEffect | DrawingEffect | DrawingBaselineEffect
  | AnimateEffect | ResetEffect
  | ImageEffect | VobSubEffect | PGSEffect
  | UnknownEffect
