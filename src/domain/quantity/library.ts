import { dimension, type Dimension } from './dimension'
import {
  affineUnit,
  definedUnit,
  findQuantity,
  unitsForProperty,
  type LocalizedName,
  type PropertyDefinition,
  type QuantityDefinition,
  type QuantityLibrary,
  type UnitDefinition,
} from './definitions'

const text = (en: string, ru: string): LocalizedName => ({ en, ru })

const mass = dimension({ M: 1 })
const length = dimension({ L: 1 })
const time = dimension({ T: 1 })
const current = dimension({ I: 1 })
const temperature = dimension({ Th: 1 })
const amount = dimension({ N: 1 })
const luminous = dimension({ J: 1 })
const area = dimension({ L: 2 })
const volume = dimension({ L: 3 })
const velocity = dimension({ L: 1, T: -1 })
const acceleration = dimension({ L: 1, T: -2 })
const density = dimension({ M: 1, L: -3 })
const pressure = dimension({ M: 1, L: -1, T: -2 })
const energy = dimension({ M: 1, L: 2, T: -2 })
const power = dimension({ M: 1, L: 2, T: -3 })
const dynamicViscosity = dimension({ M: 1, L: -1, T: -1 })
const volumeFlow = dimension({ L: 3, T: -1 })
const massFlow = dimension({ M: 1, T: -1 })
const frequency = dimension({ T: -1 })
const conductivity = dimension({ I: 2, T: 3, M: -1, L: -3 })
const activityConcentration = dimension({ T: -1, L: -3 })
const specificHeat = dimension({ L: 2, T: -2, Th: -1 })

function quantity(id: string, name: LocalizedName, description: LocalizedName, value: Dimension, unitId: string, temperatureRole: QuantityDefinition['temperatureRole'] = 'none'): QuantityDefinition {
  return { id, name, description, dimension: value, recommendedUnitId: unitId, temperatureRole, status: 'library' }
}

function property(input: Omit<PropertyDefinition, 'status' | 'permittedUnitIds' | 'conditions' | 'minimum' | 'maximum'> & Partial<Pick<PropertyDefinition, 'permittedUnitIds' | 'conditions' | 'minimum' | 'maximum'>>): PropertyDefinition {
  return {
    permittedUnitIds: input.permittedUnitIds ?? [],
    conditions: input.conditions ?? '',
    minimum: input.minimum ?? null,
    maximum: input.maximum ?? null,
    status: 'library',
    ...input,
  }
}

