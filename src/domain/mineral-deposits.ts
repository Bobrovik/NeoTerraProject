import type { MineralSymbol } from './mineral-symbols'

export type MineralDeposit = {
  id: string
  name: string
  country: string
  latitude: number
  longitude: number
  commodity: string
  categories: string[]
  geologicSetting: string
  sourceUrl: string
}

export type MineralCategory = { id: string; label: string; color: string; symbol: MineralSymbol }

export const mineralCategoryLabels: MineralCategory[] = [
  { id: 'iron', label: 'Iron ore', color: '#b5654a', symbol: 'square' },
  { id: 'copper', label: 'Copper', color: '#d08a4c', symbol: 'hexagon' },
  { id: 'aluminum', label: 'Aluminum and bauxite', color: '#9aa7b2', symbol: 'diamond' },
  { id: 'gold-silver', label: 'Gold and silver', color: '#e2c14a', symbol: 'triangle' },
  { id: 'lithium', label: 'Lithium', color: '#7dcea0', symbol: 'circle' },
  { id: 'cobalt', label: 'Cobalt', color: '#4c6cb3', symbol: 'triangle-down' },
  { id: 'nickel', label: 'Nickel', color: '#8d9a6a', symbol: 'plus' },
  { id: 'graphite', label: 'Graphite', color: '#5c6770', symbol: 'bar' },
  { id: 'rare-earth', label: 'Rare earth elements', color: '#c06ad0', symbol: 'star' },
  { id: 'uranium', label: 'Uranium', color: '#6adf7a', symbol: 'pentagon' },
  { id: 'coal', label: 'Coal', color: '#8a8178', symbol: 'rectangle' },
  { id: 'other', label: 'Other resources', color: '#d0d5da', symbol: 'ring' },
]

const categoryTests: Array<{ id: string; test: RegExp }> = [
  { id: 'iron', test: /\biron\b/i },
  { id: 'copper', test: /\bcopper\b/i },
  { id: 'aluminum', test: /\b(?:aluminum|aluminium|bauxite)\b/i },
  { id: 'gold-silver', test: /\b(?:gold|silver)\b/i },
  { id: 'lithium', test: /\blithium\b|\bhectorite\b/i },
  { id: 'cobalt', test: /\bcobalt\b/i },
  { id: 'nickel', test: /\bnickel\b/i },
  { id: 'graphite', test: /\bgraphite\b/i },
  { id: 'rare-earth', test: /\brare earth|\bree\b/i },
  { id: 'uranium', test: /\buranium\b/i },
  { id: 'coal', test: /\bcoal\b/i },
]

const datasetPage = 'https://mrdata.usgs.gov/major-deposits/'

export function categoriesForCommodity(commodity: string): string[] {
  const matched = categoryTests.filter((rule) => rule.test.test(commodity)).map((rule) => rule.id)
  return matched.length > 0 ? matched : ['other']
}

export function mineralMarker(categories: readonly string[]): MineralCategory {
  return mineralCategoryLabels.find((category) => categories.includes(category.id)) ?? mineralCategoryLabels[mineralCategoryLabels.length - 1]
}

export function mineralPointColor(categories: readonly string[]): string {
  return mineralMarker(categories).color
}

export function depositsInCategories<T extends { categories: readonly string[] }>(records: readonly T[], selected: ReadonlySet<string>): T[] {
  return records.filter((record) => record.categories.some((category) => selected.has(category)))
}

export function parseMajorDepositGml(xml: string): MineralDeposit[] {
  const deposits: MineralDeposit[] = []
  for (const block of xml.split('<gml:featureMember>').slice(1)) {
    const id = tag(block, 'gid')
    const name = decodeXml(tag(block, 'dep_name'))
    const latitude = Number(tag(block, 'latitude'))
    const longitude = Number(tag(block, 'longitude'))
    if (!id || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      continue
    }
    const commodity = decodeXml(tag(block, 'commodity'))
    const listedUrl = decodeXml(tag(block, 'url'))
    deposits.push({
      id,
      name,
      country: decodeXml(tag(block, 'country')),
      latitude,
      longitude,
      commodity,
      categories: categoriesForCommodity(commodity),
      geologicSetting: decodeXml(tag(block, 'dep_type')),
      sourceUrl: listedUrl.startsWith('https://mrdata.usgs.gov/') ? listedUrl : datasetPage,
    })
  }
  return deposits
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<ms:${name}>([^<]*)</ms:${name}>`))
  return match?.[1] ?? ''
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .trim()
}
