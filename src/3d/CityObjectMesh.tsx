import type { ThreeEvent } from '@react-three/fiber'
import type { CityObject } from '../domain/types'

export function CityObjectMesh({
  object,
  selected,
  onSelect,
  onPointerDown,
}: {
  object: CityObject
  selected: boolean
  onSelect: (objectId: string) => void
  onPointerDown?: () => void
}) {
  const { position, rotation, size } = object.placement
  const color = object.representation.color

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    onSelect(object.id)
  }

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      onClick={select}
      onPointerDown={(event) => {
        event.stopPropagation()
        onPointerDown?.()
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
    >
      {object.representation.shape === 'box' ? (
        <boxGeometry args={[size.x, size.y, size.z]} />
      ) : (
        <cylinderGeometry args={[size.x / 2, size.x / 2, size.y, 28]} />
      )}
      <meshStandardMaterial
        color={selected ? '#f4f7fb' : color}
        emissive={selected ? color : '#000000'}
        emissiveIntensity={selected ? 0.45 : 0}
        roughness={0.72}
      />
    </mesh>
  )
}
