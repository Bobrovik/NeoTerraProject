import { Html, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Camera, Color, DoubleSide, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, Quaternion, SRGBColorSpace, Vector3 } from 'three'
import { latLonToVector3 } from '../domain/geo'
import type { CountryShade } from '../domain/country-shade'
import { symbolTriangles, type MineralSymbol } from '../domain/mineral-symbols'
import type { City, Vec3 } from '../domain/types'
import { coasts, countries, countryShadeAttributes, fanFromRing, lineSegmentsFromRings, ribbonFromRings, type MapCountry, type MapRing } from './borders'
import { oceans } from './globe-marks'
import { StarField } from './StarField'

const RADIUS = 1

const countryLines = lineSegmentsFromRings(countries.flatMap((country) => country.rings), RADIUS * 1.012)
const continentEdges = ribbonFromRings(coasts, RADIUS * 1.02, 0.008)

export function GlobeView({
  cities,
  selectedId,
  onSelect,
  selectedCountryName,
  onSelectCountry,
  showFlags = false,
  showWater = false,
  rivers = [],
  lakes = [],
  conflictPoints = [],
  depositPoints = [],
  populationShades = [],
  forestShades = [],
  populationOpacity = 0.82,
  forestOpacity = 0.82,
  onSelectConflict,
  onSelectDeposit,
}: {
  cities: City[]
  selectedId: string | null
  onSelect: (cityId: string) => void
  selectedCountryName: string | null
  onSelectCountry: (name: string) => void
  showFlags?: boolean
  showWater?: boolean
  rivers?: MapRing[]
  lakes?: MapRing[]
  conflictPoints?: SurfacePoint[]
  depositPoints?: DepositPoint[]
  populationShades?: CountryShade[]
  forestShades?: CountryShade[]
  populationOpacity?: number
  forestOpacity?: number
  onSelectConflict?: (id: string) => void
  onSelectDeposit?: (id: string) => void
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
      <LineSegments positions={countryLines} color="#7f97a8" renderOrder={8} />
      <Ribbon positions={continentEdges} color="#f4f7fb" />
      {populationShades.length > 0 ? <CountryShadeLayer shades={populationShades} radius={RADIUS * 1.005} opacity={populationOpacity} renderOrder={2} /> : null}
      {forestShades.length > 0 ? <CountryShadeLayer shades={forestShades} radius={RADIUS * 1.009} opacity={forestOpacity} renderOrder={3} /> : null}
      {showWater ? <WaterLayer rivers={rivers} lakes={lakes} /> : null}
      {conflictPoints.length > 0 ? <SurfacePoints points={conflictPoints} onSelect={onSelectConflict} /> : null}
      {depositPoints.length > 0 ? <DepositSymbols points={depositPoints} onSelect={onSelectDeposit} /> : null}
      {oceans.map((ocean) => (
        <MapLabel key={ocean.name} latitude={ocean.latitude} longitude={ocean.longitude} text={ocean.name} />
      ))}
      {countries.map((country) => (
        <CountryLabel key={`${country.iso}-${country.name}`} country={country} selected={country.name === selectedCountryName} showFlag={showFlags} onSelect={onSelectCountry} />
      ))}
      {cities.map((city) => (
        <CityBeacon key={city.id} city={city} selected={city.id === selectedId} onSelect={onSelect} />
      ))}
      <OrbitControls enablePan={false} minDistance={1.45} maxDistance={6} autoRotate autoRotateSpeed={0.35} />
    </Canvas>
  )
}

function LineSegments({ positions, color, renderOrder = 0 }: { positions: Float32Array; color: string; renderOrder?: number }) {
  const geometry = useMemo(() => {
    const next = new BufferGeometry()
    next.setAttribute('position', new BufferAttribute(positions, 3))
    return next
  }, [positions])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments geometry={geometry} renderOrder={renderOrder} raycast={() => null}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  )
}

function CountryShadeLayer({ shades, radius, opacity, renderOrder }: { shades: CountryShade[]; radius: number; opacity: number; renderOrder: number }) {
  const geometry = useMemo(() => {
    const attributes = countryShadeAttributes(shades, radius)
    const next = new BufferGeometry()
    next.setAttribute('position', new BufferAttribute(attributes.positions, 3))
    next.setAttribute('color', new BufferAttribute(displayColorsToLinear(attributes.colors), 3))
    return next
  }, [shades, radius])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  if (geometry.getAttribute('position').count === 0) {
    return null
  }
  return (
    <mesh geometry={geometry} renderOrder={renderOrder} raycast={() => null}>
      <meshBasicMaterial vertexColors toneMapped={false} transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
    </mesh>
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

function WaterLayer({ rivers, lakes }: { rivers: MapRing[]; lakes: MapRing[] }) {
  const riverGeometry = useMemo(() => geometryFrom(lineSegmentsFromRings(rivers, RADIUS * 1.02)), [rivers])
  const lakeGeometry = useMemo(() => geometryFrom(concatFloats(lakes.map((ring) => fanFromRing(ring, RADIUS * 1.018)))), [lakes])
  useLayoutEffect(() => () => {
    riverGeometry.dispose()
    lakeGeometry.dispose()
  }, [riverGeometry, lakeGeometry])
  if (rivers.length === 0 && lakes.length === 0) {
    return null
  }
  return (
    <>
      <mesh geometry={lakeGeometry} raycast={() => null}>
        <meshBasicMaterial color="#1c7c9c" transparent opacity={0.45} depthWrite={false} side={DoubleSide} />
      </mesh>
      <lineSegments geometry={riverGeometry} raycast={() => null}>
        <lineBasicMaterial color="#9fd0e4" />
      </lineSegments>
    </>
  )
}

function SurfacePoints({ points, onSelect }: { points: SurfacePoint[]; onSelect?: (id: string) => void }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(points.length * 3)
    const colors = new Float32Array(points.length * 3)
    points.forEach((point, index) => {
      const position = latLonToVector3(point.latitude, point.longitude, RADIUS * 1.03)
      positions.set([position.x, position.y, position.z], index * 3)
      const color = hexColor(point.color)
      colors.set(color, index * 3)
    })
    const next = new BufferGeometry()
    next.setAttribute('position', new BufferAttribute(positions, 3))
    next.setAttribute('color', new BufferAttribute(colors, 3))
    return next
  }, [points])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return (
    <points
      geometry={geometry}
      onClick={(event) => {
        event.stopPropagation()
        const index = event.index
        const point = index === undefined ? undefined : points[index]
        if (point && onSelect) {
          onSelect(point.id)
        }
      }}
    >
      <pointsMaterial vertexColors size={5} sizeAttenuation={false} depthWrite={false} />
    </points>
  )
}

