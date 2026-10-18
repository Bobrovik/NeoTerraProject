import { Html } from '@react-three/drei'
import type { Vec3 } from '../domain/types'
import overlay from './EnergyOverlay.module.css'

export function EnergyCard({
  position,
  title,
  lines,
}: {
  position: Vec3
  title: string
  lines: string[]
}) {
  return (
    <Html position={[position.x, position.y, position.z]} center sprite distanceFactor={32} zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
      <div className={overlay.card}>
        <strong>{title}</strong>
        {lines.map((line) => <span key={line}>{line}</span>)}
      </div>
    </Html>
  )
}
