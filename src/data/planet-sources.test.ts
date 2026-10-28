import { describe, expect, it } from 'vitest'
import { planetSources } from './planet-sources'

describe('planet source catalog', () => {
  it('points every dataset and methodology link at a real organization page', () => {
    expect(planetSources.length).toBeGreaterThan(0)
    for (const source of planetSources) {
      expect(source.datasetUrl.startsWith('https://')).toBe(true)
      expect(source.methodologyUrl.startsWith('https://')).toBe(true)
      expect(source.measures.length).toBeGreaterThan(20)
      expect(source.transform.length).toBeGreaterThan(10)
      expect(source.license.length).toBeGreaterThan(5)
    }
  })

  it('connects only the browser-readable World Bank and Natural Earth feeds', () => {
    const connected = planetSources.filter((source) => source.connected).map((source) => source.id)
    expect(connected).toEqual([
      'world-bank-population',
      'world-bank-growth',
      'world-bank-density',
      'world-bank-forest',
      'natural-earth-hydro',
      'world-bank-freshwater',
      'ucdp-candidate',
      'usgs-major-deposits',
    ])
    expect(planetSources.find((source) => source.id === 'jrc-forest-cover')?.connected).toBe(false)
  })
})
