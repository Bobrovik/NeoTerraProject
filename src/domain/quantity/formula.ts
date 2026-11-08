import { divideDimensions, dimensionsEqual, multiplyDimensions } from './dimension'
import { findQuantity } from './definitions'
import { builtinQuantityLibrary } from './library'

export function pumpPowerDimensionMatchesPower(): boolean {
  const library = builtinQuantityLibrary
  const density = findQuantity(library, 'quantity:density')
  const gravity = findQuantity(library, 'quantity:acceleration')
  const flow = findQuantity(library, 'quantity:volume-flow')
  const head = findQuantity(library, 'quantity:length')
  const efficiency = findQuantity(library, 'quantity:ratio')
  const power = findQuantity(library, 'quantity:power')
  if (!density || !gravity || !flow || !head || !efficiency || !power) {
    return false
  }
  const numerator = [density.dimension, gravity.dimension, flow.dimension, head.dimension].reduce(multiplyDimensions)
  const result = divideDimensions(numerator, efficiency.dimension)
  return dimensionsEqual(result, power.dimension)
}
