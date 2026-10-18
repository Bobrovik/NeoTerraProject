import { useContext } from 'react'
import { CatalogContext, type CatalogState, type ReadyCatalog } from './catalog-context'

export function useCatalogState(): CatalogState {
  const value = useContext(CatalogContext)
  if (!value) {
    throw new Error('useCatalogState must be used inside CatalogProvider.')
  }
  return value
}

export function useReadyCatalog(): ReadyCatalog {
  const value = useCatalogState()
  if (value.status !== 'ready') {
    throw new Error('The catalog is not ready.')
  }
  return value
}
