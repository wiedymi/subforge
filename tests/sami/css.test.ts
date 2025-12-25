import { test, expect } from 'bun:test'
import { parseCSS, generateCSS, styleFromClass } from '../../src/formats/xml/sami/css.ts'
import { createDefaultStyle } from '../../src/core/document.ts'

test('parseCSS basic class', () => {
  const css = '.ENCC { Name: English; lang: en-US; }'
  const classes = parseCSS(css)

  expect(classes.has('ENCC')).toBe(true)
  const encc = classes.get('ENCC')!
  expect(encc.name).toBe('English')
  expect(encc.lang).toBe('en-US')
})

test('parseCSS font properties', () => {
  const css = '.TEST { font-family: Arial; font-size: 24pt; font-weight: bold; }'
  const classes = parseCSS(css)

  const test = classes.get('TEST')!
  expect(test.fontName).toBe('Arial')
  expect(test.fontSize).toBe(24)
  expect(test.fontWeight).toBe('bold')
})

test('parseCSS color parsing - hex', () => {
  const css = '.TEST { color: #FF0000; }'
  const classes = parseCSS(css)

  const test = classes.get('TEST')!
  expect(test.color).toBe(0x000000FF) // BGR format
})

test('parseCSS color parsing - named', () => {
  const css = '.TEST { color: white; }'
  const classes = parseCSS(css)

  const test = classes.get('TEST')!
  expect(test.color).toBe(0x00FFFFFF)
})

test('parseCSS margins', () => {
  const css = '.TEST { margin-left: 10pt; margin-right: 20pt; margin-top: 5pt; }'
  const classes = parseCSS(css)

  const test = classes.get('TEST')!
  expect(test.marginLeft).toBe(10)
  expect(test.marginRight).toBe(20)
  expect(test.marginTop).toBe(5)
})

test('parseCSS text-align', () => {
  const css = '.TEST { text-align: center; }'
  const classes = parseCSS(css)

  const test = classes.get('TEST')!
  expect(test.textAlign).toBe('center')
})

test('parseCSS multiple classes', () => {
  const css = `
    .ENCC { Name: English; lang: en-US; }
    .KRCC { Name: Korean; lang: ko-KR; color: yellow; }
  `
  const classes = parseCSS(css)

  expect(classes.size).toBe(2)
  expect(classes.has('ENCC')).toBe(true)
  expect(classes.has('KRCC')).toBe(true)
})

test('parseCSS with comments', () => {
  const css = `
    <!--
    .ENCC { Name: English; lang: en-US; }
    -->
  `
  const classes = parseCSS(css)

  expect(classes.has('ENCC')).toBe(true)
})

test('styleFromClass basic conversion', () => {
  const classObj = {
    name: 'TEST',
    fontName: 'Verdana',
    fontSize: 24,
    fontWeight: 'bold',
    color: 0x00FF0000
  }

  const style = styleFromClass(classObj)

  expect(style.fontName).toBe('Verdana')
  expect(style.fontSize).toBe(24)
  expect(style.bold).toBe(true)
  expect(style.primaryColor).toBe(0x00FF0000)
})

test('styleFromClass text-align to alignment', () => {
  const left = styleFromClass({ name: 'TEST', textAlign: 'left' })
  const center = styleFromClass({ name: 'TEST', textAlign: 'center' })
  const right = styleFromClass({ name: 'TEST', textAlign: 'right' })

  expect(left.alignment).toBe(1)
  expect(center.alignment).toBe(2)
  expect(right.alignment).toBe(3)
})

test('styleFromClass font-weight numeric', () => {
  const bold = styleFromClass({ name: 'TEST', fontWeight: '700' })
  const normal = styleFromClass({ name: 'TEST', fontWeight: '400' })

  expect(bold.bold).toBe(true)
  expect(normal.bold).toBe(false)
})

test('generateCSS default style', () => {
  const styles = new Map()
  const css = generateCSS(styles)

  expect(css).toContain('P {')
  expect(css).toContain('font-family: Arial')
  expect(css).toContain('color: white')
})

test('generateCSS custom styles', () => {
  const styles = new Map()
  const style = createDefaultStyle()
  style.name = 'Test'
  style.fontName = 'Verdana'
  style.fontSize = 24
  style.bold = true
  style.primaryColor = 0x000000FF // red

  styles.set('Test', style)

  const css = generateCSS(styles)

  expect(css).toContain('.TEST')
  expect(css).toContain('font-family: Verdana')
  expect(css).toContain('font-size: 24pt')
  expect(css).toContain('font-weight: bold')
  expect(css).toContain('color: #ff0000')
})

test('parseCSS font-size px conversion', () => {
  const css = '.TEST { font-size: 32px; }'
  const classes = parseCSS(css)

  const test = classes.get('TEST')!
  expect(test.fontSize).toBe(24) // 32 * 0.75
})

test('parseCSS rgb color', () => {
  const css = '.TEST { color: rgb(255, 0, 0); }'
  const classes = parseCSS(css)

  const test = classes.get('TEST')!
  expect(test.color).toBe(0x000000FF)
})

test('parseCSS short hex color', () => {
  const css = '.TEST { color: #F00; }'
  const classes = parseCSS(css)

  const test = classes.get('TEST')!
  expect(test.color).toBe(0x000000FF)
})
