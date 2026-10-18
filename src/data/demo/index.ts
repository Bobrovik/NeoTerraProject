import { assertValidCatalog } from '../../domain/integrity'
import type { CatalogSource } from '../../domain/types'
import { demoSnapshot } from './records'

export { demoSnapshot } from './records'

export const demoCatalogSource: CatalogSource = {
  async load() {
    assertValidCatalog(demoSnapshot)
    return demoSnapshot
  },
}
