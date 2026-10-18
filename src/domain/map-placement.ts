import { resolveRoadPolyline } from './layout'
import {
  LOCAL_FRAME_RADIUS_METERS,
  geodeticToLocal,
  localToGeodetic,
  type GeodeticPoint,
} from './geo'
import type { CityObject, Road } from './types'

const WEB_MERCATOR_CIRCUMFERENCE = 2 * Math.PI * 6_378_137
const MAPLIBRE_TILE_SIZE = 512

export type MapPlacement = {
  east: number
  north: number
  outsideFrame: boolean
}

export type MapPick = MapPlacement & GeodeticPoint

export type MapAnchor = {
  objectId: string
  name: string
  latitude: number
  longitude: number
}

export type MapLine = {
  roadId: string
  coordinates: [number, number][]
}

/** Click or marker conversion. Zoom and pixels are not inputs and are not stored. */
export function placementFromGeodetic(origin: GeodeticPoint, point: GeodeticPoint): MapPlacement | undefined {
  const local = geodeticToLocal(origin, point)
  if (!local) {
    return undefined
  }
  return {
    east: local.east,
    north: local.north,
    outsideFrame: Math.hypot(local.east, local.north) > LOCAL_FRAME_RADIUS_METERS,
  }
}

export function objectMapAnchors(origin: GeodeticPoint, objects: CityObject[]): MapAnchor[] {
  const anchors: MapAnchor[] = []
  for (const object of objects) {
    const point = localToGeodetic(origin, {
      east: object.placement.position.x,
      north: object.placement.position.z,
    })
    if (!point) {
      continue
    }
    anchors.push({
      objectId: object.id,
      name: object.name,
      latitude: point.latitude,
      longitude: point.longitude,
    })
  }
  return anchors
}

export function roadMapLines(origin: GeodeticPoint, roads: Road[], objects: CityObject[]): MapLine[] {
  const lines: MapLine[] = []
  for (const road of roads) {
    const coordinates: [number, number][] = []
    for (const point of resolveRoadPolyline(road, objects)) {
      const geodetic = localToGeodetic(origin, { east: point.x, north: point.z })
      if (geodetic) {
        coordinates.push([geodetic.longitude, geodetic.latitude])
      }
    }
    if (coordinates.length >= 2) {
      lines.push({ roadId: road.id, coordinates })
    }
  }
  return lines
}

/**
 * Ground size of one screen pixel in Web Mercator at the given latitude and zoom.
 * This labels the map view only. Object records do not use it.
 */
export function mercatorMetersPerPixel(latitude: number, zoom: number): number | undefined {
  if (!Number.isFinite(latitude) || !Number.isFinite(zoom) || Math.abs(latitude) > 90) {
    return undefined
  }
  return (WEB_MERCATOR_CIRCUMFERENCE * Math.cos((latitude * Math.PI) / 180)) / (MAPLIBRE_TILE_SIZE * 2 ** zoom)
}