const units: UnitDefinition[] = [
  affineUnit({ id: 'unit:kg', symbol: 'kg', name: text('kilogram', 'килограмм'), dimension: mass, factor: 1 }),
  affineUnit({ id: 'unit:g', symbol: 'g', name: text('gram', 'грамм'), dimension: mass, factor: 0.001 }),
  affineUnit({ id: 'unit:t', symbol: 't', name: text('tonne', 'тонна'), dimension: mass, factor: 1000, system: 'accepted' }),
  affineUnit({ id: 'unit:m', symbol: 'm', name: text('metre', 'метр'), dimension: length, factor: 1 }),
  affineUnit({ id: 'unit:km', symbol: 'km', name: text('kilometre', 'километр'), dimension: length, factor: 1000 }),
  affineUnit({ id: 'unit:mm', symbol: 'mm', name: text('millimetre', 'миллиметр'), dimension: length, factor: 0.001 }),
  affineUnit({ id: 'unit:m2', symbol: 'm²', name: text('square metre', 'квадратный метр'), dimension: area, factor: 1 }),
  affineUnit({ id: 'unit:km2', symbol: 'km²', name: text('square kilometre', 'квадратный километр'), dimension: area, factor: 1_000_000 }),
  affineUnit({ id: 'unit:m3', symbol: 'm³', name: text('cubic metre', 'кубический метр'), dimension: volume, factor: 1 }),
  affineUnit({ id: 'unit:L', symbol: 'L', name: text('litre', 'литр'), dimension: volume, factor: 0.001, system: 'accepted' }),
  affineUnit({ id: 'unit:s', symbol: 's', name: text('second', 'секунда'), dimension: time, factor: 1 }),
  affineUnit({ id: 'unit:min', symbol: 'min', name: text('minute', 'минута'), dimension: time, factor: 60, system: 'accepted' }),
  affineUnit({ id: 'unit:h', symbol: 'h', name: text('hour', 'час'), dimension: time, factor: 3600, system: 'accepted' }),
  affineUnit({ id: 'unit:d', symbol: 'd', name: text('day', 'сутки'), dimension: time, factor: 86400, system: 'accepted' }),
  affineUnit({ id: 'unit:A', symbol: 'A', name: text('ampere', 'ампер'), dimension: current, factor: 1 }),
  affineUnit({ id: 'unit:K', symbol: 'K', name: text('kelvin', 'кельвин'), dimension: temperature, factor: 1, temperatureRole: 'absolute' }),
  affineUnit({ id: 'unit:C', symbol: '°C', name: text('degree Celsius', 'градус Цельсия'), dimension: temperature, factor: 1, offset: 273.15, temperatureRole: 'absolute', system: 'SI' }),
  affineUnit({ id: 'unit:K-interval', symbol: 'K', name: text('kelvin interval', 'интервал в кельвинах'), dimension: temperature, factor: 1, temperatureRole: 'interval' }),
  affineUnit({ id: 'unit:C-interval', symbol: '°C', name: text('Celsius interval', 'интервал в градусах Цельсия'), dimension: temperature, factor: 1, temperatureRole: 'interval' }),
  affineUnit({ id: 'unit:mol', symbol: 'mol', name: text('mole', 'моль'), dimension: amount, factor: 1 }),
  affineUnit({ id: 'unit:cd', symbol: 'cd', name: text('candela', 'кандела'), dimension: luminous, factor: 1 }),
  affineUnit({ id: 'unit:m-s', symbol: 'm/s', name: text('metre per second', 'метр в секунду'), dimension: velocity, factor: 1 }),
  affineUnit({ id: 'unit:km-h', symbol: 'km/h', name: text('kilometre per hour', 'километр в час'), dimension: velocity, factor: 1000 / 3600, system: 'accepted' }),
  affineUnit({ id: 'unit:m-s2', symbol: 'm/s²', name: text('metre per second squared', 'метр на секунду в квадрате'), dimension: acceleration, factor: 1 }),
  affineUnit({ id: 'unit:kg-m3', symbol: 'kg/m³', name: text('kilogram per cubic metre', 'килограмм на кубический метр'), dimension: density, factor: 1 }),
  affineUnit({ id: 'unit:mg-L', symbol: 'mg/L', name: text('milligram per litre', 'миллиграмм на литр'), dimension: density, factor: 0.001, system: 'accepted' }),
  affineUnit({ id: 'unit:ug-L', symbol: 'µg/L', name: text('microgram per litre', 'микрограмм на литр'), dimension: density, factor: 0.000001, system: 'accepted' }),
  affineUnit({ id: 'unit:Pa', symbol: 'Pa', name: text('pascal', 'паскаль'), dimension: pressure, factor: 1 }),
  affineUnit({ id: 'unit:kPa', symbol: 'kPa', name: text('kilopascal', 'килопаскаль'), dimension: pressure, factor: 1000 }),
  affineUnit({ id: 'unit:MPa', symbol: 'MPa', name: text('megapascal', 'мегапаскаль'), dimension: pressure, factor: 1_000_000 }),
  affineUnit({ id: 'unit:bar', symbol: 'bar', name: text('bar', 'бар'), dimension: pressure, factor: 100_000, system: 'accepted' }),
  affineUnit({ id: 'unit:J', symbol: 'J', name: text('joule', 'джоуль'), dimension: energy, factor: 1 }),
  affineUnit({ id: 'unit:kJ', symbol: 'kJ', name: text('kilojoule', 'килоджоуль'), dimension: energy, factor: 1000 }),
  affineUnit({ id: 'unit:MJ', symbol: 'MJ', name: text('megajoule', 'мегаджоуль'), dimension: energy, factor: 1_000_000 }),
  affineUnit({ id: 'unit:kWh', symbol: 'kWh', name: text('kilowatt-hour', 'киловатт-час'), dimension: energy, factor: 3_600_000, system: 'accepted' }),
  affineUnit({ id: 'unit:W', symbol: 'W', name: text('watt', 'ватт'), dimension: power, factor: 1 }),
  affineUnit({ id: 'unit:kW', symbol: 'kW', name: text('kilowatt', 'киловатт'), dimension: power, factor: 1000 }),
  affineUnit({ id: 'unit:MW', symbol: 'MW', name: text('megawatt', 'мегаватт'), dimension: power, factor: 1_000_000 }),
  affineUnit({ id: 'unit:Pa-s', symbol: 'Pa·s', name: text('pascal-second', 'паскаль-секунда'), dimension: dynamicViscosity, factor: 1 }),
  affineUnit({ id: 'unit:mPa-s', symbol: 'mPa·s', name: text('millipascal-second', 'миллипаскаль-секунда'), dimension: dynamicViscosity, factor: 0.001 }),
  affineUnit({ id: 'unit:m3-s', symbol: 'm³/s', name: text('cubic metre per second', 'кубический метр в секунду'), dimension: volumeFlow, factor: 1 }),
  affineUnit({ id: 'unit:m3-h', symbol: 'm³/h', name: text('cubic metre per hour', 'кубический метр в час'), dimension: volumeFlow, factor: 1 / 3600, system: 'accepted' }),
  affineUnit({ id: 'unit:kg-s', symbol: 'kg/s', name: text('kilogram per second', 'килограмм в секунду'), dimension: massFlow, factor: 1 }),
  affineUnit({ id: 'unit:kg-h', symbol: 'kg/h', name: text('kilogram per hour', 'килограмм в час'), dimension: massFlow, factor: 1 / 3600, system: 'accepted' }),
  affineUnit({ id: 'unit:Hz', symbol: 'Hz', name: text('hertz', 'герц'), dimension: frequency, factor: 1 }),
  affineUnit({ id: 'unit:MHz', symbol: 'MHz', name: text('megahertz', 'мегагерц'), dimension: frequency, factor: 1_000_000 }),
  affineUnit({ id: 'unit:mHz', symbol: 'mHz', name: text('millihertz', 'миллигерц'), dimension: frequency, factor: 0.001 }),
  affineUnit({ id: 'unit:S-m', symbol: 'S/m', name: text('siemens per metre', 'сименс на метр'), dimension: conductivity, factor: 1 }),
  affineUnit({ id: 'unit:Bq-m3', symbol: 'Bq/m³', name: text('becquerel per cubic metre', 'беккерель на кубический метр'), dimension: activityConcentration, factor: 1 }),
  affineUnit({ id: 'unit:Bq-L', symbol: 'Bq/L', name: text('becquerel per litre', 'беккерель на литр'), dimension: activityConcentration, factor: 1000, system: 'accepted' }),
  affineUnit({ id: 'unit:1', symbol: '1', name: text('one', 'единица'), dimension: dimension(), factor: 1 }),
  affineUnit({ id: 'unit:percent', symbol: '%', name: text('percent', 'процент'), dimension: dimension(), factor: 0.01, system: 'accepted' }),
  definedUnit({ id: 'unit:pH', symbol: 'pH', name: text('pH', 'pH') }),
  definedUnit({ id: 'unit:NTU', symbol: 'NTU', name: text('nephelometric turbidity unit', 'нефелометрическая единица мутности') }),
  definedUnit({ id: 'unit:CFU-100mL', symbol: 'CFU/100 mL', name: text('colony forming units per 100 millilitres', 'колониеобразующие единицы на 100 миллилитров') }),
  affineUnit({ id: 'unit:J-kg-K', symbol: 'J/(kg·K)', name: text('joule per kilogram kelvin', 'джоуль на килограмм-кельвин'), dimension: specificHeat, factor: 1 }),
]

