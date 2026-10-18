import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useNavigate, useParams, useSearchParams } from 'react-router'
import { CityScene } from '../../3d/CityScene'
import { SceneBoundary } from '../../3d/SceneBoundary'
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
import { categoriesForCity, flowsForSystem, getCity, objectsForCity, systemsForCity } from '../../domain/queries'
import type { CameraView, LayoutTool, RoadPoint } from '../../domain/types'
import { EmptyState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import { InfrastructureLayers } from './InfrastructureLayers'
import { parseCityView } from './city-view'
import { defaultInfrastructureLayers, flowsForLayers, linkLayerEntries, type InfrastructureLayersState } from './layers'
import styles from './CityLayout.module.css'

export function CityLayout() {
  const { snapshot, editCity, layoutSaved, layoutNote, resetCityLayout, exportLayouts, replaceLayouts } = useReadyCatalog()
  const { cityId, objectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const city = cityId ? getCity(snapshot, cityId) : undefined
  const mode = parseCityView(searchParams.get('view'))
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

  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
    }
  }, [])

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
    navigate({ pathname: `/cities/${selectedCity.id}/objects/${nextObjectId}`, search: search ? `?${search}` : '' })
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
      navigate({ pathname: `/cities/${targetCityId}`, search: searchParams.toString() ? `?${searchParams.toString()}` : '' })
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
            <button type="button" className={controls.toggle} aria-pressed={mode === 'layout'} onClick={() => setParam('view', 'layout')}>Layout</button>
            <button type="button" className={controls.toggle} aria-pressed={mode === 'systems'} onClick={() => setParam('view', 'systems')}>Systems</button>
          </div>
          {mode !== 'layout' ? (
            <div className={controls.row} role="group" aria-label="Categories">
              <button type="button" className={controls.toggle} aria-pressed={!category} onClick={() => setParam('category', null)}>All</button>
              {categories.map((item) => (
                <button key={item.id} type="button" className={controls.toggle} aria-pressed={category === item.id} onClick={() => setParam('category', item.id)}>
                  {item.name}
                </button>
              ))}
            </div>
          ) : (
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
          )}
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
              : 'Simple shapes stand in for buildings.'}
            {layoutSaved ? ' Edits are saved in this browser.' : ''}
          </p>
        )}
      </div>
      {editorMessage || layoutNote ? <p className={controls.error}>{editorMessage ?? layoutNote}</p> : null}
      <div className={styles.stage}>
        <div className={styles.viewport}>
          <InfrastructureLayers
            layers={layers}
            entries={layerEntries}
            onToggle={(key) => setLayers((current) => ({ ...current, [key]: !current[key] }))}
          />
          {visibleObjects.length === 0 && mode !== 'layout' && objects.length > 0 ? (
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
                camera={camera}
                tool={tool}
                selectedId={objectId ?? null}
                selectedRoadId={selectedRoadId}
                selectedPointIndex={selectedPointIndex}
                onSelect={(nextObjectId) => {
                  if (mode === 'layout' && tool === 'road') {
                    addRoadPoint({ kind: 'object', objectId: nextObjectId })
                    return
                  }
                  setSelectedRoadId(null)
                  setSelectedPointIndex(null)
                  selectObject(nextObjectId)
                }}
                onGround={(x, z) => {
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
                onMoveObject={(nextObjectId, x, z) => apply((draft) => moveObject(draft, nextObjectId, x, z))}
                onSelectRoadPoint={(roadId, index) => {
                  setSelectedRoadId(roadId)
                  setSelectedPointIndex(index)
                }}
                onMoveRoadPoint={(roadId, index, x, z) => apply((draft) => moveRoadControl(draft, roadId, index, x, z))}
              />
            </SceneBoundary>
          )}
        </div>
        <aside className={styles.panel}>
          <Outlet />
        </aside>
      </div>
    </div>
  )
}
