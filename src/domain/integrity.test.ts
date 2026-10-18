import { describe, expect, it } from 'vitest'
import { demoSnapshot } from '../data/demo'
import { collectIntegrityIssues } from './integrity'
import type { CatalogSnapshot } from './types'

describe('collectIntegrityIssues', () => {
  it('reports a flow that points at an object outside the system', () => {
    const broken: CatalogSnapshot = {
      ...demoSnapshot,
      flows: [
        ...demoSnapshot.flows,
        {
          id: 'flow:broken',
          systemId: 'system:aurora:energy',
          resourceTypeId: 'resource:electricity',
          sourceObjectId: 'object:aurora:solar-field',
          targetObjectId: 'object:aurora:commons',
          reliability: { status: 'demo' },
        },
      ],
    }
    expect(collectIntegrityIssues(broken).join('\n')).toContain('object:aurora:commons')
  })
})
