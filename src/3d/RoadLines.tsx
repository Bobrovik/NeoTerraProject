import { useLayoutEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { resolveRoadPolyline } from '../domain/layout'
import type { CityObject, Road } from '../domain/types'

export function RoadLines({
  roads,
  objects,
  selectedRoadId,
  selectedPointIndex,
  editable,
  onSelectPoint,
}: {
  roads: Road[]
  objects: CityObject[]
  selectedRoadId: string | null
  selectedPointIndex: number | null
  editable: boolean
  onSelectPoint: (roadId: string, index: number) => void
}) {
  return (
    <>
      {(roads ?? []).map((road) => (
        <RoadLine key={road.id} road={road} objects={objects} selected={road.id === selectedRoadId} />
      ))}
      {editable
        ? (roads ?? []).flatMap((road) =>
            road.points.map((point, index) => {
              if (point.kind !== 'control') {
                return null
              }
              const selected = road.id === selectedRoadId && index === selectedPointIndex
              return (
                <mesh
                  key={`${road.id}:${index}`}
                  position={[point.x, 0.6, point.z]}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelectPoint(road.id, index)
                  }}
                >
                  <sphereGeometry args={[selected ? 0.9 : 0.6, 16, 16]} />
                  <meshStandardMaterial color={selected ? '#f4f7fb' : '#d7c4a3'} emissive={selected ? '#d7c4a3' : '#000000'} emissiveIntensity={selected ? 0.4 : 0} />
                </mesh>
              )
            }),
          )
        : null}
    </>
  )
}

function RoadLine({ road, objects, selected }: { road: Road; objects: CityObject[]; selected: boolean }) {
  const points = useMemo(() => resolveRoadPolyline(road, objects), [road, objects])
  const geometry = useMemo(() => {
    const positions = new Float32Array(Math.max(points.length - 1, 0) * 6)
    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index]
      const to = points[index + 1]
      if (!from || !to) {
        continue
      }
      const offset = index * 6
      positions[offset] = from.x
      positions[offset + 1] = from.y
      positions[offset + 2] = from.z
      positions[offset + 3] = to.x
      positions[offset + 4] = to.y
      positions[offset + 5] = to.z
    }
    const next = new BufferGeometry()
    next.setAttribute('position', new BufferAttribute(positions, 3))
    return next
  }, [points])

  useLayoutEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  if (points.length < 2) {
    return null
  }

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={selected ? '#f4f7fb' : '#b7a48a'} />
    </lineSegments>
  )
}
