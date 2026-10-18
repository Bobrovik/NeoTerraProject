const configuredStyle = import.meta.env.VITE_MAP_STYLE_URL
const defaultMapStyleUrl = 'https://tiles.openfreemap.org/styles/liberty'

export const appConfig = {
  name: 'Future City',
  tagline: 'A research model of cities organized around resources.',
  publicSiteUrl: null as string | null,
  mapStyleUrl: typeof configuredStyle === 'string' && configuredStyle.trim().length > 0 ? configuredStyle.trim() : defaultMapStyleUrl,
}
