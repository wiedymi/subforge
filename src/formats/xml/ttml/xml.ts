// Simple XML parser for TTML (no dependencies)

export interface XMLElement {
  name: string
  attributes: Map<string, string>
  children: XMLNode[]
  textContent: string
}

export type XMLNode = XMLElement | string

export function parseXML(xml: string): XMLElement {
  const parser = new SimpleXMLParser(xml)
  return parser.parse()
}

function decodeXMLEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

class SimpleXMLParser {
  private src: string
  private pos = 0
  private len: number

  constructor(src: string) {
    this.src = src.trim()
    this.len = this.src.length
  }

  parse(): XMLElement {
    // Skip XML declaration
    if (this.src.startsWith('<?xml')) {
      const endPos = this.src.indexOf('?>', this.pos)
      if (endPos !== -1) {
        this.pos = endPos + 2
        this.skipWhitespace()
      }
    }

    return this.parseElement()
  }

  private parseElement(): XMLElement {
    this.skipWhitespace()

    // Expect opening tag
    if (this.src[this.pos] !== '<') {
      throw new Error('Expected < at position ' + this.pos)
    }

    this.pos++ // Skip <

    // Parse tag name
    const nameEnd = this.findEndOfTagName()
    const name = this.src.substring(this.pos, nameEnd)
    this.pos = nameEnd

    // Parse attributes
    const attributes = this.parseAttributes()

    this.skipWhitespace()

    // Check for self-closing tag
    if (this.src[this.pos] === '/' && this.src[this.pos + 1] === '>') {
      this.pos += 2
      return {
        name,
        attributes,
        children: [],
        textContent: ''
      }
    }

    // Expect >
    if (this.src[this.pos] !== '>') {
      throw new Error('Expected > at position ' + this.pos)
    }
    this.pos++ // Skip >

    // Parse children
    const children: XMLNode[] = []
    let textContent = ''

    while (this.pos < this.len) {
      // Check for closing tag (don't skip whitespace first - preserve it)
      if (this.src[this.pos] === '<' && this.src[this.pos + 1] === '/') {
        this.pos += 2
        const closeNameEnd = this.src.indexOf('>', this.pos)
        const closeName = this.src.substring(this.pos, closeNameEnd)
        if (closeName !== name) {
          throw new Error(`Mismatched closing tag: expected ${name}, got ${closeName}`)
        }
        this.pos = closeNameEnd + 1
        break
      }

      // Check for nested element
      if (this.src[this.pos] === '<') {
        const child = this.parseElement()
        children.push(child)
        textContent += child.textContent
      } else {
        // Parse text content
        const textEnd = this.src.indexOf('<', this.pos)
        if (textEnd === -1) {
          const rawText = this.src.substring(this.pos)
          if (rawText) {
            const text = decodeXMLEntities(rawText)
            children.push(text)
            textContent += text
          }
          break
        } else {
          const rawText = this.src.substring(this.pos, textEnd)
          if (rawText) {
            const text = decodeXMLEntities(rawText)
            children.push(text)
            textContent += text
          }
          this.pos = textEnd
        }
      }
    }

    return {
      name,
      attributes,
      children,
      textContent
    }
  }

  private findEndOfTagName(): number {
    let pos = this.pos
    while (pos < this.len) {
      const c = this.src[pos]
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '>' || c === '/') {
        return pos
      }
      pos++
    }
    return pos
  }

  private parseAttributes(): Map<string, string> {
    const attrs = new Map<string, string>()

    while (this.pos < this.len) {
      this.skipWhitespace()

      // Check for end of tag
      if (this.src[this.pos] === '>' || this.src[this.pos] === '/') {
        break
      }

      // Parse attribute name
      const nameStart = this.pos
      while (this.pos < this.len && this.src[this.pos] !== '=' && this.src[this.pos] !== ' ' && this.src[this.pos] !== '>') {
        this.pos++
      }
      const attrName = this.src.substring(nameStart, this.pos)

      this.skipWhitespace()

      if (this.src[this.pos] === '=') {
        this.pos++ // Skip =
        this.skipWhitespace()

        // Parse attribute value
        const quote = this.src[this.pos]
        if (quote === '"' || quote === "'") {
          this.pos++ // Skip opening quote
          const valueStart = this.pos
          while (this.pos < this.len && this.src[this.pos] !== quote) {
            this.pos++
          }
          const rawAttrValue = this.src.substring(valueStart, this.pos)
          const attrValue = decodeXMLEntities(rawAttrValue)
          this.pos++ // Skip closing quote

          attrs.set(attrName, attrValue)
        }
      }
    }

    return attrs
  }

  private skipWhitespace(): void {
    while (this.pos < this.len) {
      const c = this.src[this.pos]
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        this.pos++
      } else {
        break
      }
    }
  }
}

// Helper functions to mimic DOM API
export function querySelector(element: XMLElement, selector: string): XMLElement | null {
  if (element.name === selector) {
    return element
  }

  for (const child of element.children) {
    if (typeof child !== 'string') {
      const result = querySelector(child, selector)
      if (result) return result
    }
  }

  return null
}

export function querySelectorAll(element: XMLElement, selector: string): XMLElement[] {
  const results: XMLElement[] = []

  if (element.name === selector) {
    results.push(element)
  }

  for (const child of element.children) {
    if (typeof child !== 'string') {
      results.push(...querySelectorAll(child, selector))
    }
  }

  return results
}

export function getAttribute(element: XMLElement, name: string): string | null {
  return element.attributes.get(name) || null
}

export function getAttributeNS(_element: XMLElement, _ns: string, name: string): string | null {
  // For TTML, we can ignore namespaces and just use the attribute name with prefix
  return _element.attributes.get(`tts:${name}`) || null
}
