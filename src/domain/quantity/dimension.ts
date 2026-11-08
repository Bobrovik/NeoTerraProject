export const baseDimensionKeys = ['M', 'L', 'T', 'I', 'Th', 'N', 'J'] as const

export type BaseDimensionKey = (typeof baseDimensionKeys)[number]

export type Dimension = Record<BaseDimensionKey, number>

const displaySymbol: Record<BaseDimensionKey, string> = {
  M: 'M',
  L: 'L',
  T: 'T',
  I: 'I',
  Th: 'Θ',
  N: 'N',
  J: 'J',
}

export function dimension(partial: Partial<Dimension> = {}): Dimension {
  return {
    M: partial.M ?? 0,
    L: partial.L ?? 0,
    T: partial.T ?? 0,
    I: partial.I ?? 0,
    Th: partial.Th ?? 0,
    N: partial.N ?? 0,
    J: partial.J ?? 0,
  }
}

export function dimensionsEqual(left: Dimension, right: Dimension): boolean {
  return baseDimensionKeys.every((key) => left[key] === right[key])
}

export function isDimensionless(value: Dimension): boolean {
  return baseDimensionKeys.every((key) => value[key] === 0)
}

export function multiplyDimensions(left: Dimension, right: Dimension): Dimension {
  return dimension({
    M: left.M + right.M,
    L: left.L + right.L,
    T: left.T + right.T,
    I: left.I + right.I,
    Th: left.Th + right.Th,
    N: left.N + right.N,
    J: left.J + right.J,
  })
}

export function divideDimensions(left: Dimension, right: Dimension): Dimension {
  return dimension({
    M: left.M - right.M,
    L: left.L - right.L,
    T: left.T - right.T,
    I: left.I - right.I,
    Th: left.Th - right.Th,
    N: left.N - right.N,
    J: left.J - right.J,
  })
}

export function formatDimension(value: Dimension): string {
  const parts = baseDimensionKeys
    .filter((key) => value[key] !== 0)
    .map((key) => `${displaySymbol[key]}${formatExponent(value[key])}`)
  return parts.length === 0 ? '1' : parts.join('·')
}

export function isIntegerDimension(value: Dimension): boolean {
  return baseDimensionKeys.every((key) => Number.isInteger(value[key]) && value[key] >= -12 && value[key] <= 12)
}

function formatExponent(value: number): string {
  if (value === 1) {
    return ''
  }
  const superscripts: Record<string, string> = {
    '-': '⁻',
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
  }
  return String(value).replace(/./gu, (character) => superscripts[character] ?? character)
}
