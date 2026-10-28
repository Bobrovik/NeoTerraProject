import { describe, expect, it } from 'vitest'
import { mineralSymbolIds, symbolPath, symbolTriangles } from './mineral-symbols'

describe('mineral symbols', () => {
  it('builds a filled vector for every symbol inside the unit box', () => {
    for (const symbol of mineralSymbolIds) {
      const triangles = symbolTriangles(symbol)
      expect(triangles.length).toBeGreaterThan(8)
      expect(triangles.length % 3).toBe(0)
      expect(symbolPath(symbol).startsWith('M ')).toBe(true)
      for (const value of triangles) {
        expect(value).toBeGreaterThanOrEqual(-1)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('keeps a hole in the neutral ring', () => {
    const ring = symbolTriangles('ring')
    for (let index = 0; index < ring.length; index += 3) {
      expect(Math.hypot(ring[index], ring[index + 1])).toBeGreaterThan(0.5)
    }
  })
})