const quantities: QuantityDefinition[] = [
  quantity('quantity:mass', text('Mass', 'Масса'), text('Amount of matter.', 'Количество вещества как масса.'), mass, 'unit:kg'),
  quantity('quantity:length', text('Length', 'Длина'), text('Distance.', 'Расстояние.'), length, 'unit:m'),
  quantity('quantity:time', text('Time', 'Время'), text('Duration.', 'Длительность.'), time, 'unit:s'),
  quantity('quantity:current', text('Electric current', 'Сила тока'), text('Flow of electric charge.', 'Поток электрического заряда.'), current, 'unit:A'),
  quantity('quantity:temperature', text('Thermodynamic temperature', 'Термодинамическая температура'), text('Absolute temperature.', 'Абсолютная температура.'), temperature, 'unit:K', 'absolute'),
  quantity('quantity:temperature-interval', text('Temperature interval', 'Интервал температуры'), text('A difference of temperatures, not a point on the absolute scale.', 'Разность температур, а не точка абсолютной шкалы.'), temperature, 'unit:K-interval', 'interval'),
  quantity('quantity:amount', text('Amount of substance', 'Количество вещества'), text('Amount counted in moles.', 'Количество, считанное в молях.'), amount, 'unit:mol'),
  quantity('quantity:luminous-intensity', text('Luminous intensity', 'Сила света'), text('Light as perceived by the eye.', 'Свет в восприятии глаза.'), luminous, 'unit:cd'),
  quantity('quantity:area', text('Area', 'Площадь'), text('Extent of a surface.', 'Протяжённость поверхности.'), area, 'unit:m2'),
  quantity('quantity:volume', text('Volume', 'Объём'), text('Extent of a space.', 'Протяжённость пространства.'), volume, 'unit:m3'),
  quantity('quantity:velocity', text('Velocity', 'Скорость'), text('Length per time.', 'Длина за время.'), velocity, 'unit:m-s'),
  quantity('quantity:acceleration', text('Acceleration', 'Ускорение'), text('Change of velocity per time.', 'Изменение скорости за время.'), acceleration, 'unit:m-s2'),
  quantity('quantity:density', text('Density', 'Плотность'), text('Mass per volume.', 'Масса в объёме.'), density, 'unit:kg-m3'),
  quantity('quantity:pressure', text('Pressure', 'Давление'), text('Force per area.', 'Сила на площадь.'), pressure, 'unit:Pa'),
  quantity('quantity:energy', text('Energy', 'Энергия'), text('Capacity to do work.', 'Способность совершать работу.'), energy, 'unit:J'),
  quantity('quantity:power', text('Power', 'Мощность'), text('Energy per time.', 'Энергия за время.'), power, 'unit:W'),
  quantity('quantity:dynamic-viscosity', text('Dynamic viscosity', 'Динамическая вязкость'), text('Resistance of a fluid to shear.', 'Сопротивление жидкости сдвигу.'), dynamicViscosity, 'unit:Pa-s'),
  quantity('quantity:volume-flow', text('Volumetric flow rate', 'Объёмный расход'), text('Volume per time.', 'Объём за время.'), volumeFlow, 'unit:m3-s'),
  quantity('quantity:mass-flow', text('Mass flow rate', 'Массовый расход'), text('Mass per time.', 'Масса за время.'), massFlow, 'unit:kg-s'),
  quantity('quantity:frequency', text('Frequency', 'Частота'), text('Cycles per time.', 'Циклы за время.'), frequency, 'unit:Hz'),
  quantity('quantity:conductivity', text('Electrical conductivity', 'Электрическая проводимость'), text('Ability of a material to conduct current.', 'Способность проводить ток.'), conductivity, 'unit:S-m'),
  quantity('quantity:activity-concentration', text('Activity concentration', 'Удельная активность'), text('Radioactive decays per time and volume.', 'Распады за время в объёме.'), activityConcentration, 'unit:Bq-m3'),
  quantity('quantity:ratio', text('Dimensionless ratio', 'Безразмерное отношение'), text('A pure number.', 'Чистое число.'), dimension(), 'unit:1'),
  quantity('quantity:ph', text('pH', 'pH'), text('Logarithmic measure of hydrogen ion activity. It is not a concentration.', 'Логарифмическая мера активности ионов водорода. Это не концентрация.'), dimension(), 'unit:pH'),
  quantity('quantity:turbidity', text('Turbidity', 'Мутность'), text('Optical scattering reported by a stated method. NTU is not converted to an SI unit.', 'Рассеяние света по указанной методике. NTU не переводится в единицу СИ.'), dimension(), 'unit:NTU'),
  quantity('quantity:colony-count', text('Colony count', 'Число колоний'), text('A microbiological count for a stated volume and method.', 'Микробиологический счёт для указанного объёма и метода.'), dimension(), 'unit:CFU-100mL'),
  quantity('quantity:specific-heat', text('Specific heat capacity', 'Удельная теплоёмкость'), text('Energy needed to raise the temperature of a mass by one temperature interval.', 'Энергия на повышение температуры массы на один интервал температуры.'), specificHeat, 'unit:J-kg-K'),
]

