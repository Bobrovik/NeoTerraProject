import type { ObjectRepresentation, PrimitiveRepresentation, Vec3 } from './types'

export function primitiveFallback(representation: ObjectRepresentation): PrimitiveRepresentation {
  if (representation.kind === 'primitive') {
    return representation
  }
  return { kind: 'primitive', shape: representation.fallback.shape, color: representation.fallback.color }
}

export type AxisBox = {
  min: Vec3
  max: Vec3
}

/**
 * Scale a model so its bounding box matches the stored size in meters,
 * then shift it so that box is centered on the stored position.
 * The result does not depend on camera distance or screen size.
 */
export function modelFit(box: AxisBox, size: Vec3): { scale: Vec3; offset: Vec3 } {
  const span = {
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z,
  }
  const scale = {
    x: span.x > 1e-8 ? size.x / span.x : 1,
    y: span.y > 1e-8 ? size.y / span.y : 1,
    z: span.z > 1e-8 ? size.z / span.z : 1,
  }
  const center = {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2,
  }
  return {
    scale,
    offset: {
      x: center.x === 0 ? 0 : -center.x * scale.x,
      y: center.y === 0 ? 0 : -center.y * scale.y,
      z: center.z === 0 ? 0 : -center.z * scale.z,
    },
  }
}
