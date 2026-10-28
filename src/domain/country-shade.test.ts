import { describe, expect, it } from 'vitest'
import { forestCountryShades, missingShadeColor, populationCountryShades } from './country-shade'
import type { ForestRecord, PopulationRecord } from './planet-feed'

const countries = [
  { iso: 'SL', name: 'Sierra Leone' },
  { iso: 'SL', name: 'Somaliland' },
  { iso: 'TZ', name: 'Tanzania' },
]

describe('country shades', () => {
  it('colors population by density and leaves a shared code unmatched', () => {
    const records: PopulationRecord[] = [
      { iso2: 'SL', name: 'Sierra Leone', year: 2025, population: 8, kind: 'estimate', densityPerKm2: 120, densityYear: 2024 },
      { iso2: 'TZ', name: 'Tanzania', year: 2025, population: 70, kind: 'estimate', densityPerKm2: 78, densityYear: 2024 },
    ]
    const shade = populationCountryShades(records, countries)
    expect(shade.basis).toBe('density')
    expect(shade.yearLabel).toBe('2024')
    expect(shade.shades.map((item) => item.name)).toEqual(['Sierra Leone', 'Somaliland', 'Tanzania'])
    expect(shade.shades[1]?.color).toEqual(missingShadeColor)
    const sierra = shade.shades[0]?.color[0] ?? 0
    const tanzania = shade.shades[2]?.color[0] ?? 0
    expect(sierra).toBeGreaterThan(tanzania)
    expect(shade.shades[0]?.color).not.toEqual(missingShadeColor)
  })

  it('uses total population only when no matched country has a density', () => {
    const records: PopulationRecord[] = [
      { iso2: 'TZ', name: 'Tanzania', year: 2025, population: 70, kind: 'estimate' },
    ]
    const shade = populationCountryShades(records, [{ iso: 'TZ', name: 'Tanzania' }])
    expect(shade.basis).toBe('total')
    expect(shade.shades).toHaveLength(1)
    expect(shade.highLabel).toContain('people')
    expect(shade.yearLabel).toBe('2025')
  })

  it('colors forest by the national percent and ignores area without a percent', () => {
    const records: ForestRecord[] = [
      { iso2: 'TZ', name: 'Tanzania', percent: { year: 2022, value: 50 } },
      { iso2: 'SL', name: 'Sierra Leone', areaKm2: { year: 2022, value: 90000 } },
    ]
    const shade = forestCountryShades(records, countries)
    expect(shade.shades.map((item) => item.name)).toEqual(['Sierra Leone', 'Somaliland', 'Tanzania'])
    expect(shade.shades[0]?.color).toEqual(missingShadeColor)
    expect(shade.shades[2]?.color).not.toEqual(missingShadeColor)
    expect(shade.yearLabel).toBe('2022')
    expect(shade.lowLabel).toBe('0% of land area')
    const bare = forestCountryShades([{ iso2: 'TZ', name: 'Tanzania', percent: { year: 2022, value: 0 } }], [{ iso: 'TZ', name: 'Tanzania' }])
    const full = forestCountryShades([{ iso2: 'TZ', name: 'Tanzania', percent: { year: 2022, value: 100 } }], [{ iso: 'TZ', name: 'Tanzania' }])
    expect(bare.shades[0]?.color).not.toEqual(missingShadeColor)
    expect(full.shades[0]?.color[1]).toBeGreaterThan(bare.shades[0]?.color[1] ?? 1)
  })
})
