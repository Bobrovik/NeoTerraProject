import { useState, type ReactNode } from 'react'
import { planetSources, worldBankTermsUrl } from '../../data/planet-sources'
import { conflictPrecisionColor, type ConflictEvent, type ConflictPrecision } from '../../domain/conflict-events'
import { mineralCategoryLabels, type MineralCategory, type MineralDeposit } from '../../domain/mineral-deposits'
import { symbolPath, type MineralSymbol } from '../../domain/mineral-symbols'
import { matchingCountryRecord, type ForestRecord, type FreshwaterRecord, type PlanetLayerId, type PlanetLayers, type PopulationRecord } from '../../domain/planet-feed'
import controls from '../../shared/ui/controls.module.css'
import type { RemoteFeed } from './usePlanetFeeds'
import styles from './PlanetPage.module.css'

const layerLabels: Array<{ id: PlanetLayerId; label: string }> = [
  { id: 'flags', label: 'Country flags' },
  { id: 'conflicts', label: 'Armed conflicts' },
  { id: 'forests', label: 'Forest resources' },
  { id: 'freshwater', label: 'Freshwater' },
  { id: 'minerals', label: 'Mineral resources' },
  { id: 'population', label: 'Population' },
]

const conflictLegendLabels: Record<ConflictPrecision, string> = {
  exact: 'Event point',
  nearby: 'Within 25 km',
  'area-point': 'Area as a point',
  international: 'International waters',
}

