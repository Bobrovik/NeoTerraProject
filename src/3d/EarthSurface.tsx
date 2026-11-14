import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { Component, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BackSide, BufferGeometry, Mesh, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector3, type Texture } from 'three'
import { earthSphereGeometry } from './earth-geometry'

const DAY = '/textures/earth/earth-day.jpg'
const BUMP = '/textures/earth/earth-bump.png'
const WATER = '/textures/earth/earth-water.png'
const NIGHT = '/textures/earth/earth-night.jpg'
const CLOUDS = '/textures/earth/earth-clouds.png'

const SUN = new Vector3(4, 2, 3).normalize()

const earthVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = cameraPosition - worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const earthFragment = `
  uniform sampler2D dayMap;
  uniform sampler2D bumpMap;
  uniform sampler2D waterMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 axis = abs(normal.y) > 0.92 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 tangent = normalize(cross(axis, normal));
    vec3 bitangent = normalize(cross(normal, tangent));
    float stepUv = 0.0016;
    float height = texture2D(bumpMap, vUv).r;
    float heightX = texture2D(bumpMap, vUv + vec2(stepUv, 0.0)).r;
    float heightY = texture2D(bumpMap, vUv + vec2(0.0, stepUv)).r;
    normal = normalize(normal + tangent * (heightX - height) * 1.8 + bitangent * (heightY - height) * 1.8);
    vec3 sun = normalize(sunDirection);
    vec3 viewDir = normalize(vView);
    float daylight = smoothstep(-0.12, 0.38, dot(normal, sun));
    vec3 dayColor = texture2D(dayMap, vUv).rgb;
    vec3 nightColor = texture2D(nightMap, vUv).rgb;
    float ocean = texture2D(waterMap, vUv).r;
    float specular = pow(max(dot(reflect(-sun, normal), viewDir), 0.0), 28.0) * ocean * daylight;
    vec3 color = dayColor * (0.045 + 0.955 * daylight) + nightColor * (1.0 - daylight) * 1.35;
    color += vec3(0.62, 0.78, 0.9) * specular * 0.55;
    gl_FragColor = vec4(color, 1.0);
  }
`

const atmosphereVertex = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragment = `
  varying vec3 vNormal;
  void main() {
    float rim = pow(0.58 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.6);
    gl_FragColor = vec4(0.20, 0.45, 0.68, clamp(rim, 0.0, 1.0) * 0.72);
  }
`

function useOwnedEarthGeometry(): BufferGeometry {
  const geometry = useMemo(() => {
    const next = earthSphereGeometry().clone()
    next.dispose = () => undefined
    return next
  }, [])
  useLayoutEffect(() => () => {
    BufferGeometry.prototype.dispose.call(geometry)
  }, [geometry])
  return geometry
}

function configureTextures(day: Texture, bump: Texture, water: Texture, night: Texture, clouds: Texture, anisotropy: number) {
  for (const texture of [day, night, clouds]) {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = anisotropy
  }
  bump.anisotropy = anisotropy
  water.anisotropy = anisotropy
}

export function SatelliteEarth({ showClouds }: { showClouds: boolean }) {
  const [day, bump, water, night, clouds] = useLoader(TextureLoader, [DAY, BUMP, WATER, NIGHT, CLOUDS])
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  useLayoutEffect(() => {
    configureTextures(day, bump, water, night, clouds, Math.min(anisotropy, 8))
  }, [anisotropy, bump, clouds, day, night, water])
  const geometry = useOwnedEarthGeometry()
  const material = useMemo(() => new ShaderMaterial({
    uniforms: {
      dayMap: { value: day },
      bumpMap: { value: bump },
      waterMap: { value: water },
      nightMap: { value: night },
      sunDirection: { value: SUN },
    },
    vertexShader: earthVertex,
    fragmentShader: earthFragment,
  }), [bump, day, night, water])
  useLayoutEffect(() => () => material.dispose(), [material])
  return (
    <>
      <mesh geometry={geometry} material={material} raycast={() => null} />
      <Atmosphere geometry={geometry} />
      {showClouds ? <CloudShell geometry={geometry} map={clouds} /> : null}
    </>
  )
}

function Atmosphere({ geometry }: { geometry: BufferGeometry }) {
  const material = useMemo(() => new ShaderMaterial({
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    side: BackSide,
    transparent: true,
    depthWrite: false,
  }), [])
  useLayoutEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} scale={1.028} renderOrder={1} raycast={() => null} />
}

function CloudShell({ geometry, map }: { geometry: BufferGeometry; map: Texture }) {
  const mesh = useRef<Mesh>(null)
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useFrame((_, delta) => {
    const current = mesh.current
    if (current && !reducedMotion) {
      current.rotation.y += delta * 0.012
    }
  })
  return (
    <mesh ref={mesh} geometry={geometry} scale={1.006} renderOrder={2} raycast={() => null}>
      <meshBasicMaterial map={map} transparent opacity={0.36} depthWrite={false} />
    </mesh>
  )
}

export class EarthBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <PlainOcean />
    }
    return this.props.children
  }
}

export function PlainOcean() {
  const geometry = useOwnedEarthGeometry()
  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshStandardMaterial color="#0d4a66" roughness={0.9} metalness={0.04} />
    </mesh>
  )
}