function CountryLabel({ country, selected, showFlag, onSelect }: { country: MapCountry; selected: boolean; showFlag: boolean; onSelect: (name: string) => void }) {
  const label = useRef<HTMLButtonElement>(null)
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
      <button
        ref={label}
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(country.name)}
        style={{ display: 'flex', alignItems: 'center', gap: 3, padding: 0, border: 0, background: 'transparent', color: selected ? '#fff4c2' : '#f4f7fb', font: 'inherit', fontSize: 11, lineHeight: 1, whiteSpace: 'nowrap', textShadow: '0 1px 2px #000', pointerEvents: 'auto', cursor: 'pointer' }}
      >
        {showFlag ? <img src={`/flags/${country.iso.toLowerCase()}.svg`} alt="" width={12} height={8} /> : null}
        <span>{country.name}</span>
      </button>
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

export type SurfacePoint = {
  id: string
  latitude: number
  longitude: number
  color: string
}

export type DepositPoint = SurfacePoint & {
  symbol: MineralSymbol
}

const symbolMarker = new Object3D()

function DepositSymbols({ points, onSelect }: { points: DepositPoint[]; onSelect?: (id: string) => void }) {
  const groups = useMemo(() => {
    const bySymbol = new Map<MineralSymbol, DepositPoint[]>()
    for (const point of points) {
      const list = bySymbol.get(point.symbol)
      if (list) {
        list.push(point)
      } else {
        bySymbol.set(point.symbol, [point])
      }
    }
    return [...bySymbol.entries()]
  }, [points])
  return groups.map(([symbol, group]) => <SymbolSet key={`${symbol}-${group.length}`} points={group} onSelect={onSelect} />)
}

function SymbolSet({ points, onSelect }: { points: DepositPoint[]; onSelect?: (id: string) => void }) {
  const mesh = useRef<InstancedMesh>(null)
  const symbol = points[0].symbol
  const color = points[0].color
  const geometry = useMemo(() => {
    const next = new BufferGeometry()
    next.setAttribute('position', new BufferAttribute(symbolTriangles(symbol), 3))
    return next
  }, [symbol])
  const material = useMemo(() => new MeshBasicMaterial({ color, side: DoubleSide, depthWrite: false }), [color])
  const positions = useMemo(
    () => points.map((point) => latLonToVector3(point.latitude, point.longitude, RADIUS * 1.035)),
    [points],
  )
  useLayoutEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  useLayoutEffect(() => {
    placeSymbols(mesh.current, positions, 0.02)
  }, [positions])
  useFrame(({ camera, size }) => {
    if (!(camera instanceof PerspectiveCamera)) {
      return
    }
    const factor = (11 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(size.height, 1)
    placeSymbols(mesh.current, positions, factor, camera)
  })
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, points.length]}
      geometry={geometry}
      material={material}
      dispose={null}
      frustumCulled={false}
      renderOrder={6}
      onClick={(event) => {
        event.stopPropagation()
        const index = event.instanceId
        const point = index === undefined ? undefined : points[index]
        if (point && onSelect) {
          onSelect(point.id)
        }
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
    />
  )
}

function placeSymbols(mesh: InstancedMesh | null, positions: Vec3[], factor: number, camera?: Camera) {
  if (!mesh) {
    return
  }
  positions.forEach((position, index) => {
    symbolMarker.position.set(position.x, position.y, position.z)
    if (camera) {
      const distance = Math.hypot(position.x - camera.position.x, position.y - camera.position.y, position.z - camera.position.z)
      symbolMarker.lookAt(camera.position)
      symbolMarker.scale.setScalar(Math.max(distance, 0.05) * factor)
    } else {
      symbolMarker.rotation.set(0, 0, 0)
      symbolMarker.scale.setScalar(factor)
    }
    symbolMarker.updateMatrix()
    mesh.setMatrixAt(index, symbolMarker.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
}

function displayColorsToLinear(colors: Float32Array): Float32Array {
  const color = new Color()
  const linear = new Float32Array(colors.length)
  for (let index = 0; index < colors.length; index += 3) {
    color.setRGB(colors[index], colors[index + 1], colors[index + 2], SRGBColorSpace)
    linear[index] = color.r
    linear[index + 1] = color.g
    linear[index + 2] = color.b
  }
  return linear
}

function hexColor(value: string): [number, number, number] {
  const hex = value.replace('#', '')
  return [Number.parseInt(hex.slice(0, 2), 16) / 255, Number.parseInt(hex.slice(2, 4), 16) / 255, Number.parseInt(hex.slice(4, 6), 16) / 255]
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
