import { useLayoutEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Quaternion, Vector3 } from 'three'
import type { FlowSegment } from '../domain/flows'

export function FlowLines({ segments }: { segments: FlowSegment[] }) {
  return (
    <>
      {segments.map((segment) => (
        <FlowLine key={segment.flowId} segment={segment} />
      ))}
    </>
  )
}

function FlowLine({ segment }: { segment: FlowSegment }) {
  const geometry = useMemo(() => {
    const next = new BufferGeometry()
    next.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          segment.from.x,
          segment.from.y + 2,
          segment.from.z,
          segment.to.x,
          segment.to.y + 2,
          segment.to.z,
        ]),
        3,
      ),
    )
    return next
  }, [segment])

  useLayoutEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  const arrow = useMemo(() => arrowPose(segment), [segment])

  return (
    <>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={segment.color} />
      </lineSegments>
      <mesh position={arrow.position} quaternion={arrow.quaternion}>
        <coneGeometry args={[0.7, 2.2, 8]} />
        <meshStandardMaterial color={segment.color} />
      </mesh>
    </>
  )
}

function arrowPose(segment: FlowSegment): { position: [number, number, number]; quaternion: Quaternion } {
  const from = new Vector3(segment.from.x, segment.from.y + 2, segment.from.z)
  const to = new Vector3(segment.to.x, segment.to.y + 2, segment.to.z)
  const direction = to.clone().sub(from)
  const length = direction.length()
  const position = from.clone().add(direction.normalize().multiplyScalar(Math.max(length - 1.4, length * 0.7)))
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction)
  return { position: [position.x, position.y, position.z], quaternion }
}