const properties: PropertyDefinition[] = [
  property({ id: 'property:density', name: text('Density', 'Плотность'), description: text('Mass per volume of the material itself.', 'Масса материала в его объёме.'), category: 'physical', dataType: 'number', quantityId: 'quantity:density', recommendedUnitId: 'unit:kg-m3', permittedUnitIds: ['unit:kg-m3'] }),
  property({ id: 'property:dynamic-viscosity', name: text('Dynamic viscosity', 'Динамическая вязкость'), description: text('Shear resistance of a fluid.', 'Сопротивление жидкости сдвигу.'), category: 'physical', dataType: 'number', quantityId: 'quantity:dynamic-viscosity', recommendedUnitId: 'unit:Pa-s' }),
  property({ id: 'property:temperature', name: text('Temperature', 'Температура'), description: text('Absolute temperature of the sample.', 'Абсолютная температура образца.'), category: 'physical', dataType: 'number', quantityId: 'quantity:temperature', recommendedUnitId: 'unit:C' }),
  property({ id: 'property:specific-heat', name: text('Specific heat capacity', 'Удельная теплоёмкость'), description: text('Energy required to warm a mass by one temperature interval.', 'Энергия для нагрева массы на один интервал температуры.'), category: 'energy', dataType: 'number', quantityId: 'quantity:specific-heat', recommendedUnitId: 'unit:J-kg-K', permittedUnitIds: ['unit:J-kg-K'] }),
  property({ id: 'property:ph', name: text('pH', 'pH'), description: text('Hydrogen ion activity on the logarithmic pH scale.', 'Активность ионов водорода в логарифмической шкале pH.'), category: 'quality', dataType: 'number', quantityId: 'quantity:ph', recommendedUnitId: 'unit:pH', permittedUnitIds: ['unit:pH'] }),
  property({ id: 'property:conductivity', name: text('Electrical conductivity', 'Электрическая проводимость'), description: text('Electrical conductivity of the sample.', 'Электрическая проводимость образца.'), category: 'physical', dataType: 'number', quantityId: 'quantity:conductivity', recommendedUnitId: 'unit:S-m', permittedUnitIds: ['unit:S-m'] }),
  property({ id: 'property:concentration', name: text('Substance concentration', 'Концентрация вещества'), description: text('Mass of one named substance in a volume. The property names the substance. It is not the density of the mixture.', 'Масса одного названного вещества в объёме. Свойство называет вещество. Это не плотность смеси.'), category: 'chemical', dataType: 'number', quantityId: 'quantity:density', recommendedUnitId: 'unit:mg-L', permittedUnitIds: ['unit:mg-L', 'unit:ug-L'] }),
  property({ id: 'property:nitrates', name: text('Nitrates', 'Нитраты'), description: text('Mass concentration of nitrate. The same dimension as density does not make this density.', 'Массовая концентрация нитрата. Та же размерность, что у плотности, не делает это плотностью.'), category: 'chemical', dataType: 'number', quantityId: 'quantity:density', recommendedUnitId: 'unit:mg-L', permittedUnitIds: ['unit:mg-L', 'unit:ug-L'] }),
  property({ id: 'property:heavy-metals', name: text('Heavy metal content', 'Содержание тяжёлых металлов'), description: text('Mass concentration of a named heavy metal. It is not interchangeable with density.', 'Массовая концентрация названного тяжёлого металла. Она не взаимозаменяема с плотностью.'), category: 'chemical', dataType: 'number', quantityId: 'quantity:density', recommendedUnitId: 'unit:mg-L', permittedUnitIds: ['unit:mg-L', 'unit:ug-L'] }),
  property({ id: 'property:turbidity', name: text('Turbidity', 'Мутность'), description: text('Turbidity by the method named on the measurement.', 'Мутность по методу, указанному в измерении.'), category: 'quality', dataType: 'number', quantityId: 'quantity:turbidity', recommendedUnitId: 'unit:NTU', permittedUnitIds: ['unit:NTU'] }),
  property({ id: 'property:microorganisms', name: text('Microorganisms', 'Микроорганизмы'), description: text('A colony count for the stated volume and method. CFU/100 mL is not converted to an SI unit.', 'Счёт колоний для указанного объёма и метода. CFU/100 mL не переводится в единицу СИ.'), category: 'quality', dataType: 'number', quantityId: 'quantity:colony-count', recommendedUnitId: 'unit:CFU-100mL', permittedUnitIds: ['unit:CFU-100mL'] }),
  property({ id: 'property:length', name: text('Length', 'Длина'), description: text('A length of a technological part.', 'Длина технологической части.'), category: 'technological', dataType: 'number', quantityId: 'quantity:length', recommendedUnitId: 'unit:m' }),
  property({ id: 'property:diameter', name: text('Internal diameter', 'Внутренний диаметр'), description: text('Internal diameter of a conduit.', 'Внутренний диаметр канала.'), category: 'technological', dataType: 'number', quantityId: 'quantity:length', recommendedUnitId: 'unit:m' }),
  property({ id: 'property:roughness', name: text('Roughness', 'Шероховатость'), description: text('Absolute wall roughness.', 'Абсолютная шероховатость стенки.'), category: 'mechanical', dataType: 'number', quantityId: 'quantity:length', recommendedUnitId: 'unit:m' }),
  property({ id: 'property:head', name: text('Head', 'Напор'), description: text('Elevation or pump head as a length.', 'Геодезический или насосный напор как длина.'), category: 'technological', dataType: 'number', quantityId: 'quantity:length', recommendedUnitId: 'unit:m' }),
  property({ id: 'property:pressure', name: text('Pressure', 'Давление'), description: text('Pressure.', 'Давление.'), category: 'physical', dataType: 'number', quantityId: 'quantity:pressure', recommendedUnitId: 'unit:Pa' }),
  property({ id: 'property:volume-flow', name: text('Volumetric flow rate', 'Объёмный расход'), description: text('Volume delivered per time.', 'Объём за время.'), category: 'technological', dataType: 'number', quantityId: 'quantity:volume-flow', recommendedUnitId: 'unit:m3-s' }),
  property({ id: 'property:efficiency', name: text('Efficiency', 'КПД'), description: text('Useful output divided by input.', 'Полезная отдача, делённая на затрату.'), category: 'energy', dataType: 'number', quantityId: 'quantity:ratio', recommendedUnitId: 'unit:percent' }),
  property({ id: 'property:power', name: text('Power', 'Мощность'), description: text('Energy per time.', 'Энергия за время.'), category: 'energy', dataType: 'number', quantityId: 'quantity:power', recommendedUnitId: 'unit:W' }),
]

