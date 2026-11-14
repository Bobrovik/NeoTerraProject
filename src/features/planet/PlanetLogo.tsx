import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box3, Color, DoubleSide, Mesh, MeshStandardMaterial, Vector3, type Group, type Material } from 'three'
import styles from './PlanetLogo.module.css'

const logoUrl = '/models/logo.glb'
const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function PlanetLogo({ placement = 'frame' }: { placement?: 'frame' | 'brand' }) {
  return (
    <div className={placement === 'brand' ? styles.brand : styles.logo} aria-hidden="true">
      <LogoBoundary>
        <Canvas
          camera={{ position: [0, 0.05, 2.6], fov: 32 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[2, 3, 2]} intensity={1.1} />
          <Suspense fallback={null}>
            <LogoModel />
          </Suspense>
        </Canvas>
      </LogoBoundary>
    </div>
  )
}

function LogoModel() {
  const gltf = useGLTF(logoUrl)
  const group = useRef<Group>(null)
  const fitted = useMemo(() => fitLogo(gltf.scene), [gltf.scene])

  useEffect(() => {
    const materials = fitted.materials
    return () => {
      for (const material of materials) {
        material.dispose()
      }
    }
  }, [fitted])

  useFrame((state, delta) => {
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.2)
    const shimmer = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 6.1 + 1.2)
    const mix = reducedMotion ? 0.7 : pulse * 0.8 + shimmer * 0.2
    if (group.current && !reducedMotion) {
      group.current.rotation.y += delta * 0.55
    }
    for (const material of fitted.materials) {
      material.emissiveIntensity = 0.2 + 0.6 * mix
      material.opacity = 0.72 + 0.28 * mix
    }
  })

  return (
    <group ref={group}>
      <group position={fitted.position} scale={fitted.scale}>
        <primitive object={fitted.scene} />
      </group>
    </group>
  )
}

function fitLogo(source: Group) {
  const scene = source.clone(true)
  const materials: MeshStandardMaterial[] = []
  scene.traverse((node) => {
    if (!(node instanceof Mesh)) {
      return
    }
    const sources = Array.isArray(node.material) ? node.material : [node.material]
    const next = sources.map((material) => glowMaterial(material, materials))
    node.material = Array.isArray(node.material) ? next : next[0]
  })
  const bounds = new Box3().setFromObject(scene)
  const size = bounds.getSize(new Vector3())
  const span = Math.max(size.x, size.y, size.z) || 1
  const scale = 1.55 / span
  const center = bounds.getCenter(new Vector3())
  return {
    scene,
    materials,
    scale,
    position: [-center.x * scale, -center.y * scale, -center.z * scale] as [number, number, number],
  }
}

function glowMaterial(material: Material, bucket: MeshStandardMaterial[]): Material {
  const next = material.clone()
  if (next instanceof MeshStandardMaterial) {
    next.emissive = new Color('#9fd4ef')
    next.emissiveIntensity = 0.45
    next.side = DoubleSide
    next.transparent = true
    next.opacity = 1
    bucket.push(next)
  }
  return next
}

class LogoBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

useGLTF.preload(logoUrl)
