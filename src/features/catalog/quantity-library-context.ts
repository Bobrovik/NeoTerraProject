import { createContext, useContext } from 'react'
import type { QuantityLibrary } from '../../domain/quantity/definitions'

export type QuantityLibraryContextValue = {
  library: QuantityLibrary
  userLibrary: QuantityLibrary
  libraryMessage?: string
  onLibrary: (library: QuantityLibrary) => void
}

export const QuantityLibraryContext = createContext<QuantityLibraryContextValue | null>(null)

export function useQuantityLibrary(): QuantityLibraryContextValue {
  const value = useContext(QuantityLibraryContext)
  if (!value) {
    throw new Error('Quantity library is missing.')
  }
  return value
}
