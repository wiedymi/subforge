import type { Effect } from './types.ts'

interface EffectHandler<E extends Effect = Effect> {
  type: E['type']
  parse(raw: string): E['params'] | null
  serialize(params: E['params']): string
}

const handlers = new Map<string, EffectHandler>()

export function registerEffect<E extends Effect>(handler: EffectHandler<E>): void {
  handlers.set(handler.type, handler as EffectHandler)
}

export function getEffectHandler(type: string): EffectHandler | undefined {
  return handlers.get(type)
}

registerEffect({
  type: 'blur',
  parse: (raw) => {
    const strength = parseFloat(raw)
    if (isNaN(strength)) return null
    return { strength }
  },
  serialize: (p) => String((p as { strength: number }).strength)
})

registerEffect({
  type: 'karaoke',
  parse: (raw) => {
    const match = raw.match(/^(k|kf|ko|K)(\d+)$/)
    if (!match) return null
    const mode = match[1] === 'kf' || match[1] === 'K' ? 'fade'
                : match[1] === 'ko' ? 'outline' : 'fill'
    return { duration: parseInt(match[2]!) * 10, mode }
  },
  serialize: (p) => {
    const params = p as { duration: number; mode: 'fill' | 'fade' | 'outline' }
    const prefix = params.mode === 'fade' ? 'kf' : params.mode === 'outline' ? 'ko' : 'k'
    return `${prefix}${params.duration / 10}`
  }
})

registerEffect({
  type: 'border',
  parse: (raw) => {
    const size = parseFloat(raw)
    if (isNaN(size)) return null
    return { size }
  },
  serialize: (p) => String((p as { size: number }).size)
})

registerEffect({
  type: 'shadow',
  parse: (raw) => {
    const depth = parseFloat(raw)
    if (isNaN(depth)) return null
    return { depth }
  },
  serialize: (p) => String((p as { depth: number }).depth)
})

registerEffect({
  type: 'spacing',
  parse: (raw) => {
    const value = parseFloat(raw)
    if (isNaN(value)) return null
    return { value }
  },
  serialize: (p) => String((p as { value: number }).value)
})

registerEffect({
  type: 'scale',
  parse: (raw) => {
    const parts = raw.split(',')
    if (parts.length !== 2) return null
    const x = parseFloat(parts[0]!)
    const y = parseFloat(parts[1]!)
    if (isNaN(x) || isNaN(y)) return null
    return { x, y }
  },
  serialize: (p) => {
    const params = p as { x: number; y: number }
    return `${params.x},${params.y}`
  }
})

registerEffect({
  type: 'rotate',
  parse: (raw) => {
    const z = parseFloat(raw)
    if (isNaN(z)) return null
    return { z }
  },
  serialize: (p) => {
    const params = p as { x?: number; y?: number; z?: number }
    return String(params.z ?? 0)
  }
})

registerEffect({
  type: 'fade',
  parse: (raw) => {
    const parts = raw.split(',')
    if (parts.length !== 2) return null
    const fadeIn = parseInt(parts[0]!)
    const fadeOut = parseInt(parts[1]!)
    if (isNaN(fadeIn) || isNaN(fadeOut)) return null
    return { in: fadeIn, out: fadeOut }
  },
  serialize: (p) => {
    const params = p as { in: number; out: number }
    return `${params.in},${params.out}`
  }
})

registerEffect({
  type: 'fadeComplex',
  parse: (raw) => {
    const parts = raw.split(',')
    if (parts.length !== 7) return null
    const nums = parts.map(p => parseInt(p))
    if (nums.some(n => isNaN(n))) return null
    return {
      alphas: [nums[0]!, nums[1]!, nums[2]!] as [number, number, number],
      times: [nums[3]!, nums[4]!, nums[5]!, nums[6]!] as [number, number, number, number]
    }
  },
  serialize: (p) => {
    const params = p as { alphas: [number, number, number]; times: [number, number, number, number] }
    return [...params.alphas, ...params.times].join(',')
  }
})

registerEffect({
  type: 'move',
  parse: (raw) => {
    const parts = raw.split(',')
    if (parts.length < 4) return null
    const nums = parts.map(p => parseFloat(p))
    if (nums.slice(0, 4).some(n => isNaN(n))) return null
    const result: { from: [number, number]; to: [number, number]; t1?: number; t2?: number } = {
      from: [nums[0]!, nums[1]!],
      to: [nums[2]!, nums[3]!]
    }
    if (parts.length >= 6 && !isNaN(nums[4]!) && !isNaN(nums[5]!)) {
      result.t1 = nums[4]
      result.t2 = nums[5]
    }
    return result
  },
  serialize: (p) => {
    const params = p as { from: [number, number]; to: [number, number]; t1?: number; t2?: number }
    const parts = [...params.from, ...params.to]
    if (params.t1 !== undefined && params.t2 !== undefined) {
      parts[parts.length] = params.t1
      parts[parts.length] = params.t2
    }
    return parts.join(',')
  }
})

registerEffect({
  type: 'clip',
  parse: (raw) => {
    return { path: raw, inverse: false }
  },
  serialize: (p) => (p as { path: string }).path
})

registerEffect({
  type: 'drawing',
  parse: (raw) => {
    const scale = parseInt(raw)
    if (isNaN(scale)) return null
    return { scale, commands: '' }
  },
  serialize: (p) => String((p as { scale: number }).scale)
})

registerEffect({
  type: 'reset',
  parse: (raw) => {
    return { style: raw || undefined }
  },
  serialize: (p) => (p as { style?: string }).style ?? ''
})