export const builtinQuantityLibrary: QuantityLibrary = { properties, quantities, units }

export function mergeQuantityLibraries(user: QuantityLibrary): QuantityLibrary {
  return {
    properties: [...builtinQuantityLibrary.properties, ...user.properties],
    quantities: [...builtinQuantityLibrary.quantities, ...user.quantities],
    units: [...builtinQuantityLibrary.units, ...user.units],
  }
}

export function searchProperties(
  library: QuantityLibrary,
  textQuery: string,
  filters: { category?: string; quantityId?: string } = {},
): PropertyDefinition[] {
  const needle = textQuery.trim().toLowerCase()
  return library.properties.filter((property) => {
    if (filters.category && property.category !== filters.category) {
      return false
    }
    if (filters.quantityId && property.quantityId !== filters.quantityId) {
      return false
    }
    if (!needle) {
      return true
    }
    const quantity = findQuantity(library, property.quantityId)
    const units = unitsForProperty(library, property)
    const names = [property.name.en, property.name.ru, quantity?.name.en, quantity?.name.ru]
    const symbols = units.flatMap((unit) => [unit.symbol, unit.name.en, unit.name.ru])
    if (needle.length < 4) {
      const tokens = [...names, ...symbols].flatMap((value) => value?.toLowerCase().split(/[^\p{L}\p{N}]+/u) ?? [])
      return tokens.includes(needle) || symbols.some((value) => value.toLowerCase() === needle)
    }
    const haystack = [...names, property.description.en, property.description.ru, property.category, ...symbols].join('\n').toLowerCase()
    return haystack.includes(needle)
  })
}

export function libraryQuantityDimension(library: QuantityLibrary, quantityId: string): Dimension | undefined {
  return library.quantities.find((item) => item.id === quantityId)?.dimension
}
