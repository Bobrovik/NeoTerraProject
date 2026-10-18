import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Quaternion, Vector3, type Mesh } from 'three'
import type { EnergyLineDraw, EnergyLineTone } from '../domain/energy-view'
import overlay from './EnergyOverlay.module.css'

const toneColor: Record<EnergyLineTone, string> = {
  active: '#6ea884',
  limited: '#d0b36a',
  offline: '#a86a68',
  unknown: '#6d7c88',
}

export function EnergyGrid({ lines }: { lines: EnergyLineDraw[] }) {
  return (
    <>
      {lines.map((line) => (
        <EnergyLine key={line.flowId} line={line} />
      ))}
    </>
  )
}

function EnergyLine({ line }: { line: EnergyLineDraw }) {
  const color = toneColor[line.tone]
  const geometry = useMemo(() => {
    const next = new BufferGeometry()
    next.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([
        line.from.x, line.from.y + 2, line.from.z,
        line.to.x, line.to.y + 2, line.to.z,
      ]), 3),
    )
    return next
  }, [line.from.x, line.from.y, line.from.z, line.to.x, line.to.y, line.to.z])

  useLayoutEffect(() => () => geometry.dispose(), [geometry])

  const arrow = useMemo(() => arrowPose(line), [line])
  const labelAt: [number, number, number] = [
    (line.from.x + line.to.x) / 2,
    (line.from.y + line.to.y) / 2 + 3.2,
    (line.from.z + line.to.z) / 2,
  ]

  return (
    <>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} transparent opacity={line.tone === 'offline' || line.tone === 'unknown' ? 0.45 : 1} />
      </lineSegments>
      <mesh position={arrow.position} quaternion={arrow.quaternion}>
        <coneGeometry args={[0.55, 1.8, 8]} />
        <meshStandardMaterial color={color} transparent opacity={line.tone === 'unknown' ? 0.45 : 1} />
      </mesh>
      {line.animate ? <FlowPulse from={line.from} to={line.to} color={color} /> : null}
      {line.label ? (
        <Html position={labelAt} center sprite distanceFactor={36} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <span className={overlay.label}>{line.label}</span>
        </Html>
      ) : null}
    </>
  )
}

function FlowPulse({ from, to, color }: { from: EnergyLineDraw['from']; to: EnergyLineDraw['to']; color: string }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) {
      return
    }
    const t = (clock.elapsedTime % 2.4) / 2.4
    mesh.position.set(
      from.x + (to.x - from.x) * t,
      from.y + 2.6 + (to.y - from.y) * t,
      from.z + (to.z - from.z) * t,
    )
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.38, 10, 10]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function arrowPose(line: EnergyLineDraw): { position: [number, number, number]; quaternion: Quaternion } {
  const from = new Vector3(line.from.x, line.from.y + 2, line.from.z)
  const to = new Vector3(line.to.x, line.to.y + 2, line.to.z)
  const direction = to.clone().sub(from)
  const length = direction.length()
  const position = from.clone().add(direction.normalize().multiplyScalar(Math.max(length - 1.4, length * 0.7)))
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction)
  return { position: [position.x, position.y, position.z], quaternion }
}
