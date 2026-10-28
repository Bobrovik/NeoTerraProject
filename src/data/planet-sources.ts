export type PlanetSource = {
  id: string
  layer: 'conflicts' | 'forests' | 'freshwater' | 'minerals' | 'population'
  name: string
  organization: string
  measures: string
  datasetUrl: string
  methodologyUrl: string
  publicationUrl?: string
  license: string
  transform: string
  connected: boolean
  limit: string
}

export const planetSources: PlanetSource[] = [
  {
    id: 'world-bank-population',
    layer: 'population',
    name: 'Population, total (SP.POP.TOTL)',
    organization: 'World Bank, from the UN Population Division',
    measures: 'Midyear total population. This is an estimate, or a projection when the observation year is still in the future. It is not a census count.',
    datasetUrl: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
    methodologyUrl: 'https://population.un.org/wpp/',
    publicationUrl: 'https://population.un.org/wpp/',
    license: 'World Bank terms of use for datasets',
    transform: 'The most recent World Bank value for each ISO2 country is kept. Aggregates and blank values are dropped. A year after the current calendar year is labeled a projection.',
    connected: true,
    limit: 'Refreshed from the World Bank API no more than every 30 days. The series itself is updated when the UN estimates are released, not daily.',
  },
  {
    id: 'world-bank-growth',
    layer: 'population',
    name: 'Population growth (SP.POP.GROW)',
    organization: 'World Bank',
    measures: 'Annual population growth in percent for the observation year. It is not the change between two census counts.',
    datasetUrl: 'https://data.worldbank.org/indicator/SP.POP.GROW',
    methodologyUrl: 'https://population.un.org/wpp/',
    license: 'World Bank terms of use for datasets',
    transform: 'Joined to the population row by ISO2 code when both exist.',
    connected: true,
    limit: 'Same 30-day refresh as the other World Bank indicators.',
  },
  {
    id: 'world-bank-density',
    layer: 'population',
    name: 'Population density (EN.POP.DNST)',
    organization: 'World Bank',
    measures: 'People per square kilometre of land area. The land area is the one used by this indicator, not a boundary drawn in this app.',
    datasetUrl: 'https://data.worldbank.org/indicator/EN.POP.DNST',
    methodologyUrl: 'https://data.worldbank.org/indicator/EN.POP.DNST',
    license: 'World Bank terms of use for datasets',
    transform: 'Joined to the population row by ISO2 code. When the population layer is on, a country with a density is colored on a log scale. The density year is shown separately because it can differ from the population year.',
    connected: true,
    limit: 'Same 30-day refresh as the other World Bank indicators.',
  },
  {
    id: 'world-bank-forest',
    layer: 'forests',
    name: 'Forest area (AG.LND.FRST.ZS and AG.LND.FRST.K2)',
    organization: 'Food and Agriculture Organization, via the World Bank',
    measures: 'National forest area as a percent of land area, and as square kilometres. This is not a map of forest cover, and it is not a timber volume or a sustainable harvest.',
    datasetUrl: 'https://data.worldbank.org/indicator/AG.LND.FRST.ZS',
    methodologyUrl: 'https://www.fao.org/forest-resources-assessment/en',
    license: 'World Bank terms of use for datasets',
    transform: 'When the forest layer is on, each matched country is colored by the percent of land area. Square kilometres stay in the country card. The color is not a forest polygon.',
    connected: true,
    limit: 'FAO updates this assessment on its own cycle. The app refreshes the World Bank copy at most every 30 days.',
  },
  {
    id: 'jrc-forest-cover',
    layer: 'forests',
    name: 'JRC global map of forest cover 2020',
    organization: 'European Commission Joint Research Centre',
    measures: 'Forest presence and absence for 2020 at about 10 metres. This is forest cover, not timber volume.',
    datasetUrl: 'https://source.coop/epoch/jrc-global-forest-cover-2020',
    methodologyUrl: 'https://data.europa.eu/89h/cf7c49ea-8f00-4c5a-bd40-6f25dc341580',
    license: 'JRC data may be used without a royalty. Attribution is requested.',
    transform: 'Not loaded. The raster is about 38 GB, and no generalized forest-cover polygon file was available to the browser.',
    connected: false,
    limit: 'Hansen Global Forest Change is also a 30 m raster and is not loaded. National percentages stay in the country card.',
  },
  {
    id: 'natural-earth-hydro',
    layer: 'freshwater',
    name: 'Natural Earth 110m rivers and lakes',
    organization: 'Natural Earth',
    measures: 'The presence of a named river centerline or a lake polygon at 1:110 million scale. A line on the map does not mean the water is drinkable, renewable, or scarce.',
    datasetUrl: 'https://www.naturalearthdata.com/downloads/110m-physical-vectors/',
    methodologyUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
    license: 'Public domain',
    transform: 'Lines and outer lake rings are read from GeoJSON. Positions outside latitude −90 to 90 or longitude −180 to 180 are dropped.',
    connected: true,
    limit: 'This is a generalized basemap, not a hydrological survey. The file is refreshed at most every 180 days.',
  },
  {
    id: 'world-bank-freshwater',
    layer: 'freshwater',
    name: 'Renewable internal freshwater resources per capita (ER.H2O.INTR.PC)',
    organization: 'FAO AQUASTAT, via the World Bank',
    measures: 'Renewable internal freshwater resources per person, in cubic metres. This is not groundwater reserves, not access to safe drinking water, and not a water-stress score.',
    datasetUrl: 'https://data.worldbank.org/indicator/ER.H2O.INTR.PC',
    methodologyUrl: 'https://www.fao.org/aquastat/en/',
    license: 'World Bank terms of use for datasets',
    transform: 'The most recent national value is shown in the country card. It is not drawn as a zone.',
    connected: true,
    limit: 'AQUASTAT is not a daily feed. The app refreshes the World Bank copy at most every 30 days.',
  },
  {
    id: 'ucdp-candidate',
    layer: 'conflicts',
    name: 'UCDP Candidate Events',
    organization: 'Uppsala University',
    measures: 'Candidate events of organized violence for the current monthly release. Each record is one event at a coded point, with a precision code. A point is not the boundary of a conflict.',
    datasetUrl: 'https://ucdp.uu.se/downloads/',
    methodologyUrl: 'https://ucdp.uu.se/downloads/ged/ged261.pdf',
    publicationUrl: 'https://doi.org/10.1093/jopres/xjag046',
    license: 'CC BY 4.0',
    transform: 'The monthly candidate CSV is read through the app server. Precision 1 is an event point. Precision 2 is a point within 25 km. Precisions 3 to 5 are points that stand for an area and are not drawn as that area. Precision 6, country only, is not drawn.',
    connected: true,
    limit: 'Refreshed at most every 30 days. ucdp.uu.se does not allow a direct browser request, so /ucdp-feed must be forwarded by the Vite server. The UCDP API token and the ACLED key are not stored here.',
  },
  {
    id: 'usgs-major-deposits',
    layer: 'minerals',
    name: 'Major mineral deposits of the world (OFR 2005-1294)',
    organization: 'U.S. Geological Survey',
    measures: 'Regional locations of known major nonfuel mineral deposits. A point is a deposit location, not a reserve, a resource volume, or proof that a mine is operating.',
    datasetUrl: 'https://mrdata.usgs.gov/major-deposits/',
    methodologyUrl: 'https://mrdata.usgs.gov/metadata/ofr-2005-1294.html',
    publicationUrl: 'https://doi.org/10.3133/ofr20051294A',
    license: 'Public USGS open-file report. No access constraints stated on the dataset page.',
    transform: 'Points are read from the WFS GML. Latitude and longitude fields are used. Commodities are grouped from the source text. Records outside the geographic range are dropped.',
    connected: true,
    limit: 'The compilation was published through 2009 and is not a current mine survey. The browser copy is refreshed at most every 180 days. The full MRDS inventory is a separate service and is not drawn.',
  },
]

export const worldBankTermsUrl = 'https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets'
