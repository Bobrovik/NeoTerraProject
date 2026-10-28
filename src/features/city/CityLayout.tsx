import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useNavigate, useParams, useSearchParams } from 'react-router'
import { CityScene } from '../../3d/CityScene'
import { SceneBoundary } from '../../3d/SceneBoundary'
import type { MapPick } from '../../domain/map-placement'

const CityMap = lazy(() => import('./CityMap').then((module) => ({ default: module.CityMap })))
import { useReadyCatalog } from '../../data/useCatalog'
import { buildingTemplates } from '../../domain/buildings'
import {
  GRID_METERS,
  deleteObject,
  deleteRoad,
  moveObject,
  moveRoadControl,
  placeObject,
  rotateObject,
  snapToGrid,
  upsertRoad,
} from '../../domain/layout'
import type { CityElectricityReport } from '../../domain/balance'
import { electricityLineDraws, electricitySelection, electricityTones, reportDraftElectricity } from '../../domain/energy-view'
import { categoriesForCity, flowsForSystem, getCity, objectsForCity, systemsForCity } from '../../domain/queries'
import type { CameraView, LayoutTool, RoadPoint } from '../../domain/types'
import { EmptyState, LoadingState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import { EnergyBalancePanel } from '../systems/EnergyBalancePanel'
import { InfrastructureLayers } from './InfrastructureLayers'
import { ExportCityButton, ImportCityButton } from './CityFileActions'
import { cityBasePath, parseCityView, type CityIntent } from './city-view'
import { defaultInfrastructureLayers, flowsForLayers, linkLayerEntries, type InfrastructureLayersState } from './layers'
import styles from './CityLayout.module.css'

export function CityLayout({ intent }: { intent: CityIntent }) {
  const editing = intent === 'edit'
  const { snapshot, drafts, editCity, layoutSaved, layoutNote, resetCityLayout, exportLayouts, replaceLayouts } = useReadyCatalog()
  const { cityId, objectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const city = cityId ? getCity(snapshot, cityId) : undefined
  const parsedMode = parseCityView(searchParams.get('view'))
  const mode = !editing && (parsedMode === 'layout' || parsedMode === 'systems') ? 'overview' : parsedMode
  const category = searchParams.get('category')
  const [tool, setTool] = useState<LayoutTool>('select')
  const [templateId, setTemplateId] = useState(buildingTemplates[0]?.id ?? '')
  const [camera, setCamera] = useState<CameraView>('perspective')
  const [editorMessage, setEditorMessage] = useState<string | undefined>()
  const [activeRoadId, setActiveRoadId] = useState<string | null>(null)
  const [pendingPoints, setPendingPoints] = useState<RoadPoint[]>([])
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [layers, setLayers] = useState<InfrastructureLayersState>(defaultInfrastructureLayers)
  const [mapPick, setMapPick] = useState<MapPick | null>(null)
  const [mapMessage, setMapMessage] = useState<string | undefined>()
  const [energyView, setEnergyView] = useState(false)

  const objects = useMemo(() => (city ? objectsForCity(snapshot, city.id) : []), [snapshot, city])
  const categories = city ? categoriesForCity(snapshot, city.id) : []
  const systems = useMemo(() => (city ? systemsForCity(snapshot, city.id) : []), [snapshot, city])
  const visibleObjects = useMemo(
    () => (mode === 'layout' ? objects : objects.filter((object) => !category || object.categoryId === category)),
    [objects, category, mode],
  )
  const flows = useMemo(
    () => systems.flatMap((system) => flowsForSystem(snapshot, system.id)),
    [snapshot, systems],
  )
  const roads = useMemo(() => {
    const saved = city ? snapshot.roads.filter((road) => road.cityId === city.id) : []
    if (!city || !activeRoadId || pendingPoints.length === 0) {
      return saved
    }
    const draftRoad = { id: activeRoadId, cityId: city.id, points: pendingPoints }
    return saved.some((road) => road.id === activeRoadId) ? saved.map((road) => (road.id === activeRoadId ? draftRoad : road)) : [...saved, draftRoad]
  }, [snapshot.roads, city, activeRoadId, pendingPoints])
  const legend = useMemo(() => {
    const ids = new Set(flows.map((flow) => flow.resourceTypeId))
    return snapshot.resourceTypes.filter((resource) => ids.has(resource.id))
  }, [flows, snapshot.resourceTypes])
  const layerEntries = useMemo(() => linkLayerEntries(flows, snapshot.resourceTypes), [flows, snapshot.resourceTypes])
  const visibleFlows = useMemo(
    () => flowsForLayers(flows, snapshot.resourceTypes, layers),
    [flows, snapshot.resourceTypes, layers],
  )
  const cityDraft = drafts.find((draft) => draft.cityId === city?.id)
  const electricityReport = useMemo(
    () => (city ? reportDraftElectricity(objects, flows, cityDraft) : undefined),
    [city, objects, flows, cityDraft],
  )
  const energyLines = useMemo(
    () => (energyView && electricityReport ? electricityLineDraws(flows, visibleObjects, electricityReport) : []),
    [energyView, electricityReport, flows, visibleObjects],
  )
  const energyTones = useMemo(
    () => (energyView && electricityReport ? electricityTones(electricityReport) : undefined),
    [energyView, electricityReport],
  )
  const selectedObject = objectId ? objects.find((object) => object.id === objectId) : undefined
  const selectionCard = selectedObject && electricityReport && visibleObjects.some((object) => object.id === selectedObject.id)
    ? {
        position: {
          x: selectedObject.placement.position.x,
          y: selectedObject.placement.position.y + selectedObject.placement.size.y / 2 + 1.4,
          z: selectedObject.placement.position.z,
        },
        ...electricitySelection(selectedObject, electricityReport),
      }
    : null
  const energyMeter = mode !== 'map' && energyView && electricityReport ? electricityReport : undefined

  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
    }
  }, [])

  useEffect(() => {
    setMapPick(null)
    setMapMessage(undefined)
  }, [city?.id])

  if (!city) {
    return <EmptyState title="City not found" detail="That identifier is not in the catalog." action={<Link to="/planet">Back to the planet</Link>} />
  }

  const selectedCity = city

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next)
  }

  function selectObject(nextObjectId: string) {
    const search = searchParams.toString()
    navigate({ pathname: `${cityBasePath(editing, selectedCity.id)}/objects/${nextObjectId}`, search: search ? `?${search}` : '' })
  }

  function apply(change: Parameters<typeof editCity>[1]) {
    setEditorMessage(editCity(selectedCity.id, change))
  }

  function addRoadPoint(point: RoadPoint) {
    const roadId = activeRoadId ?? `road:${selectedCity.id.split(':')[1]}:${crypto.randomUUID()}`
    const basePoints = activeRoadId && pendingPoints.length > 0 ? pendingPoints : (snapshot.roads.find((road) => road.id === roadId)?.points ?? [])
    const points = [...basePoints, point]
    setActiveRoadId(roadId)
    setSelectedRoadId(roadId)
    setPendingPoints(points)
    if (points.length < 2) {
      return
    }
    apply((draft) => upsertRoad(draft, { id: roadId, cityId: selectedCity.id, points }))
  }

  function removeSelection(targetCityId: string) {
    if (selectedRoadId) {
      setEditorMessage(editCity(targetCityId, (draft) => deleteRoad(draft, selectedRoadId)))
      setSelectedRoadId(null)
      setSelectedPointIndex(null)
      setActiveRoadId(null)
      setPendingPoints([])
      return
    }
    if (objectId) {
      setEditorMessage(editCity(targetCityId, (draft) => deleteObject(draft, objectId)))
      navigate({ pathname: cityBasePath(editing, targetCityId), search: searchParams.toString() ? `?${searchParams.toString()}` : '' })
    }
  }

  function downloadLayout() {
    const blob = new Blob([exportLayouts()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'future-city-layout.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const template = buildingTemplates.find((item) => item.id === templateId)

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={controls.stack}>
          <div className={controls.row} role="group" aria-label="View mode">
            <button type="button" className={controls.toggle} aria-pressed={mode === 'overview'} onClick={() => setParam('view', null)}>Overview</button>
            {editing ? <button type="button" className={controls.toggle} aria-pressed={mode === 'layout'} onClick={() => setParam('view', 'layout')}>Layout</button> : null}
            {editing ? <button type="button" className={controls.toggle} aria-pressed={mode === 'systems'} onClick={() => setParam('view', 'systems')}>Systems</button> : null}
            <button type="button" className={controls.toggle} aria-pressed={mode === 'map'} onClick={() => setParam('view', 'map')}>Map</button>
          </div>
          <div className={controls.row}>
            {editing ? (
              <Link className={controls.ghost} to={{ pathname: `/cities/${selectedCity.id}`, search: searchParams.toString() ? `?${searchParams}` : '' }}>Open in viewer</Link>
            ) : (
              <Link className={controls.ghost} to={{ pathname: objectId ? `/editor/${selectedCity.id}/objects/${objectId}` : `/editor/${selectedCity.id}`, search: searchParams.toString() ? `?${searchParams}` : '' }}>Open in editor</Link>
            )}
            <ExportCityButton cityId={selectedCity.id} />
            <ImportCityButton
              onImported={(result) => {
                if (!result.ok) {
                  setEditorMessage(result.message)
                  return
                }
                setEditorMessage(undefined)
                navigate(cityBasePath(editing, result.cityId))
              }}
            />
          </div>
          {editing && mode === 'map' ? (
            <div className={controls.stack}>
              <div className={controls.row} role="group" aria-label="Building catalog">
                {buildingTemplates.map((item) => (
                  <button key={item.id} type="button" className={controls.toggle} aria-pressed={templateId === item.id} onClick={() => setTemplateId(item.id)}>
                    {item.name}
                  </button>
                ))}
              </div>
              <div className={controls.row}>
                <button
                  type="button"
                  className={controls.ghost}
                  disabled={!mapPick || mapPick.outsideFrame || !template}
                  onClick={() => {
                    if (!mapPick || mapPick.outsideFrame || !template) {
                      return
                    }
                    const id = `object:${selectedCity.id.split(':')[1]}:${crypto.randomUUID()}`
                    apply((draft) => placeObject(draft, template, mapPick.east, mapPick.north, id))
                    selectObject(id)
                  }}
                >
                  Place here
                </button>
              </div>
            </div>
          ) : mode === 'overview' || mode === 'systems' ? (
            <div className={controls.row} role="group" aria-label="Categories">
              <button type="button" className={controls.toggle} aria-pressed={!category} onClick={() => setParam('category', null)}>All</button>
              {categories.map((item) => (
                <button key={item.id} type="button" className={controls.toggle} aria-pressed={category === item.id} onClick={() => setParam('category', item.id)}>
                  {item.name}
                </button>
              ))}
            </div>
          ) : editing && mode === 'layout' ? (
            <div className={controls.stack}>
              <div className={controls.row} role="group" aria-label="Layout tool">
                <button type="button" className={controls.toggle} aria-pressed={tool === 'select'} onClick={() => setTool('select')}>Select</button>
                <button type="button" className={controls.toggle} aria-pressed={tool === 'place'} onClick={() => setTool('place')}>Place</button>
                <button type="button" className={controls.toggle} aria-pressed={tool === 'road'} onClick={() => { setTool('road'); setActiveRoadId(null); setPendingPoints([]) }}>Draw road</button>
                <button type="button" className={controls.toggle} aria-pressed={camera === 'top'} onClick={() => setCamera((current) => (current === 'top' ? 'perspective' : 'top'))}>
                  {camera === 'top' ? 'Perspective' : 'Top view'}
                </button>
                <button type="button" className={controls.ghost} onClick={() => objectId && apply((draft) => rotateObject(draft, objectId))}>Rotate</button>
                <button type="button" className={controls.ghost} onClick={() => removeSelection(selectedCity.id)}>Delete</button>
                <button type="button" className={controls.ghost} onClick={() => { setActiveRoadId(null); setPendingPoints([]) }}>Finish road</button>
              </div>
              <div className={controls.row} role="group" aria-label="Building catalog">
                {buildingTemplates.map((item) => (
                  <button key={item.id} type="button" className={controls.toggle} aria-pressed={templateId === item.id} onClick={() => { setTemplateId(item.id); setTool('place') }}>
                    {item.name}
                  </button>
                ))}
              </div>
              <div className={controls.row}>
                <button type="button" className={controls.ghost} onClick={downloadLayout}>Download JSON</button>
                <button type="button" className={controls.ghost} onClick={() => fileRef.current?.click()}>Load JSON</button>
                <button type="button" className={controls.ghost} onClick={() => { resetCityLayout(selectedCity.id); setEditorMessage(undefined) }}>Reset city</button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) {
                      return
                    }
                    void file.text().then((raw) => setEditorMessage(replaceLayouts(raw)))
                    event.target.value = ''
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
        {mode === 'systems' ? (
          <div className={styles.legend}>
            {legend.length === 0 ? <span>No links are configured for this city.</span> : null}
            {legend.map((resource) => (
              <span key={resource.id}><i className={styles.swatch} style={{ background: resource.color }} /> {resource.name}</span>
            ))}
          </div>
        ) : (
          <p className={controls.muted}>
            {mode === 'layout'
              ? `Grid is ${GRID_METERS} m. ${tool === 'place' && template ? `Placing ${template.name}. ` : ''}Roads are physical routes and do not create resource links.`
              : mode === 'map'
                ? editing
                  ? mapPick
                    ? `${mapPick.latitude.toFixed(5)}°, ${mapPick.longitude.toFixed(5)}° → ${mapPick.east.toFixed(1)} m east, ${mapPick.north.toFixed(1)} m north. Stored on the ${GRID_METERS} m grid as ${snapToGrid(mapPick.east).toFixed(0)} m east, ${snapToGrid(mapPick.north).toFixed(0)} m north.`
                    : 'Click the map to choose a point. Objects stay in local meters.'
                  : 'The map shows the saved city. Placement stays in the editor.'
                : 'Simple shapes stand in for buildings.'}
            {editing && layoutSaved ? ' Edits are saved in this browser.' : ''}
          </p>
        )}
      </div>
      {editorMessage || layoutNote || mapMessage ? <p className={controls.error}>{editorMessage ?? mapMessage ?? layoutNote}</p> : null}
      <div className={editing ? styles.stage : styles.stageWide}>
        <div className={styles.viewport}>
          {mode === 'map' ? null : (
            <button type="button" className={styles.energyToggle} aria-pressed={energyView} onClick={() => setEnergyView((current) => !current)}>
              Energy view
            </button>
          )}
          {energyMeter ? <EnergyMeter report={energyMeter} /> : null}
          {mode === 'map' ? null : (
            <InfrastructureLayers
              layers={layers}
              entries={layerEntries}
              onToggle={(key) => setLayers((current) => ({ ...current, [key]: !current[key] }))}
            />
          )}
          {mode === 'map' ? (
            <Suspense fallback={<LoadingState label="Loading map…" />}>
              <CityMap
                city={selectedCity}
                objects={objects}
                roads={roads}
                selectedId={objectId ?? null}
                pick={mapPick}
                onPick={(next, message) => {
                  setMapPick(next)
                  setMapMessage(message)
                }}
                onSelectObject={(nextObjectId) => {
                  setMapMessage(undefined)
                  selectObject(nextObjectId)
                }}
              />
            </Suspense>
          ) : visibleObjects.length === 0 && mode !== 'layout' && objects.length > 0 ? (
            <EmptyState title="Nothing in this category" detail="Choose another category to show objects again." />
          ) : (
            <SceneBoundary>
              <CityScene
                objects={visibleObjects}
                flows={visibleFlows}
                roads={roads}
                showBuildings={layers.buildings}
                showRoads={layers.roads}
                resourceTypes={snapshot.resourceTypes}
                mode={mode}
                camera={editing ? camera : 'perspective'}
                tool={editing ? tool : 'select'}
                selectedId={objectId ?? null}
                selectedRoadId={selectedRoadId}
                selectedPointIndex={selectedPointIndex}
                onSelect={(nextObjectId) => {
                  if (editing && mode === 'layout' && tool === 'road') {
                    addRoadPoint({ kind: 'object', objectId: nextObjectId })
                    return
                  }
                  setSelectedRoadId(null)
                  setSelectedPointIndex(null)
                  selectObject(nextObjectId)
                }}
                onGround={(x, z) => {
                  if (!editing) {
                    return
                  }
                  if (tool === 'place' && template) {
                    const id = `object:${selectedCity.id.split(':')[1]}:${crypto.randomUUID()}`
                    apply((draft) => placeObject(draft, template, x, z, id))
                    selectObject(id)
                    return
                  }
                  if (tool === 'road') {
                    addRoadPoint({ kind: 'control', x: snapToGrid(x), z: snapToGrid(z) })
                  }
                }}
                onMoveObject={(nextObjectId, x, z) => {
                  if (editing) {
                    apply((draft) => moveObject(draft, nextObjectId, x, z))
                  }
                }}
                onSelectRoadPoint={(roadId, index) => {
                  setSelectedRoadId(roadId)
                  setSelectedPointIndex(index)
                }}
                onMoveRoadPoint={(roadId, index, x, z) => {
                  if (editing) {
                    apply((draft) => moveRoadControl(draft, roadId, index, x, z))
                  }
                }}
                energyView={energyView}
                energyLines={energyLines}
                energyTones={energyTones}
                selectionCard={editing || energyView ? selectionCard : null}
              />
            </SceneBoundary>
          )}
          {!editing && selectedObject && (mode === 'map' || visibleObjects.some((object) => object.id === selectedObject.id)) ? (
            <SelectionCard
              name={selectedObject.name}
              purpose={categories.find((item) => item.id === selectedObject.categoryId)?.name ?? selectedObject.categoryId}
              description={selectedObject.description}
              metrics={electricityReport ? electricitySelection(selectedObject, electricityReport).lines : []}
            />
          ) : null}
        </div>
        {editing ? (
          <aside className={styles.panel}>
            {mode === 'systems' ? <EnergyBalancePanel cityId={selectedCity.id} /> : null}
            <Outlet />
          </aside>
        ) : null}
      </div>
    </div>
  )
}

function SelectionCard({ name, purpose, description, metrics }: { name: string; purpose: string; description: string; metrics: string[] }) {
  return (
    <section className={styles.selectionCard} aria-label="Selected object">
      <p className={styles.selectionTitle}>{name}</p>
      <p className={styles.selectionPurpose}>{purpose}</p>
      <p className={styles.selectionBody}>{description}</p>
      {metrics.map((line) => <p key={line} className={styles.selectionMetric}>{line}</p>)}
    </section>
  )
}

function EnergyMeter({ report }: { report: CityElectricityReport }) {
  const warning = report.status === 'ready' && report.balance.shortfall > 0
  return (
    <section className={warning ? `${styles.energyMeter} ${styles.energyMeterWarn}` : styles.energyMeter} aria-label="City energy balance">
      <p className={styles.energyMeterTitle}>Energy balance</p>
      {report.status === 'ready' ? (
        <dl className={styles.energyRows}>
          <div className={styles.energyRow}>
            <dt><MeterIcon kind="production" /> Production</dt>
            <dd>{report.balance.generated} <span className={styles.energyUnit}>kWh</span></dd>
          </div>
          <div className={styles.energyRow}>
            <dt><MeterIcon kind="consumption" /> Consumption</dt>
            <dd>{report.balance.requested} <span className={styles.energyUnit}>kWh</span></dd>
          </div>
          <div className={styles.energyRow}>
            <dt><MeterIcon kind="deficit" /> Deficit</dt>
            <dd>{report.balance.shortfall} <span className={styles.energyUnit}>kWh</span></dd>
          </div>
        </dl>
      ) : (
        <p className={styles.energyStatus}>
          {report.status === 'not-set'
            ? 'Parameters not set. No flow is drawn from missing rates.'
            : `Calculation impossible. ${report.message}`}
        </p>
      )}
    </section>
  )
}

function MeterIcon({ kind }: { kind: 'production' | 'consumption' | 'deficit' }) {
  const path = kind === 'production'
    ? 'M6 1.5v3M6 7.5v3M1.5 6h3M7.5 6h3M2.8 2.8l1.6 1.6M7.6 7.6l1.6 1.6M9.2 2.8 7.6 4.4M4.4 7.6 2.8 9.2'
    : kind === 'consumption'
      ? 'M6 1.2v6.2M3.4 5.2 6 7.8l2.6-2.6M2 10.2h8'
      : 'M6 1.4 10.6 10.2H1.4L6 1.4zM6 4.6v2.8M6 8.8v.6'
  return (
    <svg className={styles.energyIcon} viewBox="0 0 12 12" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
