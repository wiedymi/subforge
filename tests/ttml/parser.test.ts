import { test, expect, describe } from 'bun:test'
import { parseTTML, parseTTMLResult } from '../../src/formats/xml/ttml/parser.ts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('TTML Parser', () => {
  test('parses basic TTML document', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <head>
    <styling>
      <style xml:id="s1" tts:fontFamily="Arial" tts:fontSize="20px" tts:color="#ffffff"/>
    </styling>
  </head>
  <body>
    <div>
      <p begin="00:00:01.000" end="00:00:05.000" style="s1">First subtitle</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    expect(doc.events.length).toBe(1)
    expect(doc.events[0].start).toBe(1000)
    expect(doc.events[0].end).toBe(5000)
    expect(doc.events[0].text).toBe('First subtitle')
    expect(doc.events[0].style).toBe('s1')
  })

  test('parses clock time format', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="01:23:45.678" end="01:23:50.000">Test</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    expect(doc.events[0].start).toBe(1 * 3600000 + 23 * 60000 + 45 * 1000 + 678)
    expect(doc.events[0].end).toBe(1 * 3600000 + 23 * 60000 + 50 * 1000)
  })

  test('parses offset time format', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="1.5s" end="5.5s">Test</p>
      <p begin="100ms" end="500ms">Test 2</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    expect(doc.events[0].start).toBe(1500)
    expect(doc.events[0].end).toBe(5500)
    expect(doc.events[1].start).toBe(100)
    expect(doc.events[1].end).toBe(500)
  })

  test('parses duration attribute', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="1s" dur="4s">Test</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    expect(doc.events[0].start).toBe(1000)
    expect(doc.events[0].end).toBe(5000)
  })

  test('parses inline styling', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <body>
    <div>
      <p begin="1s" end="5s">Normal <span tts:fontStyle="italic">italic</span> text</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    expect(doc.events[0].segments.length).toBe(3)
    expect(doc.events[0].segments[0].text).toBe('Normal ')
    expect(doc.events[0].segments[1].text).toBe('italic')
    expect(doc.events[0].segments[1].style?.italic).toBe(true)
    expect(doc.events[0].segments[2].text).toBe(' text')
  })

  test('parses style references', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <head>
    <styling>
      <style xml:id="bold" tts:fontWeight="bold"/>
    </styling>
  </head>
  <body>
    <div>
      <p begin="1s" end="5s"><span style="bold">Bold text</span></p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    expect(doc.events[0].segments[0].style?.bold).toBe(true)
  })

  test('parses colors', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <body>
    <div>
      <p begin="1s" end="5s">
        <span tts:color="#ff0000">Red</span>
        <span tts:color="rgb(0,255,0)">Green</span>
        <span tts:color="white">White</span>
      </p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    // Segments include whitespace - span elements are at indices 1, 3, 5
    expect(doc.events[0].segments[1].style?.primaryColor).toBe(0xff0000ff) // Red in ABGR
    expect(doc.events[0].segments[3].style?.primaryColor).toBe(0xff00ff00) // Green in ABGR
    expect(doc.events[0].segments[5].style?.primaryColor).toBe(0xffffffff) // White in ABGR
  })

  test('parses regions', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <head>
    <layout>
      <region xml:id="top" tts:origin="10% 10%" tts:extent="80% 20%"/>
    </layout>
  </head>
  <body>
    <div>
      <p begin="1s" end="5s" region="top">Top text</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    expect(doc.events[0].effect).toBe('top')
  })

  test('parses fixture file', () => {
    const fixturePath = resolve(import.meta.dir, '../fixtures/ttml/simple.ttml')
    const ttml = readFileSync(fixturePath, 'utf-8')

    const doc = parseTTML(ttml)
    expect(doc.events.length).toBe(3)
    expect(doc.events[0].text).toBe('First subtitle')
    expect(doc.events[1].text).toBe('Second subtitle')
    expect(doc.events[2].text).toBe('Third subtitle with bold yellow text')
  })

  test('handles error modes', () => {
    const invalidTtml = `<?xml version="1.0" encoding="UTF-8"?>
<not-tt>Invalid</not-tt>`

    expect(() => parseTTML(invalidTtml)).toThrow()

    const result = parseTTMLResult(invalidTtml, { onError: 'collect' })
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('parses multiple paragraphs', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="1s" end="2s">First</p>
      <p begin="3s" end="4s">Second</p>
      <p begin="5s" end="6s">Third</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    expect(doc.events.length).toBe(3)
    expect(doc.events[0].text).toBe('First')
    expect(doc.events[1].text).toBe('Second')
    expect(doc.events[2].text).toBe('Third')
  })

  test('parses text decoration', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <body>
    <div>
      <p begin="1s" end="5s">
        <span tts:textDecoration="underline">Underlined</span>
        <span tts:textDecoration="line-through">Strikethrough</span>
      </p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    // Segments include whitespace - span elements are at indices 1 and 3
    expect(doc.events[0].segments[1].style?.underline).toBe(true)
    expect(doc.events[0].segments[3].style?.strikeout).toBe(true)
  })

  test('handles br tags', () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="1s" end="5s">Line 1<br/>Line 2</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(ttml)
    expect(doc.events[0].text).toBe('Line 1\nLine 2')
  })
})
