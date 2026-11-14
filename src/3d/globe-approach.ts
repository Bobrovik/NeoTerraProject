import type { Vec3 } from '../domain/types'

/** Closest orbit distance. The globe radius is 1, and this stays outside the surface marks. */
export const globeCloseDistance = 1.45

export const globeApproachSeconds = 2

export function approachCameraPosition(startPosition: Vec3, cityDirection: Vec3, closeDistance: number, progress: number): Vec3 {
  const t = smoothstep(clamp01(progress))
  const startDistance = length(startPosition)
  const direction = slerpUnit(normalize(startPosition), normalize(cityDirection), t)
  const distance = Math.max(closeDistance, startDistance + (closeDistance - startDistance) * t)
  return scale(direction, distance)
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function length(value: Vec3): number {
  return Math.hypot(value.x, value.y, value.z)
}

function scale(value: Vec3, factor: number): Vec3 {
  return { x: value.x * factor, y: value.y * factor, z: value.z * factor }
}

function add(left: Vec3, right: Vec3): Vec3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z }
}

function dot(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z
}

function normalize(value: Vec3): Vec3 {
  const magnitude = length(value)
  if (magnitude === 0) {
    return { x: 0, y: 0, z: 1 }
  }
  return scale(value, 1 / magnitude)
}

function slerpUnit(from: Vec3, to: Vec3, t: number): Vec3 {
  const cos = Math.min(1, Math.max(-1, dot(from, to)))
  const omega = Math.acos(cos)
  if (omega < 1e-4) {
    return from
  }
  if (Math.PI - omega < 1e-3) {
    return rotate(from, orthogonal(from), Math.PI * t)
  }
  const sin = Math.sin(omega)
  return normalize(add(scale(from, Math.sin((1 - t) * omega) / sin), scale(to, Math.sin(t * omega) / sin)))
}

function orthogonal(value: Vec3): Vec3 {
  const helper = Math.abs(value.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }
  return normalize({
    x: value.y * helper.z - value.z * helper.y,
    y: value.z * helper.x - value.x * helper.z,
    z: value.x * helper.y - value.y * helper.x,
  })
}

function rotate(value: Vec3, axis: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const projection = dot(axis, value)
  const cross = {
    x: axis.y * value.z - axis.z * value.y,
    y: axis.z * value.x - axis.x * value.z,
    z: axis.x * value.y - axis.y * value.x,
  }
  return normalize({
    x: value.x * cos + cross.x * sin + axis.x * projection * (1 - cos),
    y: value.y * cos + cross.y * sin + axis.y * projection * (1 - cos),
    z: value.z * cos + cross.z * sin + axis.z * projection * (1 - cos),
  })
}
