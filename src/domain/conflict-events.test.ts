import { describe, expect, it } from 'vitest'
import { conflictFeedFromCsv, latestCandidateCsvPath } from './conflict-events'

const header = 'id,conflict_name,type_of_violence,where_prec,latitude,longitude,country,region,date_start,date_end,best,source_article,source_headline'

describe('UCDP candidate events', () => {
  it('chooses the latest monthly file and ignores the longer quarterly name', () => {
    const html = '<a href="/downloads/candidateged/GEDEvent_v26_0_8.csv"></a><a href="/downloads/candidateged/GEDEvent_v26_01_26_09.csv"></a><a href="/downloads/candidateged/GEDEvent_v26_0_9.csv"></a>'
    expect(latestCandidateCsvPath(html)).toBe('/downloads/candidateged/GEDEvent_v26_0_9.csv')
  })

  it('draws precise and approximate points and skips country-only records', () => {
    const csv = [
      header,
      '1,Alpha,1,1,15.5,32.2,Sudan,Africa,2026-09-01,2026-09-02,4,"See https://example.org/report","Headline"',
      '2,Beta,3,2,10,20,Mali,Africa,2026-09-03,2026-09-03,1,,',
      '3,Gamma,1,4,48,2,France,Europe,2026-09-04,2026-09-04,0,,',
      '4,Country only,1,6,0,0,Chad,Africa,2026-09-05,2026-09-05,2,,',
      '5,Bad,1,1,120,10,Nowhere,Africa,2026-09-06,2026-09-06,1,,',
    ].join('\n')
    const feed = conflictFeedFromCsv(csv, 'https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_0_9.csv')
    expect(feed.omittedCountryOnly).toBe(1)
    expect(feed.events.map((event) => event.precision)).toEqual(['exact', 'nearby', 'area-point'])
    expect(feed.events[0]).toMatchObject({
      name: 'Alpha',
      violence: 'State-based conflict',
      latitude: 15.5,
      longitude: 32.2,
      deathsBest: 4,
      sourceUrl: 'https://example.org/report',
    })
    expect(feed.events.every((event) => !('ring' in event))).toBe(true)
  })
})
