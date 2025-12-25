import type { Style } from '../../../core/types.ts'

/**
 * Represents a SAMI CSS class definition
 */
export interface SAMIClass {
  /** Class name */
  name: string
  /** Language code (e.g., "en-US") */
  lang?: string
  /** Font family name */
  fontName?: string
  /** Font size in points */
  fontSize?: number
  /** Font weight (e.g., "bold", "700") */
  fontWeight?: string
  /** Text color in BGR format */
  color?: number
  /** Text alignment (left, center, right) */
  textAlign?: string
  /** Left margin in pixels */
  marginLeft?: number
  /** Right margin in pixels */
  marginRight?: number
  /** Top margin in pixels */
  marginTop?: number
  /** Bottom margin in pixels */
  marginBottom?: number
}

/**
 * Parse CSS block from SAMI file and extract class definitions
 *
 * @param cssBlock - CSS content from STYLE tag
 * @returns Map of class names to SAMIClass objects
 *
 * @example
 * ```ts
 * const css = `.ENCC { Name: English; font-size: 20pt; color: white; }`
 * const classes = parseCSS(css)
 * ```
 */
export function parseCSS(cssBlock: string): Map<string, SAMIClass> {
  const classes = new Map<string, SAMIClass>()

  // Extract class definitions: .CLASSNAME { ... }
  const classRegex = /\.([A-Za-z0-9_-]+)\s*\{([^}]*)\}/g
  let match: RegExpExecArray | null

  while ((match = classRegex.exec(cssBlock)) !== null) {
    const className = match[1]!.toUpperCase()
    const props = match[2]!

    const classObj: SAMIClass = { name: className }

    // Parse properties
    const propRegex = /([a-zA-Z-]+)\s*:\s*([^;]+);?/g
    let propMatch: RegExpExecArray | null

    while ((propMatch = propRegex.exec(props)) !== null) {
      const prop = propMatch[1]!.toLowerCase().trim()
      const value = propMatch[2]!.trim()

      switch (prop) {
        case 'name':
          // Name: English
          classObj.name = value
          break
        case 'lang':
          // lang: en-US
          classObj.lang = value
          break
        case 'font-family':
          classObj.fontName = value.replace(/["']/g, '').split(',')[0]!.trim()
          break
        case 'font-size':
          classObj.fontSize = parseFontSize(value)
          break
        case 'font-weight':
          classObj.fontWeight = value
          break
        case 'color':
          classObj.color = parseColor(value)
          break
        case 'text-align':
          classObj.textAlign = value
          break
        case 'margin-left':
          classObj.marginLeft = parseMargin(value)
          break
        case 'margin-right':
          classObj.marginRight = parseMargin(value)
          break
        case 'margin-top':
          classObj.marginTop = parseMargin(value)
          break
        case 'margin-bottom':
          classObj.marginBottom = parseMargin(value)
          break
      }
    }

    classes.set(className, classObj)
  }

  return classes
}

function parseFontSize(value: string): number {
  const match = value.match(/^(\d+(?:\.\d+)?)(pt|px)?$/)
  if (!match) return 20

  const num = parseFloat(match[1]!)
  const unit = match[2]

  // Convert to pt (SAMI typically uses pt)
  if (unit === 'px') {
    return Math.round(num * 0.75) // px to pt conversion
  }
  return Math.round(num)
}

function parseColor(value: string): number {
  value = value.trim().toLowerCase()

  // Named colors
  const namedColors: Record<string, number> = {
    white: 0x00FFFFFF,
    black: 0x00000000,
    red: 0x000000FF,
    green: 0x0000FF00,
    blue: 0x00FF0000,
    yellow: 0x0000FFFF,
    cyan: 0x00FFFF00,
    magenta: 0x00FF00FF,
  }

  if (namedColors[value] !== undefined) {
    return namedColors[value]!
  }

  // Hex colors: #RRGGBB or #RGB
  if (value.startsWith('#')) {
    const hex = value.slice(1)

    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0]!, 16)
      const g = parseInt(hex[1]! + hex[1]!, 16)
      const b = parseInt(hex[2]! + hex[2]!, 16)
      return ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)
    }
  }

  // rgb(r, g, b)
  const rgbMatch = value.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]!)
    const g = parseInt(rgbMatch[2]!)
    const b = parseInt(rgbMatch[3]!)
    return ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)
  }

  return 0x00FFFFFF // default white
}

function parseMargin(value: string): number {
  const match = value.match(/^(\d+(?:\.\d+)?)(pt|px)?$/)
  if (!match) return 0
  return Math.round(parseFloat(match[1]!))
}

/**
 * Convert SAMI CSS class to subtitle style properties
 *
 * @param classObj - SAMI class definition
 * @param baseStyle - Optional base style to merge with
 * @returns Partial style object with converted properties
 *
 * @example
 * ```ts
 * const style = styleFromClass({ name: 'ENCC', fontSize: 20, color: 0xFFFFFF })
 * ```
 */
export function styleFromClass(classObj: SAMIClass, baseStyle?: Style): Partial<Style> {
  const style: Partial<Style> = {}

  if (classObj.fontName) {
    style.fontName = classObj.fontName
  }
  if (classObj.fontSize !== undefined) {
    style.fontSize = classObj.fontSize
  }
  if (classObj.fontWeight) {
    style.bold = classObj.fontWeight === 'bold' || parseInt(classObj.fontWeight) >= 700
  }
  if (classObj.color !== undefined) {
    style.primaryColor = classObj.color
  }

  // Convert text-align to alignment (1-9)
  if (classObj.textAlign) {
    switch (classObj.textAlign) {
      case 'left':
        style.alignment = 1
        break
      case 'center':
        style.alignment = 2
        break
      case 'right':
        style.alignment = 3
        break
    }
  }

  if (classObj.marginLeft !== undefined) {
    style.marginL = classObj.marginLeft
  }
  if (classObj.marginRight !== undefined) {
    style.marginR = classObj.marginRight
  }
  if (classObj.marginTop !== undefined || classObj.marginBottom !== undefined) {
    style.marginV = classObj.marginTop ?? classObj.marginBottom ?? 0
  }

  return style
}

/**
 * Generate SAMI CSS from subtitle styles
 *
 * @param styles - Map of style names to Style objects
 * @returns CSS string for SAMI STYLE block
 *
 * @example
 * ```ts
 * const css = generateCSS(doc.styles)
 * ```
 */
export function generateCSS(styles: Map<string, Style>): string {
  let css = 'P { margin-left: 8pt; margin-right: 8pt; margin-bottom: 2pt; margin-top: 2pt;\n'
  css += '    text-align: center; font-size: 20pt; font-family: Arial; font-weight: normal;\n'
  css += '    color: white; }\n'

  for (const [name, style] of styles) {
    if (name === 'Default') continue

    const className = name.toUpperCase().replace(/[^A-Z0-9]/g, '')
    css += `.${className} { Name: ${name}; lang: en-US; `

    if (style.fontName !== 'Arial') {
      css += `font-family: ${style.fontName}; `
    }
    if (style.fontSize !== 20) {
      css += `font-size: ${style.fontSize}pt; `
    }
    if (style.bold) {
      css += 'font-weight: bold; '
    }

    const r = style.primaryColor & 0xFF
    const g = (style.primaryColor >> 8) & 0xFF
    const b = (style.primaryColor >> 16) & 0xFF
    if (style.primaryColor !== 0x00FFFFFF) {
      css += `color: #${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}; `
    }

    css += '}\n'
  }

  return css
}
