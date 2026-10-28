export const mineralSymbolIds = [
  'square',
  'hexagon',
  'diamond',
  'triangle',
  'circle',
  'triangle-down',
  'plus',
  'bar',
  'star',
  'pentagon',
  'rectangle',
  'ring',
] as const

export type MineralSymbol = (typeof mineralSymbolIds)[number]

type Point = [number, number]

export function symbolPath(symbol: MineralSymbol): string {
  if (symbol === 'plus') {
    return `${path(rectRing(1, 0.28))} ${path(rectRing(0.28, 1))}`
  }
  if (symbol === 'ring') {
    return `${path(regular(20, 1))} ${path(regular(20, 0.58))}`
  }
  return path(outline(symbol))
}

export function symbolTriangles(symbol: MineralSymbol): Float32Array {
  if (symbol === 'plus') {
    return floats([...rectTris(1, 0.28), ...rectTris(0.28, 1)])
  }
  if (symbol === 'ring') {
    return annulus(1, 0.58, 20)
  }
  return fan(outline(symbol))
}

function outline(symbol: MineralSymbol): Point[] {
  switch (symbol) {
    case 'square':
      return regular(4, 1, Math.PI / 4)
    case 'hexagon':
      return regular(6, 1, Math.PI / 6)
    case 'diamond':
      return regular(4, 1, -Math.PI / 2)
    case 'triangle':
      return regular(3, 1, -Math.PI / 2)
    case 'circle':
      return regular(20, 1, 0)
    case 'triangle-down':
      return regular(3, 1, Math.PI / 2)
    case 'bar':
      return rectRing(1, 0.32)
    case 'star':
      return star(5, 1, 0.42)
    case 'pentagon':
      return regular(5, 1, -Math.PI / 2)
    case 'rectangle':
      return rectRing(0.62, 1)
    case 'plus':
    case 'ring':
      return []
  }
}

function regular(sides: number, radius: number, rotation = 0): Point[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (index * 2 * Math.PI) / sides
    return [Math.cos(angle) * radius, Math.sin(angle) * radius]
  })
}

function star(points: number, outer: number, inner: number): Point[] {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (index * Math.PI) / points
    return [Math.cos(angle) * radius, Math.sin(angle) * radius]
  })
}

function rectRing(halfWidth: number, halfHeight: number): Point[] {
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ]
}

function path(ring: Point[]): string {
  return `M ${ring.map((point) => point.join(' ')).join(' L ')} Z`
}

function fan(ring: Point[]): Float32Array {
  const data: number[] = []
  for (let index = 0; index < ring.length; index += 1) {
    const next = ring[(index + 1) % ring.length]
    data.push(0, 0, 0, ring[index][0], ring[index][1], 0, next[0], next[1], 0)
  }
  return floats(data)
}

function rectTris(halfWidth: number, halfHeight: number): number[] {
  const [a, b, c, d] = rectRing(halfWidth, halfHeight)
  return [a[0], a[1], 0, b[0], b[1], 0, c[0], c[1], 0, a[0], a[1], 0, c[0], c[1], 0, d[0], d[1], 0]
}

function annulus(outer: number, inner: number, segments: number): Float32Array {
  const data: number[] = []
  for (let index = 0; index < segments; index += 1) {
    const start = (index / segments) * Math.PI * 2
    const end = ((index + 1) / segments) * Math.PI * 2
    const outerStart = [Math.cos(start) * outer, Math.sin(start) * outer]
    const outerEnd = [Math.cos(end) * outer, Math.sin(end) * outer]
    const innerStart = [Math.cos(start) * inner, Math.sin(start) * inner]
    const innerEnd = [Math.cos(end) * inner, Math.sin(end) * inner]
    data.push(
      outerStart[0], outerStart[1], 0, outerEnd[0], outerEnd[1], 0, innerEnd[0], innerEnd[1], 0,
      outerStart[0], outerStart[1], 0, innerEnd[0], innerEnd[1], 0, innerStart[0], innerStart[1], 0,
    )
  }
  return floats(data)
}

function floats(values: number[]): Float32Array {
  return Float32Array.from(values)
}
