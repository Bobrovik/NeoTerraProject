import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import { GlobeView } from '../../3d/GlobeView'
import { countries } from '../../3d/borders'
import { SceneBoundary } from '../../3d/SceneBoundary'
import { conflictPrecisionColor } from '../../domain/conflict-events'
import { depositsInCategories, mineralCategoryLabels, mineralMarker } from '../../domain/mineral-deposits'
import { forestCountryShades, forestShadeEnds, missingShadeColor, populationCountryShades, populationShadeEnds, rgbCss } from '../../domain/country-shade'
import { defaultPlanetLayers, togglePlanetLayer, type ForestRecord, type HydroFeature, type PlanetLayerId, type PopulationRecord } from '../../domain/planet-feed'
import { developmentStatusLabel } from '../../shared/labels'
import { ReliabilityBadge } from '../../shared/ui/ReliabilityBadge'
import controls from '../../shared/ui/controls.module.css'
import { ImportCityButton } from '../city/CityFileActions'
import { ConflictCard, ConflictLegend, CountryFacts, GlobeLegend, LayerStatus, MineralCard, MineralFilters, PlanetLayerToggles, ShadeScale } from './PlanetLayers'
import styles from './PlanetPage.module.css'
import { usePlanetFeeds, type RemoteFeed } from './usePlanetFeeds'

function toggleCategory(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]
}

function feedRows<T>(feed: RemoteFeed<T[]>): T[] {
  return 'data' in feed && feed.data ? feed.data : []
}

const emptyPopulationShade = { basis: 'none' as const, shades: [], lowLabel: '', highLabel: '', yearLabel: '' }
const emptyForestShade = { shades: [], lowLabel: '0% of land area', highLabel: '100% of land area', yearLabel: '' }

function shadeCountries(status: string, recordCount: number) {
  return recordCount > 0 || (status !== 'idle' && status !== 'loading') ? countries : []
}

function hydrographyFeatures(feed: RemoteFeed<HydroFeature[]>): HydroFeature[] {
  return 'data' in feed && feed.data ? feed.data : []
}

