import { useEffect, useRef, useState } from 'react'
import { GeoJSONSource, Map, ScaleControl, setWorkerUrl, type Map as MapInstance } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { appConfig } from '../../app/config'
import { objectMapAnchors, placementFromGeodetic, roadMapLines, mercatorMetersPerPixel, type MapPick } from '../../domain/map-placement'
import type { City, CityObject, Road } from '../../domain/types'
import styles from './CityMap.module.css'

setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.cjs`)

const EMPTY = { type: 'FeatureCollection' as const, features: [] }

type CityMapProps = {
  city: City
  objects: CityObject[]
  roads: Road[]
  selectedId: string | null
  pick: MapPick | null
  onPick: (pick: MapPick | null, message?: string) => void
  onSelectObject: (objectId: string) => void
}

export function CityMap({ city, objects, roads, selectedId, pick, onPick, onSelectObject }: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const pickRef = useRef(onPick)
  const selectRef = useRef(onSelectObject)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [metersPerPixel, setMetersPerPixel] = useState<number | undefined>()

  pickRef.current = onPick
  selectRef.current = onSelectObject

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const origin = { latitude: city.latitude, longitude: city.longitude }
    const map = new Map({
      container,
      style: appConfig.mapStyleUrl,
      center: [origin.longitude, origin.latitude],
      zoom: 15,
    })
    map.addControl(new ScaleControl({ maxWidth: 140, unit: 'metric' }), 'bottom-left')
    mapRef.current = map
    let settled = false
    const timer = window.setTimeout(() => {
      if (!settled) {
        setStatus('unavailable')
      }
    }, 12_000)

    const publishScale = () => {
      const center = map.getCenter()
      setMetersPerPixel(mercatorMetersPerPixel(center.lat, map.getZoom()))
    }

    map.on('load', () => {
      settled = true
      window.clearTimeout(timer)
      map.addSource('city-roads', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'city-roads',
        type: 'line',
        source: 'city-roads',
        paint: { 'line-color': '#8d9aaa', 'line-width': 3 },
      })
      map.addSource('city-objects', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'city-objects',
        type: 'circle',
        source: 'city-objects',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'selected'], true], 9, 6],
          'circle-color': '#d7a15f',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#1c2430',
        },
      })
      map.addSource('map-pick', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'map-pick',
        type: 'circle',
        source: 'map-pick',
        paint: {
          'circle-radius': 5,
          'circle-color': '#7eb6d6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#f4f7fb',
        },
      })
      publishScale()
      setStatus('ready')
    })
    map.on('error', (event) => {
      const message = event.error instanceof Error ? event.error.message : ''
      if (!settled && !map.isStyleLoaded() && /AJAXError|Failed to fetch|style/i.test(message)) {
        settled = true
        window.clearTimeout(timer)
        setStatus('unavailable')
      }
    })
    map.on('move', publishScale)
    map.on('click', (event) => {
      if (map.getLayer('city-objects')) {
        const features = map.queryRenderedFeatures(event.point, { layers: ['city-objects'] })
        const objectId = features[0]?.properties?.objectId
        if (typeof objectId === 'string' && objectId.length > 0) {
          selectRef.current(objectId)
          return
        }
      }
      const placed = placementFromGeodetic(origin, { latitude: event.lngLat.lat, longitude: event.lngLat.lng })
      if (!placed) {
        pickRef.current(null, 'This city is too close to a pole for the local meter frame.')
        return
      }
      pickRef.current(
        { ...placed, latitude: event.lngLat.lat, longitude: event.lngLat.lng },
        placed.outsideFrame ? 'That point is outside the 20 km local frame, so it is not stored.' : undefined,
      )
    })

    return () => {
      window.clearTimeout(timer)
      map.remove()
      mapRef.current = null
    }
  }, [city.latitude, city.longitude])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') {
      return
    }
    const roadsSource = map.getSource('city-roads')
    const objectsSource = map.getSource('city-objects')
    const pickSource = map.getSource('map-pick')
    if (!(roadsSource instanceof GeoJSONSource) || !(objectsSource instanceof GeoJSONSource) || !(pickSource instanceof GeoJSONSource)) {
      return
    }
    objectsSource.setData({
      type: 'FeatureCollection',
      features: objectMapAnchors(city, objects).map((anchor) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [anchor.longitude, anchor.latitude] },
        properties: { objectId: anchor.objectId, name: anchor.name, selected: anchor.objectId === selectedId },
      })),
    })
    roadsSource.setData({
      type: 'FeatureCollection',
      features: roadMapLines(city, roads, objects).map((line) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: line.coordinates },
        properties: { roadId: line.roadId },
      })),
    })
    pickSource.setData(
      pick
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [pick.longitude, pick.latitude] },
                properties: {},
              },
            ],
          }
        : EMPTY,
    )
  }, [city, objects, roads, selectedId, pick, status])

  const scaleText =
    metersPerPixel === undefined
      ? 'Scale appears after the map loads.'
      : `About ${metersPerPixel >= 10 ? metersPerPixel.toFixed(0) : metersPerPixel.toFixed(1)} m per pixel at the map center.`

  return (
    <div className={styles.root}>
      <div ref={containerRef} className={styles.canvas} />
      <div className={styles.readout}>
        <p>{scaleText}</p>
        <p>OpenFreeMap, OpenMapTiles, and OpenStreetMap. The scale bar is on the map.</p>
      </div>
      {status === 'unavailable' ? (
        <p className={styles.notice} role="status">
          The map source is unavailable. Overview, Layout, and Systems still open this city, and saved objects stay in local meters.
        </p>
      ) : null}
    </div>
  )
}
