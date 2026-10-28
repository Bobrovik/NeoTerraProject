import { parseMajorDepositGml, type MineralDeposit } from '../domain/mineral-deposits'

export const majorDepositsWfsUrl = 'https://mrdata.usgs.gov/services/wfs/ofr20051294?service=WFS&version=1.1.0&request=GetFeature&typeName=ms:ofr20051294'

export async function fetchMajorDeposits(fetchImpl: typeof fetch = fetch): Promise<MineralDeposit[]> {
  const response = await fetchImpl(majorDepositsWfsUrl)
  if (!response.ok) {
    throw new Error(`USGS major deposits responded ${response.status}.`)
  }
  return parseMajorDepositGml(await response.text())
}