export function PlanetPage() {
  const { snapshot } = useReadyCatalog()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(snapshot.cities[0]?.id ?? null)
  const [formMessage, setFormMessage] = useState<string | undefined>()
  const [layers, setLayers] = useState(defaultPlanetLayers)
  const [countryName, setCountryName] = useState<string | null>(null)
  const [conflictId, setConflictId] = useState<string | null>(null)
  const [depositId, setDepositId] = useState<string | null>(null)
  const [mineralSelection, setMineralSelection] = useState<string[] | null>(null)
  const selected = snapshot.cities.find((city) => city.id === selectedId) ?? null
  const country = countries.find((item) => item.name === countryName) ?? null
  const feeds = usePlanetFeeds(layers, country?.iso ?? null)
  const water = hydrographyFeatures(feeds.hydrography)
  const rivers = useMemo(() => water.filter((feature) => feature.kind === 'river').map((feature) => feature.ring), [water])
  const lakes = useMemo(() => water.filter((feature) => feature.kind === 'lake').map((feature) => feature.ring), [water])
  const conflictFeed = 'data' in feeds.conflicts ? feeds.conflicts.data : undefined
  const mineralDeposits = useMemo(() => ('data' in feeds.minerals && feeds.minerals.data ? feeds.minerals.data : []), [feeds.minerals])
  const mineralCategories = useMemo(() => {
    const present = new Set(mineralDeposits.flatMap((deposit) => deposit.categories))
    return mineralCategoryLabels.filter((category) => present.has(category.id)).map((category) => category.id)
  }, [mineralDeposits])
  const activeMinerals = useMemo(() => new Set(mineralSelection ?? mineralCategories), [mineralSelection, mineralCategories])
  const shownDeposits = useMemo(() => depositsInCategories(mineralDeposits, activeMinerals), [mineralDeposits, activeMinerals])
  const conflictPoints = useMemo(
    () => (layers.conflicts && conflictFeed ? conflictFeed.events.map((event) => ({ id: event.id, latitude: event.latitude, longitude: event.longitude, color: conflictPrecisionColor[event.precision] })) : []),
    [layers.conflicts, conflictFeed],
  )
  const depositPoints = useMemo(
    () => (layers.minerals ? shownDeposits.map((deposit) => {
      const marker = mineralMarker(deposit.categories)
      return { id: deposit.id, latitude: deposit.latitude, longitude: deposit.longitude, color: marker.color, symbol: marker.symbol }
    }) : []),
    [layers.minerals, shownDeposits],
  )
  const selectedConflict = conflictFeed?.events.find((event) => event.id === conflictId)
  const selectedDeposit = shownDeposits.find((deposit) => deposit.id === depositId)
  const populationRecords = useMemo(() => feedRows<PopulationRecord>(feeds.population), [feeds.population])
  const forestRecords = useMemo(() => feedRows<ForestRecord>(feeds.forest), [feeds.forest])
  const populationShade = useMemo(
    () => (layers.population ? populationCountryShades(populationRecords, shadeCountries(feeds.population.status, populationRecords.length)) : emptyPopulationShade),
    [layers.population, populationRecords, feeds.population.status],
  )
  const forestShade = useMemo(
    () => (layers.forests ? forestCountryShades(forestRecords, shadeCountries(feeds.forest.status, forestRecords.length)) : emptyForestShade),
    [layers.forests, forestRecords, feeds.forest.status],
  )
  const bothShaded = populationShade.shades.length > 0 && forestShade.shades.length > 0

  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
    }
  }, [])

  return (
    <div className={styles.layout}>
      <div className={styles.viewport}>
        <GlobeLegend
          layers={layers}
          onToggle={(id: PlanetLayerId) => setLayers((current) => togglePlanetLayer(current, id))}
          population={{
            active: layers.population && populationShade.shades.length > 0,
            basis: populationShade.basis,
            low: populationShade.lowLabel,
            high: populationShade.highLabel,
            lowColor: rgbCss(populationShadeEnds.low),
            highColor: rgbCss(populationShadeEnds.high),
            yearLabel: populationShade.yearLabel,
            missingColor: rgbCss(missingShadeColor),
          }}
          forest={{
            active: layers.forests && forestShade.shades.length > 0,
            low: forestShade.lowLabel,
            high: forestShade.highLabel,
            lowColor: rgbCss(forestShadeEnds.low),
            highColor: rgbCss(forestShadeEnds.high),
            yearLabel: forestShade.yearLabel,
            missingColor: rgbCss(missingShadeColor),
          }}
          minerals={mineralCategoryLabels.filter((category) => mineralCategories.includes(category.id)).map((category) => ({ ...category, selected: activeMinerals.has(category.id) }))}
          onToggleMineral={(id) => setMineralSelection((current) => toggleCategory(current ?? mineralCategories, id))}
        />
        <SceneBoundary>
          <GlobeView
            cities={snapshot.cities}
            selectedId={selectedId}
            onSelect={setSelectedId}
            selectedCountryName={countryName}
            onSelectCountry={setCountryName}
            showFlags={layers.flags}
            showWater={layers.freshwater}
            rivers={rivers}
            lakes={lakes}
            conflictPoints={conflictPoints}
            depositPoints={depositPoints}
            populationShades={populationShade.shades}
            forestShades={forestShade.shades}
            populationOpacity={bothShaded ? 0.72 : 0.84}
            forestOpacity={bothShaded ? 0.5 : 0.84}
            onSelectConflict={setConflictId}
            onSelectDeposit={setDepositId}
          />
        </SceneBoundary>
      </div>
      <aside className={styles.side}>
        <p className={controls.muted}>Drag to rotate the globe. Scroll to zoom. Gold beacons are cities. Click a country name for its population. Extra layers stay off until checked.</p>
        <PlanetLayerToggles layers={layers} onToggle={(id: PlanetLayerId) => setLayers((current) => togglePlanetLayer(current, id))} />
        {country ? (
          <CountryFacts
            countryName={country.name}
            countryIso={country.iso}
            sameCodeCount={countries.filter((item) => item.iso === country.iso).length}
            population={feeds.population}
            forest={feeds.forest}
            freshwater={feeds.freshwater}
            showForest={layers.forests}
            showFreshwater={layers.freshwater}
          />
        ) : null}
        {layers.conflicts ? (
          <LayerStatus title="Armed conflicts" feed={feeds.conflicts} note="Points are UCDP candidate events. A dot is not a conflict boundary, and a country is not shaded." />
        ) : null}
        {layers.conflicts && conflictFeed ? <ConflictLegend events={conflictFeed.events} omittedCountryOnly={conflictFeed.omittedCountryOnly} /> : null}
        {selectedConflict ? <ConflictCard event={selectedConflict} /> : null}
        {layers.forests ? (
          <LayerStatus title="Forest resources" feed={feeds.forest} note="Each country is colored by its national forest area as a percent of land area. A higher percent is a stronger green. A country with no percent is gray, which is not the low end of the scale. The color is not the location of forest stands, and it is not a timber volume." />
        ) : null}
        {layers.forests && forestShade.shades.length > 0 ? (
          <ShadeScale lowColor={rgbCss(forestShadeEnds.low)} highColor={rgbCss(forestShadeEnds.high)} low={forestShade.lowLabel} high={forestShade.highLabel} missingColor={rgbCss(missingShadeColor)} />
        ) : null}
        {layers.freshwater ? (
          <LayerStatus title="Freshwater" feed={feeds.hydrography} note="Lines and lake shapes are Natural Earth. They show where a water body is drawn. The per-person figure in a country card is a separate AQUASTAT statistic." />
        ) : null}
        {layers.minerals ? (
          <LayerStatus title="Mineral resources" feed={feeds.minerals} note="Points are USGS major nonfuel deposits published through 2009. Oil, natural gas, reserves, and mine status are not in this file." />
        ) : null}
        {layers.minerals && mineralDeposits.length > 0 ? (
          <MineralFilters present={mineralCategories} selected={activeMinerals} onToggle={(id) => setMineralSelection((current) => toggleCategory(current ?? mineralCategories, id))} />
        ) : null}
        {selectedDeposit ? <MineralCard deposit={selectedDeposit} /> : null}
        {layers.population ? (
          <LayerStatus
            title="Population"
            feed={feeds.population}
            note={populationShade.basis === 'total'
              ? 'Countries are colored by total population on a log scale because this copy has no density. A country with no figure is gray, which is not the low end of the scale. The color is not the number of people standing in the shaded shape.'
              : 'Countries are colored by population density, people per km² of land area, on a log scale. A higher density is a stronger gold. A country without a density figure is gray, which is not the low end of the scale. The color is not a count of people inside the shape.'}
          />
        ) : null}
        {layers.population && populationShade.shades.length > 0 ? (
          <ShadeScale lowColor={rgbCss(populationShadeEnds.low)} highColor={rgbCss(populationShadeEnds.high)} low={populationShade.lowLabel} high={populationShade.highLabel} missingColor={rgbCss(missingShadeColor)} />
        ) : null}
        <ul className={styles.list}>
          {snapshot.cities.map((city) => (
            <li key={city.id}>
              <button type="button" className={styles.city} aria-pressed={city.id === selectedId} onClick={() => setSelectedId(city.id)}>
                <strong>{city.name}</strong>
                <span className={controls.muted}>{city.summary}</span>
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <article className={styles.card}>
            <div className={controls.row}>
              <h2>{selected.name}</h2>
              <ReliabilityBadge reliability={selected.reliability} />
            </div>
            <p>{selected.description}</p>
            <p className={controls.muted}>
              {developmentStatusLabel[selected.developmentStatus]} · {selected.latitude.toFixed(1)}°, {selected.longitude.toFixed(1)}°
            </p>
            <div className={controls.row}>
              <Link className={controls.button} to={`/cities/${selected.id}`}>Open city</Link>
              <Link className={controls.ghost} to={`/editor/${selected.id}`}>Open in editor</Link>
            </div>
          </article>
        ) : (
          <p className={controls.muted}>No cities are in the catalog.</p>
        )}
        <div className={controls.row}>
          <Link className={controls.button} to="/editor">Design a city</Link>
          <ImportCityButton
            onImported={(result) => {
              if (!result.ok) {
                setFormMessage(result.message)
                return
              }
              setFormMessage(undefined)
              setSelectedId(result.cityId)
              navigate(`/cities/${result.cityId}`)
            }}
          />
        </div>
        {formMessage ? <p className={controls.error}>{formMessage}</p> : null}
      </aside>
    </div>
  )
}
