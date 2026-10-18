import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { resolveFlowSegments } from '../domain/flows'
import type { CameraView, CityObject, CityViewMode, LayoutTool, ResourceFlow, ResourceType, Road } from '../domain/types'
import { CityObjectMesh } from './CityObjectMesh'
import { FlowLines } from './FlowLines'
import { RoadLines } from './RoadLines'
import { StarField } from './StarField'

export function CityScene({
  objects,
  flows,
  roads,
  resourceTypes,
  mode,
  showBuildings,
  showRoads,
  camera,
  tool,
  selectedId,
  selectedRoadId,
  selectedPointIndex,
  onSelect,
  onGround,
  onMoveObject,
  onSelectRoadPoint,
  onMoveRoadPoint,
}: {
  objects: CityObject[]
  flows: ResourceFlow[]
  roads: Road[]
  resourceTypes: ResourceType[]
  mode: CityViewMode
  showBuildings: boolean
  showRoads: boolean
  camera: CameraView
  tool: LayoutTool
  selectedId: string | null
  selectedRoadId: string | null
  selectedPointIndex: number | null
  onSelect: (objectId: string) => void
  onGround: (x: number, z: number) => void
  onMoveObject: (objectId: string, x: number, z: number) => void
  onSelectRoadPoint: (roadId: string, index: number) => void
  onMoveRoadPoint: (roadId: string, index: number, x: number, z: number) => void
}) {
  const segments = useMemo(
    () => resolveFlowSegments(flows, objects, resourceTypes, new Set(objects.map((object) => object.id))),
    [flows, objects, resourceTypes],
  )
  const drag = useRef<
    | { kind: 'object'; id: string }
    | { kind: 'point'; roadId: string; index: number }
    | null
  >(null)

  return (
    <Canvas camera={{ position: [48, 36, 48], fov: 42 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#05070d']} />
      <StarField count={1200} radius={520} size={1.5} sizeAttenuation={false} />
      <ambientLight intensity={0.62} />
      <directionalLight position={[40, 60, 20]} intensity={1.15} />
      <gridHelper args={mode === 'layout' ? [160, 40, '#6d8294', '#2a3844'] : [140, 28, '#3d4e5c', '#24303a']} />
      <CameraRig mode={camera} />
      <DragLock drag={drag} />
      {mode === 'layout' ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          onClick={(event) => {
            if (drag.current) {
              return
            }
            event.stopPropagation()
            onGround(event.point.x, event.point.z)
          }}
          onPointerMove={(event) => {
            const active = drag.current
            if (!active) {
              return
            }
            event.stopPropagation()
            if (active.kind === 'object') {
              onMoveObject(active.id, event.point.x, event.point.z)
            } else {
              onMoveRoadPoint(active.roadId, active.index, event.point.x, event.point.z)
            }
          }}
          onPointerUp={() => {
            drag.current = null
          }}
        >
          <planeGeometry args={[160, 160]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      {showBuildings
        ? objects.map((object) => (
            <CityObjectMesh
              key={object.id}
              object={object}
              selected={object.id === selectedId}
              onSelect={onSelect}
              onPointerDown={
                mode === 'layout' && tool === 'select'
                  ? () => {
                      drag.current = { kind: 'object', id: object.id }
                    }
                  : undefined
              }
            />
          ))
        : null}
      {showRoads ? (
        <RoadLines
          roads={roads}
          objects={objects}
          selectedRoadId={selectedRoadId}
          selectedPointIndex={selectedPointIndex}
          editable={mode === 'layout'}
          onSelectPoint={(roadId, index) => {
            drag.current = { kind: 'point', roadId, index }
            onSelectRoadPoint(roadId, index)
          }}
        />
      ) : null}
      <FlowLines segments={segments} />
      <OrbitControls makeDefault maxPolarAngle={camera === 'top' ? 0.35 : Math.PI / 2.05} minPolarAngle={camera === 'top' ? 0 : 0} target={[0, 0, 0]} />
    </Canvas>
  )
}

function DragLock({ drag }: { drag: { current: unknown } }) {
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null

  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (controls) {
        controls.enabled = drag.current === null
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [controls, drag])

  return null
}

function CameraRig({ mode }: { mode: CameraView }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as { target: { set: (x: number, y: number, z: number) => void }; update: () => void } | null

  useEffect(() => {
    if (mode === 'top') {
      camera.position.set(0, 120, 0.01)
    } else {
      camera.position.set(48, 36, 48)
    }
    camera.lookAt(0, 0, 0)
    controls?.target.set(0, 0, 0)
    controls?.update()
  }, [mode, camera, controls])

  return null
}
