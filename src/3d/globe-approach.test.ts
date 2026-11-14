import { describe, expect, it } from 'vitest'
import { latLonToVector3 } from '../domain/geo'
import { approachCameraPosition, globeCloseDistance } from './globe-approach'

describe('city approach camera', () => {
  const start = { x: 0, y: 0.4, z: 3.1 }
  const aurora = latLonToVector3(6.8, 22.4, 1)

  it('starts at the current camera and ends on the city at the closest distance', () => {
    const startPose = approachCameraPosition(start, aurora, globeCloseDistance, 0)
    expect(startPose.x).toBeCloseTo(start.x)
    expect(startPose.y).toBeCloseTo(start.y)
    expect(startPose.z).toBeCloseTo(start.z)
    const end = approachCameraPosition(start, aurora, globeCloseDistance, 1)
    const endLength = Math.hypot(end.x, end.y, end.z)
    expect(endLength).toBeCloseTo(globeCloseDistance)
    const alignment = (end.x * aurora.x + end.y * aurora.y + end.z * aurora.z) / endLength
    expect(alignment).toBeCloseTo(1)
  })

  it('stays at least as far as the closest distance while it moves', () => {
    for (const progress of [0.15, 0.4, 0.75]) {
      const pose = approachCameraPosition(start, aurora, globeCloseDistance, progress)
      expect(Math.hypot(pose.x, pose.y, pose.z)).toBeGreaterThanOrEqual(globeCloseDistance - 1e-9)
    }
  })
})