export function GlobeLegend({
  layers,
  onToggle,
  population,
  forest,
  minerals,
  onToggleMineral,
}: {
  layers: PlanetLayers
  onToggle: (id: PlanetLayerId) => void
  population: { active: boolean; basis: 'density' | 'total' | 'none'; low: string; high: string; lowColor: string; highColor: string; yearLabel: string; missingColor: string }
  forest: { active: boolean; low: string; high: string; lowColor: string; highColor: string; yearLabel: string; missingColor: string }
  minerals: Array<MineralCategory & { selected: boolean }>
  onToggleMineral: (id: string) => void
}) {
  const [conflictsOpen, setConflictsOpen] = useState(false)
  const [mineralsOpen, setMineralsOpen] = useState(false)
  return (
    <div className={styles.globeLegend}>
      <div className={styles.legendBar}>
        <LegendToggle pressed={layers.freshwater} onClick={() => onToggle('freshwater')}>
          <i className={styles.swatch} style={{ background: '#9fd0e4' }} />
          <i className={styles.swatch} style={{ background: '#1c7c9c' }} />
          Water
        </LegendToggle>
        <LegendToggle pressed={layers.conflicts} onClick={() => onToggle('conflicts')}>
          <i className={styles.swatch} style={{ background: conflictPrecisionColor.exact }} />
          Armed conflicts
        </LegendToggle>
        {layers.conflicts ? (
          <button type="button" className={styles.legendMore} aria-expanded={conflictsOpen} onClick={() => setConflictsOpen((open) => !open)}>
            {conflictsOpen ? 'Hide conflict key' : 'Conflict key'}
          </button>
        ) : null}
        <LegendToggle pressed={layers.forests} onClick={() => onToggle('forests')}>
          <ScaleChip low={forest.lowColor} high={forest.highColor} />
          Forest
          {forest.active ? <RangeText low={forest.low} high={forest.high} year={forest.yearLabel} missingColor={forest.missingColor} /> : null}
        </LegendToggle>
        <LegendToggle pressed={layers.population} onClick={() => onToggle('population')}>
          <ScaleChip low={population.lowColor} high={population.highColor} />
          {population.basis === 'total' ? 'Population' : 'Population density'}
          {population.active ? <RangeText low={population.low} high={population.high} year={population.yearLabel} missingColor={population.missingColor} /> : null}
        </LegendToggle>
        <LegendToggle pressed={layers.minerals} onClick={() => onToggle('minerals')}>
          Mineral resources
        </LegendToggle>
        {layers.minerals && minerals.length > 0 ? (
          <button type="button" className={styles.legendMore} aria-expanded={mineralsOpen} onClick={() => setMineralsOpen((open) => !open)}>
            {mineralsOpen ? 'Hide shapes' : 'Shapes'}
          </button>
        ) : null}
        <LegendToggle pressed={layers.flags} onClick={() => onToggle('flags')}>
          <span className={styles.flagMark} />
          Country flags
        </LegendToggle>
      </div>
      {layers.conflicts && conflictsOpen ? (
        <ul className={styles.legendPanel}>
          {(Object.keys(conflictPrecisionColor) as ConflictPrecision[]).map((precision) => (
            <li key={precision}>
              <i className={styles.swatch} style={{ background: conflictPrecisionColor[precision] }} />
              <span>{conflictLegendLabels[precision]}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {layers.minerals && mineralsOpen ? (
        <div className={styles.legendPanel}>
          <p>Project key for the USGS nonfuel deposits. These shapes are not a published cartographic standard. Oil and natural gas are not in this file. A deposit listed under more than one commodity uses the first matching shape.</p>
          <ul>
            {minerals.map((category) => (
              <li key={category.id}>
                <label>
                  <input type="checkbox" checked={category.selected} onChange={() => onToggleMineral(category.id)} />
                  <MineralGlyph symbol={category.symbol} color={category.color} />
                  {category.label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function LegendToggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.legendToggle} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  )
}

function ScaleChip({ low, high }: { low: string; high: string }) {
  return <span className={styles.scaleChip} style={{ background: `linear-gradient(90deg, ${low}, ${high})` }} />
}

function RangeText({ low, high, year, missingColor }: { low: string; high: string; year: string; missingColor: string }) {
  if (!low || !high) {
    return null
  }
  return (
    <span>
      {low} to {high}{year ? `, ${year}` : ''}
      <i className={styles.swatch} style={{ background: missingColor }} />
      No data
    </span>
  )
}

export function MineralGlyph({ symbol, color }: { symbol: MineralSymbol; color: string }) {
  return (
    <svg className={styles.glyph} viewBox="-1.15 -1.15 2.3 2.3" width="14" height="14" aria-hidden="true">
      <path d={symbolPath(symbol)} fill={color} fillRule="evenodd" />
    </svg>
  )
}

export function PlanetLayerToggles({ layers, onToggle }: { layers: PlanetLayers; onToggle: (id: PlanetLayerId) => void }) {
  return (
    <fieldset className={styles.layers}>
      <legend>Planet layers</legend>
      {layerLabels.map((layer) => (
        <label key={layer.id}>
          <input type="checkbox" checked={layers[layer.id]} onChange={() => onToggle(layer.id)} />
          {layer.label}
        </label>
      ))}
    </fieldset>
  )
}

export function LayerStatus({ title, feed, note }: { title: string; feed: RemoteFeed<unknown>; note?: string }) {
  return (
    <section className={styles.card}>
      <h3>{title}</h3>
      <p className={statusClass(feed)}>{statusLabel(feed)}</p>
      {feedDate(feed) ? <p className={controls.muted}>{feedDate(feed)}</p> : null}
      {note ? <p className={controls.muted}>{note}</p> : null}
      <SourceLinks layer={titleToLayer(title)} />
    </section>
  )
}

export function CountryFacts({
  countryName,
  countryIso,
  sameCodeCount,
  population,
  forest,
  freshwater,
  showForest,
  showFreshwater,
}: {
  countryName: string
  countryIso: string
  sameCodeCount: number
  population: RemoteFeed<PopulationRecord[]>
  forest: RemoteFeed<ForestRecord[]>
  freshwater: RemoteFeed<FreshwaterRecord[]>
  showForest: boolean
  showFreshwater: boolean
}) {
  const country = { iso: countryIso, name: countryName }
  const people = recordFor(population, country, sameCodeCount)
  const trees = recordFor(forest, country, sameCodeCount)
  const water = recordFor(freshwater, country, sameCodeCount)
  return (
    <article className={styles.card}>
      <h2>{countryName}</h2>
      <h3>Population</h3>
      <PopulationFacts feed={population} record={people} />
      {showForest ? (
        <>
          <h3>Forest area</h3>
          <p className={controls.muted}>National statistic from FAO via the World Bank. This is not a forest map and not a timber volume.</p>
          <ForestFacts feed={forest} record={trees} />
        </>
      ) : null}
      {showFreshwater ? (
        <>
          <h3>Renewable internal freshwater</h3>
          <p className={controls.muted}>Cubic metres per person. This is not drinking-water access, groundwater reserves, or a water-stress score. Rivers and lakes on the globe only show that a water body is drawn.</p>
          <FreshwaterFacts feed={freshwater} record={water} />
        </>
      ) : null}
    </article>
  )
}

function PopulationFacts({ feed, record }: { feed: RemoteFeed<PopulationRecord[]>; record: PopulationRecord | undefined }) {
  if (feed.status === 'loading' || feed.status === 'idle') {
    return <p>Loading</p>
  }
  if (!record) {
    return <p>No data available</p>
  }
  return (
    <>
      <p>{formatCount(record.population)} people in {record.year}. {record.kind === 'projection' ? 'Projection, not a current count.' : 'Midyear estimate, not a census count.'}</p>
      {record.growthPercent !== undefined && record.growthYear !== undefined ? (
        <p className={controls.muted}>Annual growth estimate {record.growthPercent.toFixed(2)}% in {record.growthYear}.</p>
      ) : null}
      {record.densityPerKm2 !== undefined && record.densityYear !== undefined ? (
        <p className={controls.muted}>{record.densityPerKm2.toFixed(1)} people per km² of land area in {record.densityYear}.</p>
      ) : null}
      <p className={controls.muted}><a href={worldBankTermsUrl}>World Bank dataset terms</a></p>
    </>
  )
}

function ForestFacts({ feed, record }: { feed: RemoteFeed<ForestRecord[]>; record: ForestRecord | undefined }) {
  if (feed.status === 'loading') {
    return <p>Loading</p>
  }
  if (feed.status === 'error' && !record) {
    return <p>Update error. No data available.</p>
  }
  if (!record || (!record.percent && !record.areaKm2)) {
    return <p>No data available</p>
  }
  return (
    <>
      {record.percent ? <p>{record.percent.value.toFixed(1)}% of land area in {record.percent.year}.</p> : null}
      {record.areaKm2 ? <p>{formatCount(record.areaKm2.value)} km² of forest area in {record.areaKm2.year}.</p> : null}
    </>
  )
}

function FreshwaterFacts({ feed, record }: { feed: RemoteFeed<FreshwaterRecord[]>; record: FreshwaterRecord | undefined }) {
  if (feed.status === 'loading') {
    return <p>Loading</p>
  }
  if (!record) {
    return <p>No data available</p>
  }
  return <p>{formatCount(record.cubicMetersPerPerson)} m³ per person in {record.year}.</p>
}

function SourceLinks({ layer }: { layer: PlanetSourceLayer | undefined }) {
  const sources = planetSources.filter((source) => source.layer === layer)
  if (!layer || sources.length === 0) {
    return null
  }
  return (
    <details>
      <summary>Sources and methodology</summary>
      <ul className={styles.list}>
        {sources.map((source) => (
          <li key={source.id}>
            <strong>{source.name}</strong>
            <span className={controls.muted}>{source.organization}. {source.measures}</span>
            <a href={source.datasetUrl}>Dataset</a>
            <a href={source.methodologyUrl}>Methodology</a>
            {source.publicationUrl ? <a href={source.publicationUrl}>Publication</a> : null}
            <span className={controls.muted}>{source.limit} {source.connected ? '' : 'Not connected.'} {source.transform}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}

function recordFor<T extends { iso2: string; name: string }>(
  feed: RemoteFeed<T[]>,
  country: { iso: string; name: string },
  sameCodeCount: number,
): T | undefined {
  if (!('data' in feed) || !feed.data) {
    return undefined
  }
  return matchingCountryRecord(feed.data, country, sameCodeCount)
}

const precisionLabels: Record<ConflictPrecision, string> = {
  exact: 'Event point. The source coded the location of the event.',
  nearby: 'Approximate point. The event is within 25 km of this point. The dot is not a boundary.',
  'area-point': 'Area shown as a point. The source knows an administrative area or a fuzzy region and coded a representative point, not its outline.',
  international: 'Event point in international waters or airspace.',
}

export function ConflictLegend({ events, omittedCountryOnly }: { events: ConflictEvent[]; omittedCountryOnly: number }) {
  const counts = new Map<ConflictPrecision, number>()
  for (const event of events) {
    counts.set(event.precision, (counts.get(event.precision) ?? 0) + 1)
  }
  return (
    <div>
      <ul className={styles.legend}>
        {(Object.keys(conflictPrecisionColor) as ConflictPrecision[]).map((precision) => (
          <li key={precision}>
            <i style={{ background: conflictPrecisionColor[precision] }} />
            <span>{counts.get(precision) ?? 0}. {precisionLabels[precision]}</span>
          </li>
        ))}
      </ul>
      <p className={controls.muted}>{omittedCountryOnly} events are known only at country level and are not drawn.</p>
    </div>
  )
}

export function ConflictCard({ event }: { event: ConflictEvent }) {
  return (
    <article className={styles.card}>
      <h2>{event.name}</h2>
      <p>{event.violence}. {event.country}{event.region ? `, ${event.region}` : ''}.</p>
      <p className={controls.muted}>{precisionLabels[event.precision]}</p>
      {event.dateStart ? <p className={controls.muted}>{event.dateStart}{event.dateEnd && event.dateEnd !== event.dateStart ? ` to ${event.dateEnd}` : ''}.</p> : null}
      {event.deathsBest !== undefined ? <p className={controls.muted}>Best fatality estimate {formatCount(event.deathsBest)}. This is the source figure for the event.</p> : null}
      {event.sourceUrl ? <p><a href={event.sourceUrl}>Source record</a></p> : null}
    </article>
  )
}

export function MineralFilters({
  present,
  selected,
  onToggle,
}: {
  present: string[]
  selected: ReadonlySet<string>
  onToggle: (id: string) => void
}) {
  const labels = mineralCategoryLabels.filter((category) => present.includes(category.id))
  return (
    <fieldset className={styles.layers}>
      <legend>Deposit categories</legend>
      {labels.map((category) => (
        <label key={category.id}>
          <input type="checkbox" checked={selected.has(category.id)} onChange={() => onToggle(category.id)} />
          <MineralGlyph symbol={category.symbol} color={category.color} />
          {category.label}
        </label>
      ))}
    </fieldset>
  )
}

export function ShadeScale({ lowColor, highColor, low, high, missingColor }: { lowColor: string; highColor: string; low: string; high: string; missingColor?: string }) {
  return (
    <div className={styles.scaleBlock}>
      <div className={styles.scale} style={{ background: `linear-gradient(90deg, ${lowColor}, ${highColor})` }} />
      <p className={controls.muted}>{low} to {high}</p>
      {missingColor ? <p className={controls.muted}><i className={styles.swatch} style={{ background: missingColor }} /> No data</p> : null}
    </div>
  )
}

export function MineralCard({ deposit }: { deposit: MineralDeposit }) {
  const rareEarth = deposit.categories.includes('rare-earth')
  return (
    <article className={styles.card}>
      <h2>{deposit.name}</h2>
      <p>{deposit.commodity || 'Commodity not named'}{deposit.country ? `. ${deposit.country}` : ''}.</p>
      <p className={controls.muted}>Geologic setting: {deposit.geologicSetting || 'not recorded'}.</p>
      <p className={controls.muted}>Development status: not recorded in this dataset. The point is a known deposit, not an active-mine record and not a closed-site record.</p>
      <p className={controls.muted}>Reserve or resource estimate: not in this dataset. No volume is inferred from the point.</p>
      {rareEarth ? <p className={controls.muted}>Rare earth elements are recorded as a group. A single element is not assigned.</p> : null}
      <p className={controls.muted}>Location precision: a regional point, expected within a few kilometres. It is not the outline of the deposit.</p>
      <p><a href={deposit.sourceUrl}>USGS record</a></p>
    </article>
  )
}

function statusLabel(feed: RemoteFeed<unknown>): string {
  switch (feed.status) {
    case 'loading':
      return 'Loading'
    case 'updated':
      return 'Updated'
    case 'cache':
      return feed.current ? 'Using cache' : 'Using saved copy'
    case 'error':
      return 'Update error'
    case 'unavailable':
      return 'Not connected'
    default:
      return 'Off until selected'
  }
}

function statusClass(feed: RemoteFeed<unknown>): string {
  return feed.status === 'error' ? controls.error : controls.muted
}

function feedDate(feed: RemoteFeed<unknown>): string | undefined {
  const hasData = 'data' in feed && feed.data !== undefined
  if (feed.status === 'error' && !hasData) {
    const checked = 'retrievedAt' in feed && feed.retrievedAt ? `Checked ${feed.retrievedAt.slice(0, 10)}. ` : ''
    return `${checked}${feed.error ?? 'Update error.'}`
  }
  if (!('retrievedAt' in feed) || !feed.retrievedAt) {
    return feed.status === 'error' && feed.error ? feed.error : undefined
  }
  const retrieved = `Last successful retrieval ${feed.retrievedAt.slice(0, 10)}.`
  const source = 'sourceUpdated' in feed && feed.sourceUpdated ? ` Source updated ${feed.sourceUpdated}.` : ''
  const stale = feed.status === 'error' ? ' This is the previous copy, not a new update.' : ''
  const error = feed.status === 'error' && feed.error ? ` ${feed.error}` : ''
  return `${retrieved}${source}${stale}${error}`
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

type PlanetSourceLayer = (typeof planetSources)[number]['layer']

function titleToLayer(title: string): PlanetSourceLayer | undefined {
  if (title === 'Armed conflicts') return 'conflicts'
  if (title === 'Forest resources' || title === 'Forest statistics' || title === 'Forest cover') return 'forests'
  if (title === 'Freshwater') return 'freshwater'
  if (title === 'Mineral resources') return 'minerals'
  if (title === 'Population') return 'population'
  return undefined
}
