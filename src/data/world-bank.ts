import { parseWorldBank, type WorldBankPoint } from '../domain/planet-feed'

export function worldBankUrl(indicator: string, page = 1): string {
  return `https://api.worldbank.org/v2/country/all/indicator/${encodeURIComponent(indicator)}?format=json&mrnev=1&per_page=400&page=${page}`
}

export async function fetchWorldBank(indicator: string, fetchImpl: typeof fetch = fetch): Promise<{ sourceUpdated: string; rows: WorldBankPoint[] }> {
  const first = await readPage(indicator, 1, fetchImpl)
  const pages = Math.min(pageCount(first.payload), 10)
  const rows = [...first.rows]
  for (let page = 2; page <= pages; page += 1) {
    const next = await readPage(indicator, page, fetchImpl)
    rows.push(...next.rows)
  }
  return { sourceUpdated: first.sourceUpdated, rows }
}

async function readPage(indicator: string, page: number, fetchImpl: typeof fetch): Promise<{ sourceUpdated: string; rows: WorldBankPoint[]; payload: unknown }> {
  const response = await fetchImpl(worldBankUrl(indicator, page))
  if (!response.ok) {
    throw new Error(`World Bank ${indicator} responded ${response.status}.`)
  }
  const payload = await response.json()
  const parsed = parseWorldBank(payload)
  if ('error' in parsed) {
    throw new Error(parsed.error)
  }
  return { ...parsed, payload }
}

function pageCount(payload: unknown): number {
  if (!Array.isArray(payload) || !payload[0] || typeof payload[0] !== 'object') {
    return 1
  }
  const pages = (payload[0] as { pages?: unknown }).pages
  return typeof pages === 'number' && pages > 1 ? pages : 1
}
