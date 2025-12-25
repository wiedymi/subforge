import { test, expect, describe } from 'bun:test'
import { parseTTML } from '../../src/formats/xml/ttml/parser.ts'
import { toTTML } from '../../src/formats/xml/ttml/serializer.ts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('TTML Roundtrip', () => {
  test('roundtrip preserves basic structure', () => {
    const original = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <head>
    <styling>
      <style xml:id="s1" tts:fontFamily="Arial" tts:fontSize="20px" tts:color="#ffffff"/>
    </styling>
  </head>
  <body>
    <div>
      <p begin="00:00:01.000" end="00:00:05.000" style="s1">First subtitle</p>
      <p begin="00:00:06.000" end="00:00:10.000">Second subtitle</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(original)
    const serialized = toTTML(doc)

    // Parse again to verify structure
    const doc2 = parseTTML(serialized)

    expect(doc2.events.length).toBe(doc.events.length)
    expect(doc2.events[0].start).toBe(doc.events[0].start)
    expect(doc2.events[0].end).toBe(doc.events[0].end)
    expect(doc2.events[0].text).toBe(doc.events[0].text)
    expect(doc2.events[1].text).toBe(doc.events[1].text)
  })

  test('roundtrip preserves timing', () => {
    const original = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="01:23:45.678" end="01:23:50.123">Test</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(original)
    const serialized = toTTML(doc, { format: 'clock' })
    const doc2 = parseTTML(serialized)

    expect(doc2.events[0].start).toBe(doc.events[0].start)
    expect(doc2.events[0].end).toBe(doc.events[0].end)
  })

  test('roundtrip preserves inline styles', () => {
    const original = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <body>
    <div>
      <p begin="1s" end="5s">Normal <span tts:fontStyle="italic">italic</span> text</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(original)
    const serialized = toTTML(doc)
    const doc2 = parseTTML(serialized)

    expect(doc2.events[0].segments.length).toBe(doc.events[0].segments.length)
    expect(doc2.events[0].segments[1].style?.italic).toBe(true)
  })

  test('roundtrip with fixture file', () => {
    const fixturePath = resolve(import.meta.dir, '../fixtures/ttml/simple.ttml')
    const original = readFileSync(fixturePath, 'utf-8')

    const doc = parseTTML(original)
    const serialized = toTTML(doc)
    const doc2 = parseTTML(serialized)

    expect(doc2.events.length).toBe(doc.events.length)
    for (let i = 0; i < doc.events.length; i++) {
      expect(doc2.events[i].start).toBe(doc.events[i].start)
      expect(doc2.events[i].end).toBe(doc.events[i].end)
      expect(doc2.events[i].text).toBe(doc.events[i].text)
    }
  })

  test('roundtrip with offset time format', () => {
    const original = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="1.5s" end="5.5s">Test</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(original)
    const serialized = toTTML(doc, { format: 'offset' })
    const doc2 = parseTTML(serialized)

    expect(doc2.events[0].start).toBe(1500)
    expect(doc2.events[0].end).toBe(5500)
  })

  test('roundtrip preserves regions', () => {
    const original = `<?xml version="1.0" encoding="UTF-8"?>
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

    const doc = parseTTML(original)
    const serialized = toTTML(doc)
    const doc2 = parseTTML(serialized)

    expect(doc2.events[0].effect).toBe('top')
  })

  test('roundtrip preserves colors', () => {
    const original = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <body>
    <div>
      <p begin="1s" end="5s"><span tts:color="#ff0000">Red text</span></p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(original)
    const serialized = toTTML(doc)
    const doc2 = parseTTML(serialized)

    // After roundtrip, there should be only one segment with the colored text
    expect(doc2.events[0].segments[0].style?.primaryColor).toBe(0xff0000ff) // Red in ABGR
  })

  test('roundtrip with multiple events', () => {
    const original = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="1s" end="2s">First</p>
      <p begin="3s" end="4s">Second</p>
      <p begin="5s" end="6s">Third</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(original)
    const serialized = toTTML(doc)
    const doc2 = parseTTML(serialized)

    expect(doc2.events.length).toBe(3)
    expect(doc2.events[0].text).toBe('First')
    expect(doc2.events[1].text).toBe('Second')
    expect(doc2.events[2].text).toBe('Third')
  })

  test('roundtrip preserves text with special characters', () => {
    const original = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="1s" end="5s">Text with &lt;html&gt; &amp; &quot;quotes&quot;</p>
    </div>
  </body>
</tt>`

    const doc = parseTTML(original)
    expect(doc.events[0].text).toBe('Text with <html> & "quotes"')

    const serialized = toTTML(doc)
    const doc2 = parseTTML(serialized)

    expect(doc2.events[0].text).toBe('Text with <html> & "quotes"')
  })
})
