export type ConflictPrecision = 'exact' | 'nearby' | 'area-point' | 'international'

export type ConflictEvent = {
  id: string
  name: string
  country: string
  region: string
  violence: string
  latitude: number
  longitude: number
  precision: ConflictPrecision
  dateStart: string
  dateEnd: string
  deathsBest?: number
  sourceUrl?: string
}

export type ConflictFeed = {
  datasetUrl: string
  omittedCountryOnly: number
  events: ConflictEvent[]
}

export const conflictPrecisionColor: Record<ConflictPrecision, string> = {
  exact: '#ff4b4b',
  nearby: '#f0a202',
  'area-point': '#b388ff',
  international: '#4cc3ff',
}

const violenceLabels: Record<string, string> = {
  '1': 'State-based conflict',
  '2': 'Non-state conflict',
  '3': 'One-sided violence',
}

export function latestCandidateCsvPath(html: string): string | undefined {
  const found: Array<{ path: string; version: [number, number, number] }> = []
  for (const match of html.matchAll(/\/downloads\/candidateged\/GEDEvent_v(\d+)_(\d+)_(\d+)\.csv/g)) {
    const path = match[0]
    const next = html[match.index + path.length]
    if (next === '_' || (next >= '0' && next <= '9')) {
      continue
    }
    found.push({ path, version: [Number(match[1]), Number(match[2]), Number(match[3])] })
  }
  found.sort((left, right) => {
    for (let index = 0; index < 3; index += 1) {
      const delta = left.version[index] - right.version[index]
      if (delta !== 0) {
        return delta
      }
    }
    return 0
  })
  return found.at(-1)?.path
}

export function conflictFeedFromCsv(text: string, datasetUrl: string): ConflictFeed {
  const rows = parseCsv(text)
  const header = rows[0]
  if (!header) {
    return { datasetUrl, omittedCountryOnly: 0, events: [] }
  }
  const column = new Map(header.map((name, index) => [name, index]))
  let omittedCountryOnly = 0
  const events: ConflictEvent[] = []
  for (const row of rows.slice(1)) {
    const precisionCode = cell(row, column, 'where_prec')
    if (precisionCode === '6') {
      omittedCountryOnly += 1
      continue
    }
    const precision = precisionOf(precisionCode)
    const latitude = Number(cell(row, column, 'latitude'))
    const longitude = Number(cell(row, column, 'longitude'))
    const id = cell(row, column, 'id')
    if (!precision || !id || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      continue
    }
    const violenceCode = cell(row, column, 'type_of_violence')
    const deaths = Number(cell(row, column, 'best'))
    const sourceUrl = firstHttpUrl(`${cell(row, column, 'source_article')} ${cell(row, column, 'source_headline')}`)
    events.push({
      id,
      name: cell(row, column, 'conflict_name') || 'Unnamed conflict',
      country: cell(row, column, 'country'),
      region: cell(row, column, 'region'),
      violence: violenceLabels[violenceCode] ?? 'Organized violence',
      latitude,
      longitude,
      precision,
      dateStart: cell(row, column, 'date_start'),
      dateEnd: cell(row, column, 'date_end'),
      ...(Number.isFinite(deaths) ? { deathsBest: deaths } : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
    })
  }
  return { datasetUrl, omittedCountryOnly, events }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1
      }
      row.push(field)
      field = ''
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row)
      }
      row = []
      continue
    }
    field += char
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row)
    }
  }
  return rows
}

function precisionOf(code: string): ConflictPrecision | undefined {
  if (code === '1') return 'exact'
  if (code === '2') return 'nearby'
  if (code === '3' || code === '4' || code === '5') return 'area-point'
  if (code === '7') return 'international'
  return undefined
}

function cell(row: string[], column: Map<string, number>, name: string): string {
  const index = column.get(name)
  return index === undefined ? '' : (row[index] ?? '').trim()
}

function firstHttpUrl(value: string): string | undefined {
  const match = value.match(/https?:\/\/[^\s"'<>]+/)
  return match?.[0]
}
