import { describe, expect, it } from 'vitest'
import { categoriesForCommodity, depositsInCategories, mineralMarker, parseMajorDepositGml } from './mineral-deposits'

const gml = `
<gml:featureMember>
  <ms:gid>2403</ms:gid>
  <ms:dep_name>Nakhjir</ms:dep_name>
  <ms:country>Iran</ms:country>
  <ms:latitude>34.53333</ms:latitude>
  <ms:longitude>52.58333</ms:longitude>
  <ms:commodity>Rare earth elements</ms:commodity>
  <ms:dep_type>Sedimentary</ms:dep_type>
  <ms:url>https://mrdata.usgs.gov/major-deposits/show-ofr20051294.php?rec_id=2403</ms:url>
</gml:featureMember>
<gml:featureMember>
  <ms:gid>9</ms:gid>
  <ms:dep_name>Broken</ms:dep_name>
  <ms:latitude>95</ms:latitude>
  <ms:longitude>10</ms:longitude>
  <ms:commodity>Gold</ms:commodity>
</gml:featureMember>`

describe('USGS major deposits', () => {
  it('keeps coordinates from the latitude and longitude fields and groups commodities', () => {
    const deposits = parseMajorDepositGml(gml)
    expect(deposits).toHaveLength(1)
    expect(deposits[0]).toMatchObject({
      id: '2403',
      latitude: 34.53333,
      longitude: 52.58333,
      categories: ['rare-earth'],
      geologicSetting: 'Sedimentary',
    })
  })

  it('does not treat a rare-earth group as one element, and does not invent a reserve', () => {
    expect(categoriesForCommodity('REE, Copper')).toEqual(['copper', 'rare-earth'])
    expect(mineralMarker(['copper', 'rare-earth']).symbol).toBe('hexagon')
    expect(categoriesForCommodity('Phosphate')).toEqual(['other'])
    expect(categoriesForCommodity('Crude oil')).toEqual(['other'])
    expect(categoriesForCommodity('Natural gas')).toEqual(['other'])
    expect(mineralMarker(['other']).symbol).toBe('ring')
    expect(mineralMarker(['iron']).symbol).toBe('square')
    expect(mineralMarker(['gold-silver']).symbol).toBe('triangle')
    expect(mineralMarker(['coal']).symbol).toBe('rectangle')
    expect(mineralMarker(['uranium']).symbol).toBe('pentagon')
    expect(mineralMarker(['rare-earth']).symbol).toBe('star')
    const rows = [
      { categories: ['lithium', 'other'] },
      { categories: ['copper'] },
    ]
    expect(depositsInCategories(rows, new Set(['lithium']))).toEqual([rows[0]])
  })
})
