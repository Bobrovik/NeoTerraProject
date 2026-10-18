import { useMemo } from 'react'

export function StarField({
  count,
  radius,
  size,
  sizeAttenuation = true,
}: {
  count: number
  radius: number
  size: number
  sizeAttenuation?: boolean
}) {
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3)
    let seed = 17
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2
      const phi = Math.acos(2 * random() - 1)
      const distance = radius * (0.94 + random() * 0.06)
      values[index * 3] = distance * Math.sin(phi) * Math.cos(theta)
      values[index * 3 + 1] = distance * Math.cos(phi)
      values[index * 3 + 2] = distance * Math.sin(phi) * Math.sin(theta)
    }
    return values
  }, [count, radius])

  return (
    <points raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#f7f4ee" size={size} sizeAttenuation={sizeAttenuation} />
    </points>
  )
}
