import type { BuildingTemplate } from './layout'

export const buildingTemplates: BuildingTemplate[] = [
  {
    id: 'template:distribution-center',
    name: 'Distribution center',
    facilityType: 'distribution-center',
    categoryId: 'category:distribution',
    description: 'A hub placed in the editor. Resource links are recorded separately and are not created by placing this building.',
    size: { x: 10, y: 6, z: 10 },
    representation: { kind: 'primitive', shape: 'box', color: '#8eb8d4' },
  },
  {
    id: 'template:energy-source',
    name: 'Energy source',
    facilityType: 'energy-source',
    categoryId: 'category:energy',
    description: 'A source building placed in the editor. It does not generate a measured supply.',
    size: { x: 14, y: 4, z: 10 },
    representation: { kind: 'primitive', shape: 'box', color: '#d4b483' },
  },
  {
    id: 'template:habitat',
    name: 'Habitat',
    facilityType: 'habitat',
    categoryId: 'category:habitat',
    description: 'A residential block placed in the editor.',
    size: { x: 12, y: 8, z: 10 },
    representation: { kind: 'primitive', shape: 'box', color: '#8fbfa8' },
  },
  {
    id: 'template:workshop',
    name: 'Workshop',
    facilityType: 'workshop',
    categoryId: 'category:production',
    description: 'A production block placed in the editor. Placing it does not define a material flow.',
    size: { x: 16, y: 7, z: 12 },
    representation: { kind: 'primitive', shape: 'box', color: '#d08a86' },
  },
  {
    id: 'template:production-facility',
    name: 'Production facility',
    facilityType: 'production-facility',
    categoryId: 'category:production',
    description: 'An industrial facility placed in the editor. Placing it does not define a material flow.',
    size: { x: 18, y: 9, z: 14 },
    representation: { kind: 'primitive', shape: 'box', color: '#b56b62' },
  },
]
