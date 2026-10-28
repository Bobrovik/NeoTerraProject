import { conflictFeedFromCsv, latestCandidateCsvPath, type ConflictFeed } from '../domain/conflict-events'

export async function fetchConflictFeed(fetchImpl: typeof fetch = fetch): Promise<{ payload: ConflictFeed; sourceUpdated?: string }> {
  const index = await fetchImpl('/ucdp-feed/downloads/')
  if (!index.ok) {
    throw new Error(`UCDP download page responded ${index.status}. The app server must forward /ucdp-feed to https://ucdp.uu.se. That site does not allow the browser to read the file directly.`)
  }
  const path = latestCandidateCsvPath(await index.text())
  if (!path) {
    throw new Error('The UCDP download page has no monthly candidate event file.')
  }
  const file = await fetchImpl(`/ucdp-feed${path}`)
  if (!file.ok) {
    throw new Error(`UCDP candidate events responded ${file.status}.`)
  }
  const payload = conflictFeedFromCsv(await file.text(), `https://ucdp.uu.se${path}`)
  const sourceUpdated = sourceDate(file.headers.get('last-modified'))
  return sourceUpdated ? { payload, sourceUpdated } : { payload }
}

function sourceDate(lastModified: string | null): string | undefined {
  if (!lastModified) {
    return undefined
  }
  const parsed = Date.parse(lastModified)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : undefined
}
