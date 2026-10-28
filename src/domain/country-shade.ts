import { matchingCountryRecord, type ForestRecord, type PopulationRecord } from './planet-feed'

export type Rgb = [number, number, number]

export type CountryShade = {
  iso: string
  name: string
  color: Rgb
}

export type PopulationShade = {
  basis: 'density' | 'total' | 'none'
  shades: CountryShade[]
  lowLabel: string
  highLabel: string
  yearLabel: string
}

export type ForestShade = {
  shades: CountryShade[]
  lowLabel: string
  highLabel: string
  yearLabel: string
}

const populationLow: Rgb = [0.16, 0.32, 0.42]
const populationHigh: Rgb = [0.97, 0.84, 0.32]
const forestLow: Rgb = [0.12, 0.18, 0.13]
const forestHigh: Rgb = [0.42, 0.84, 0.38]

export const populationShadeEnds = { low: populationLow, high: populationHigh }
export const forestShadeEnds = { low: forestLow, high: forestHigh }
export const missingShadeColor: Rgb = [0.62, 0.64, 0.66]

export function populationCountryShades(records: readonly PopulationRecord[], countries: readonly { iso: string; name: string }[]): PopulationShade {
  const counts = codeCounts(countries)
  const matched = countries.flatMap((country) => {
    const record = matchingCountryRecord(records, country, counts.get(country.iso) ?? 1)
    return record ? [{ country, record }] : []
  })
  const densities = matched.flatMap((item) => (usable(item.record.densityPerKm2) ? [item.record.densityPerKm2 as number] : []))
  if (densities.length > 0) {
    return {
      basis: 'density',
      shades: countries.flatMap((country) => {
        const record = matchingCountryRecord(records, country, counts.get(country.iso) ?? 1)
        return [shade(country, record && usable(record.densityPerKm2) ? logColor(record.densityPerKm2, densities) : missingShadeColor)]
      }),
      lowLabel: `${formatCount(Math.min(...densities))} /km²`,
      highLabel: `${formatCount(Math.max(...densities))} /km²`,
      yearLabel: yearSpan(matched.flatMap((item) => (usable(item.record.densityPerKm2) && item.record.densityYear !== undefined ? [item.record.densityYear] : []))),
    }
  }
  const totals = matched.flatMap((item) => (usable(item.record.population) ? [item.record.population] : []))
  if (totals.length > 0) {
    return {
      basis: 'total',
      shades: countries.flatMap((country) => {
        const record = matchingCountryRecord(records, country, counts.get(country.iso) ?? 1)
        return [shade(country, record && usable(record.population) ? logColor(record.population, totals) : missingShadeColor)]
      }),
      lowLabel: `${formatCount(Math.min(...totals))} people`,
      highLabel: `${formatCount(Math.max(...totals))} people`,
      yearLabel: yearSpan(matched.flatMap((item) => (usable(item.record.population) ? [item.record.year] : []))),
    }
  }
  return { basis: 'none', shades: [], lowLabel: '', highLabel: '', yearLabel: '' }
}

export function forestCountryShades(records: readonly ForestRecord[], countries: readonly { iso: string; name: string }[]): ForestShade {
  const counts = codeCounts(countries)
  const shades = countries.flatMap((country) => {
    const record = matchingCountryRecord(records, country, counts.get(country.iso) ?? 1)
    const percent = record?.percent?.value
    if (!usable(percent)) {
      return [shade(country, missingShadeColor)]
    }
    return [shade(country, lerp(forestLow, forestHigh, Math.min(100, Math.max(0, percent)) / 100))]
  })
  const years = countries.flatMap((country) => {
    const record = matchingCountryRecord(records, country, counts.get(country.iso) ?? 1)
    return record?.percent && usable(record.percent.value) ? [record.percent.year] : []
  })
  return { shades, lowLabel: '0% of land area', highLabel: '100% of land area', yearLabel: yearSpan(years) }
}

export function rgbCss(color: Rgb): string {
  const byte = (channel: number) => Math.round(Math.min(1, Math.max(0, channel)) * 255).toString(16).padStart(2, '0')
  return `#${byte(color[0])}${byte(color[1])}${byte(color[2])}`
}

function shade(country: { iso: string; name: string }, color: Rgb): CountryShade {
  return { iso: country.iso, name: country.name, color }
}

function logColor(value: number, series: number[]): Rgb {
  const logs = series.map((item) => Math.log10(Math.max(item, 0.01)))
  const low = Math.min(...logs)
  const high = Math.max(...logs)
  const t = high <= low ? 0.5 : (Math.log10(Math.max(value, 0.01)) - low) / (high - low)
  return lerp(populationLow, populationHigh, t)
}

function lerp(start: Rgb, end: Rgb, t: number): Rgb {
  const mix = Math.min(1, Math.max(0, t))
  return [start[0] + (end[0] - start[0]) * mix, start[1] + (end[1] - start[1]) * mix, start[2] + (end[2] - start[2]) * mix]
}

function usable(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function codeCounts(countries: readonly { iso: string }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const country of countries) {
    counts.set(country.iso, (counts.get(country.iso) ?? 0) + 1)
  }
  return counts
}

function yearSpan(years: readonly number[]): string {
  const finite = years.filter((year) => Number.isInteger(year))
  if (finite.length === 0) {
    return ''
  }
  const low = Math.min(...finite)
  const high = Math.max(...finite)
  return low === high ? String(low) : `${low}–${high}`
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)
}
