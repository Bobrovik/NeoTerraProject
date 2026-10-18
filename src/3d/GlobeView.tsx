import { Html, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { latLonToVector3 } from '../domain/geo'
import type { City } from '../domain/types'
import { coasts, countries, fanFromRing, lineSegmentsFromRings, ribbonFromRings, type MapCountry } from './borders'
import { conflictZones, oceans } from './globe-marks'
import { StarField } from './StarField'

const RADIUS = 1

const countryLines = lineSegmentsFromRings(countries.flatMap((country) => country.rings), RADIUS * 1.012)
const continentEdges = ribbonFromRings(coasts, RADIUS * 1.02, 0.008)
const conflictFill = concatFloats(conflictZones.map((zone) => fanFromRing(zone.ring, RADIUS * 1.025)))
const conflictEdges = ribbonFromRings(conflictZones.map((zone) => zone.ring), RADIUS * 1.03, 0.0035)

export function GlobeView({
  cities,
  selectedId,
  onSelect,
}: {
  cities: City[]
  selectedId: string | null
  onSelect: (cityId: string) => void
}) {
  return (
    <Canvas camera={{ position: [0, 0.4, 3.1], fov: 45 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#05070d']} />
      <StarField count={1600} radius={8} size={0.045} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 2, 3]} intensity={1.2} />
      <mesh>
        <sphereGeometry args={[RADIUS, 64, 48]} />
        <meshStandardMaterial color="#0d4a66" roughness={0.9} metalness={0.04} />
      </mesh>
      <LineSegments positions={countryLines} color="#7f97a8" />
      <Ribbon positions={continentEdges} color="#f4f7fb" />
      <ConflictLayer />
      {oceans.map((ocean) => (
        <MapLabel key={ocean.name} latitude={ocean.latitude} longitude={ocean.longitude} text={ocean.name} />
      ))}
      {countries.map((country) => (
        <CountryLabel key={`${country.iso}-${country.name}`} country={country} />
      ))}
      {cities.map((city) => (
        <CityBeacon key={city.id} city={city} selected={city.id === selectedId} onSelect={onSelect} />
      ))}
      <OrbitControls enablePan={false} minDistance={1.45} maxDistance={6} autoRotate autoRotateSpeed={0.35} />
    </Canvas>
  )
}

function LineSegments({ positions, color }: { positions: Float32Array; color: string }) {
  const geometry = useMemo(() => {
    const next = new BufferGeometry()
    next.setAttribute('position', new BufferAttribute(positions, 3))
    return next
  }, [positions])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments geometry={geometry} raycast={() => null}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  )
}

function Ribbon({ positions, color }: { positions: Float32Array; color: string }) {
  const geometry = useMemo(() => {
    const next = new BufferGeometry()
    next.setAttribute('position', new BufferAttribute(positions, 3))
    return next
  }, [positions])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshBasicMaterial color={color} side={DoubleSide} />
    </mesh>
  )
}

function ConflictLayer() {
  const fill = useRef<MeshBasicMaterial>(null)
  const edge = useRef<MeshBasicMaterial>(null)
  const fillGeometry = useMemo(() => geometryFrom(conflictFill), [])
  const edgeGeometry = useMemo(() => geometryFrom(conflictEdges), [])
  useLayoutEffect(() => () => {
    fillGeometry.dispose()
    edgeGeometry.dispose()
  }, [fillGeometry, edgeGeometry])
  useFrame(({ clock }) => {
    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.4))
    if (fill.current) {
      fill.current.opacity = 0.22 + pulse * 0.28
    }
    if (edge.current) {
      edge.current.opacity = 0.55 + pulse * 0.45
    }
  })
  return (
    <>
      <mesh geometry={fillGeometry} raycast={() => null}>
        <meshBasicMaterial ref={fill} color="#ff2430" transparent opacity={0.4} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh geometry={edgeGeometry} raycast={() => null}>
        <meshBasicMaterial ref={edge} color="#ff5a62" transparent opacity={0.9} depthWrite={false} side={DoubleSide} />
      </mesh>
    </>
  )
}

function CountryLabel({ country }: { country: MapCountry }) {
  const label = useRef<HTMLDivElement>(null)
  const position = useMemo(() => latLonToVector3(country.label[1], country.label[0], RADIUS * 1.045), [country])
  useFrame(({ camera }) => {
    const element = label.current
    if (!element) {
      return
    }
    const facing = position.x * camera.position.x + position.y * camera.position.y + position.z * camera.position.z
    element.style.visibility = facing > 0.35 ? 'visible' : 'hidden'
  })
  return (
    <Html position={[position.x, position.y, position.z]} center distanceFactor={1.15} zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={label} style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#f4f7fb', fontSize: 11, lineHeight: 1, whiteSpace: 'nowrap', textShadow: '0 1px 2px #000' }}>
        <img src={`/flags/${country.iso.toLowerCase()}.svg`} alt="" width={12} height={8} />
        <span>{country.name}</span>
      </div>
    </Html>
  )
}

function MapLabel({ latitude, longitude, text }: { latitude: number; longitude: number; text: string }) {
  const position = useMemo(() => latLonToVector3(latitude, longitude, RADIUS * 1.03), [latitude, longitude])
  return (
    <Html position={[position.x, position.y, position.z]} center distanceFactor={1.5} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
      <span style={{ color: '#9fd0e4', fontSize: 13, letterSpacing: '0.04em', textShadow: '0 1px 2px #000' }}>{text}</span>
    </Html>
  )
}

function CityBeacon({ city, selected, onSelect }: { city: City; selected: boolean; onSelect: (cityId: string) => void }) {
  const core = useRef<Mesh>(null)
  const halo = useRef<Mesh>(null)
  const position = useMemo(() => latLonToVector3(city.latitude, city.longitude, RADIUS * 1.04), [city])
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(position.x, position.y, position.z).normalize()),
    [position],
  )
  useFrame(({ clock }) => {
    const beat = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 4)
    if (core.current) {
      const base = selected ? 1.4 : 1
      core.current.scale.setScalar(base * (0.82 + beat * 0.36))
      const material = core.current.material as MeshStandardMaterial
      material.emissiveIntensity = 0.4 + beat * 0.8
    }
    if (halo.current) {
      const wave = (clock.elapsedTime % 1.5) / 1.5
      halo.current.scale.setScalar(1 + wave * 2.6)
      const material = halo.current.material as MeshBasicMaterial
      material.opacity = 0.8 * (1 - wave)
    }
  })
  return (
    <group position={[position.x, position.y, position.z]} quaternion={quaternion}>
      <mesh ref={halo} raycast={() => null}>
        <ringGeometry args={[0.045, 0.07, 28]} />
        <meshBasicMaterial color="#f2d48a" transparent opacity={0.7} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh
        ref={core}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(city.id)
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial color={selected ? '#fff8ea' : '#e2c27a'} emissive="#e2c27a" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

function geometryFrom(positions: Float32Array): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  return geometry
}

function concatFloats(parts: Float32Array[]): Float32Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const values = new Float32Array(length)
  let offset = 0
  for (const part of parts) {
    values.set(part, offset)
    offset += part.length
  }
  return values
}
