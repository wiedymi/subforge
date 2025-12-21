import { test, expect, describe } from 'bun:test'
import { registerEffect, getEffectHandler } from '../../src/core/effects.ts'
import type { ImageEffect, VobSubEffect, PGSEffect } from '../../src/core/types.ts'

describe('Image Effect', () => {
  test('handler is registered', () => {
    const handler = getEffectHandler('image')
    expect(handler).toBeDefined()
    expect(handler?.type).toBe('image')
  })

  test('parse returns null for binary effects', () => {
    const handler = getEffectHandler('image')
    expect(handler?.parse('')).toBeNull()
    expect(handler?.parse('anything')).toBeNull()
  })

  test('serialize returns empty string for binary effects', () => {
    const handler = getEffectHandler('image')
    const params: ImageEffect['params'] = {
      format: 'png',
      width: 1920,
      height: 1080,
      x: 100,
      y: 200,
      data: new Uint8Array([1, 2, 3, 4])
    }
    expect(handler?.serialize(params)).toBe('')
  })

  test('type definition accepts all formats', () => {
    const rleEffect: ImageEffect = {
      type: 'image',
      params: {
        format: 'rle',
        width: 100,
        height: 50,
        data: new Uint8Array()
      }
    }
    expect(rleEffect.params.format).toBe('rle')

    const pngEffect: ImageEffect = {
      type: 'image',
      params: {
        format: 'png',
        width: 200,
        height: 100,
        data: new Uint8Array()
      }
    }
    expect(pngEffect.params.format).toBe('png')

    const rawEffect: ImageEffect = {
      type: 'image',
      params: {
        format: 'raw',
        width: 300,
        height: 150,
        data: new Uint8Array()
      }
    }
    expect(rawEffect.params.format).toBe('raw')

    const indexedEffect: ImageEffect = {
      type: 'image',
      params: {
        format: 'indexed',
        width: 400,
        height: 200,
        data: new Uint8Array(),
        palette: [0xFF0000FF, 0x00FF00FF, 0x0000FFFF]
      }
    }
    expect(indexedEffect.params.format).toBe('indexed')
    expect(indexedEffect.params.palette).toHaveLength(3)
  })

  test('optional position fields', () => {
    const withPosition: ImageEffect = {
      type: 'image',
      params: {
        format: 'png',
        width: 100,
        height: 50,
        x: 10,
        y: 20,
        data: new Uint8Array()
      }
    }
    expect(withPosition.params.x).toBe(10)
    expect(withPosition.params.y).toBe(20)

    const withoutPosition: ImageEffect = {
      type: 'image',
      params: {
        format: 'png',
        width: 100,
        height: 50,
        data: new Uint8Array()
      }
    }
    expect(withoutPosition.params.x).toBeUndefined()
    expect(withoutPosition.params.y).toBeUndefined()
  })
})

describe('VobSub Effect', () => {
  test('handler is registered', () => {
    const handler = getEffectHandler('vobsub')
    expect(handler).toBeDefined()
    expect(handler?.type).toBe('vobsub')
  })

  test('parse returns null for binary effects', () => {
    const handler = getEffectHandler('vobsub')
    expect(handler?.parse('')).toBeNull()
    expect(handler?.parse('anything')).toBeNull()
  })

  test('serialize returns empty string for binary effects', () => {
    const handler = getEffectHandler('vobsub')
    const params: VobSubEffect['params'] = {
      forced: true,
      originalIndex: 42
    }
    expect(handler?.serialize(params)).toBe('')
  })

  test('type definition with forced flag', () => {
    const forcedSub: VobSubEffect = {
      type: 'vobsub',
      params: {
        forced: true,
        originalIndex: 0
      }
    }
    expect(forcedSub.params.forced).toBe(true)
    expect(forcedSub.params.originalIndex).toBe(0)

    const normalSub: VobSubEffect = {
      type: 'vobsub',
      params: {
        forced: false,
        originalIndex: 123
      }
    }
    expect(normalSub.params.forced).toBe(false)
    expect(normalSub.params.originalIndex).toBe(123)
  })
})

describe('PGS Effect', () => {
  test('handler is registered', () => {
    const handler = getEffectHandler('pgs')
    expect(handler).toBeDefined()
    expect(handler?.type).toBe('pgs')
  })

  test('parse returns null for binary effects', () => {
    const handler = getEffectHandler('pgs')
    expect(handler?.parse('')).toBeNull()
    expect(handler?.parse('anything')).toBeNull()
  })

  test('serialize returns empty string for binary effects', () => {
    const handler = getEffectHandler('pgs')
    const params: PGSEffect['params'] = {
      compositionNumber: 1,
      windowId: 0
    }
    expect(handler?.serialize(params)).toBe('')
  })

  test('type definition with composition and window', () => {
    const pgsEffect: PGSEffect = {
      type: 'pgs',
      params: {
        compositionNumber: 5,
        windowId: 2
      }
    }
    expect(pgsEffect.params.compositionNumber).toBe(5)
    expect(pgsEffect.params.windowId).toBe(2)
  })
})

describe('Existing effects still work', () => {
  test('blur effect', () => {
    const handler = getEffectHandler('blur')
    expect(handler?.parse('2.5')).toEqual({ strength: 2.5 })
    expect(handler?.serialize({ strength: 3.0 })).toBe('3')
  })

  test('karaoke effect', () => {
    const handler = getEffectHandler('karaoke')
    expect(handler?.parse('k50')).toEqual({ duration: 500, mode: 'fill' })
    expect(handler?.parse('kf100')).toEqual({ duration: 1000, mode: 'fade' })
    expect(handler?.parse('ko25')).toEqual({ duration: 250, mode: 'outline' })
  })

  test('fade effect', () => {
    const handler = getEffectHandler('fade')
    expect(handler?.parse('250,500')).toEqual({ in: 250, out: 500 })
    expect(handler?.serialize({ in: 100, out: 200 })).toBe('100,200')
  })
})
