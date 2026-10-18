import { Suspense, Component, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Box3, Vector3 } from 'three'
import type { SupplyTone } from '../domain/energy-view'
import { modelFit, primitiveFallback } from '../domain/model'
import type { CityObject, PrimitiveRepresentation, Vec3 } from '../domain/types'

const toneColor: Record<SupplyTone, string> = {
  supplied: '#6ea884',
  partial: '#d0b36a',
  deficit: '#d08a6a',
}

type MeshProps = {
  object: CityObject
  selected: boolean
  energyTone?: SupplyTone
  onSelect: (objectId: string) => void
  onPointerDown?: () => void
}

export function CityObjectMesh(props: MeshProps) {
  const { object } = props
  if (object.representation.kind !== 'model') {
    return <PrimitiveMesh {...props} appearance={object.representation} />
  }
  const appearance = primitiveFallback(object.representation)
  return (
    <ModelBoundary key={object.representation.url} fallback={<PrimitiveMesh {...props} appearance={appearance} />}>
      <Suspense fallback={<PrimitiveMesh {...props} appearance={appearance} />}>
        <ModelMesh {...props} url={object.representation.url} />
      </Suspense>
    </ModelBoundary>
  )
}

function PrimitiveMesh({ object, selected, energyTone, onSelect, onPointerDown, appearance }: MeshProps & { appearance: PrimitiveRepresentation }) {
  const { position, rotation, size } = object.placement
  return (
    <mesh
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      {...pointerProps(object.id, onSelect, onPointerDown)}
    >
      {appearance.shape === 'box' ? <boxGeometry args={[size.x, size.y, size.z]} /> : <cylinderGeometry args={[size.x / 2, size.x / 2, size.y, 28]} />}
      <meshStandardMaterial color={selected ? '#f4f7fb' : appearance.color} emissive={selected ? appearance.color : energyTone ? toneColor[energyTone] : '#000000'} emissiveIntensity={selected ? 0.45 : energyTone ? 0.4 : 0} roughness={0.72} />
      {energyTone ? <EnergyFrame size={size} color={toneColor[energyTone]} /> : null}
    </mesh>
  )
}

function ModelMesh({ object, selected, energyTone, onSelect, onPointerDown, url }: MeshProps & { url: string }) {
  const { position, rotation, size } = object.placement
  const gltf = useGLTF(url)
  const fitted = useMemo(() => {
    const clone = gltf.scene.clone(true)
    const bounds = new Box3().setFromObject(clone)
    const fit = modelFit(
      {
        min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
        max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
      },
      size,
    )
    return { clone, fit }
  }, [gltf.scene, size])

  return (
    <group position={[position.x, position.y, position.z]} rotation={[rotation.x, rotation.y, rotation.z]} {...pointerProps(object.id, onSelect, onPointerDown)}>
      <group position={[fitted.fit.offset.x, fitted.fit.offset.y, fitted.fit.offset.z]} scale={[fitted.fit.scale.x, fitted.fit.scale.y, fitted.fit.scale.z]}>
        <primitive object={fitted.clone} />
      </group>
      <mesh>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selected ? <SelectionFrame size={size} /> : null}
      {energyTone ? <EnergyFrame size={size} color={toneColor[energyTone]} /> : null}
    </group>
  )
}

function EnergyFrame({ size, color }: { size: Vec3; color: string }) {
  return (
    <mesh scale={[size.x * 1.08, size.y * 1.08, size.z * 1.08]} raycast={() => null}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  )
}

function SelectionFrame({ size }: { size: Vec3 }) {
  const box = useMemo(() => new Vector3(size.x, size.y, size.z), [size.x, size.y, size.z])
  return (
    <mesh scale={box}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#f4f7fb" wireframe />
    </mesh>
  )
}

function pointerProps(objectId: string, onSelect: (objectId: string) => void, onPointerDown?: () => void) {
  return {
    onClick: (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      onSelect(objectId)
    },
    onPointerDown: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      onPointerDown?.()
    },
    onPointerOver: () => {
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      document.body.style.cursor = ''
    },
  }
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback
    }
    return this.props.children
  }
}
