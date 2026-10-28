import type {
  CatalogDocument,
  CatalogSnapshot,
  City,
  CityObject,
  CitySystem,
  ObjectCategory,
  ProjectTask,
  Reliability,
  ResourceFlow,
  ResourceType,
  Road,
} from '../../domain/types'

function demo(note: string): Reliability {
  return {
    status: 'demo',
    source: 'Local demonstration catalog',
    note,
    updatedAt: '2026-10-18',
  }
}

function hypothesis(note: string): Reliability {
  return {
    status: 'hypothesis',
    source: 'Project working notes',
    note,
    updatedAt: '2026-10-18',
  }
}

const frescoPrinciple: Reliability = {
  status: 'fresco-principle',
  source: 'Jacque Fresco / The Venus Project, interpreted for this model',
  note: 'A design principle used as a prompt for the model. It is not an engineering measurement.',
  updatedAt: '2026-10-18',
}

export const categories: ObjectCategory[] = [
  {
    id: 'category:energy',
    name: 'Energy',
    description: 'Places that are intended to supply energy.',
    color: '#d4b483',
  },
  {
    id: 'category:distribution',
    name: 'Distribution',
    description: 'Places that pass a resource onward.',
    color: '#8eb8d4',
  },
  {
    id: 'category:habitat',
    name: 'Habitat',
    description: 'Places where people live.',
    color: '#8fbfa8',
  },
  {
    id: 'category:production',
    name: 'Production',
    description: 'Places for making and repairing things.',
    color: '#d08a86',
  },
  {
    id: 'category:civic',
    name: 'Civic',
    description: 'Shared spaces that are not assigned to one supply system.',
    color: '#c3b7d8',
  },
]

export const resourceTypes: ResourceType[] = [
  {
    id: 'resource:electricity',
    name: 'Electricity',
    unit: 'kWh',
    color: '#e2c27a',
    flowKind: 'energy',
    description: 'Electrical energy. The demo system draws this resource only.',
  },
  {
    id: 'resource:potable-water',
    name: 'Potable water',
    unit: 'm3',
    color: '#7eb6d6',
    flowKind: 'water',
    description: 'Drinking water. Defined so a later system can reference it. No water flows exist yet.',
  },
  {
    id: 'resource:materials',
    name: 'Materials',
    unit: 't',
    color: '#c4a484',
    flowKind: 'materials',
    description: 'Bulk construction and production materials. No flows exist yet.',
  },
  {
    id: 'resource:goods',
    name: 'Goods',
    unit: 'unit',
    color: '#9dbe8c',
    flowKind: 'goods',
    description: 'Finished goods. No flows exist yet.',
  },
  {
    id: 'resource:solid-waste',
    name: 'Solid waste',
    unit: 't',
    color: '#a39890',
    flowKind: 'waste',
    description: 'Discarded solid material. No flows exist yet.',
  },
  {
    id: 'resource:information',
    name: 'Information',
    unit: 'message',
    color: '#c3b7d8',
    flowKind: 'information',
    description: 'A recorded information link. No control system is implemented.',
  },
]

export const cities: City[] = [
  {
    id: 'city:aurora',
    name: 'Aurora',
    summary: 'A compact schematic with a shared center and a demonstration electricity path.',
    description:
      'Aurora is an illustrative city used to connect buildings, an energy system, and documents to the same identifiers. The ring-like arrangement is stored as coordinates. It is not produced by a radial layout rule. The globe marker is placed in Africa and is not a surveyed site.',
    latitude: 6.8,
    longitude: 22.4,
    developmentStatus: 'schematic',
    reliability: demo('Illustrative city. Coordinates are not a proposed construction site.'),
  },
  {
    id: 'city:meridian',
    name: 'Meridian',
    summary: 'A linear group of buildings with no resource system configured.',
    description:
      'Meridian checks that a city can be opened and explored when the catalog contains objects but no systems or flows. The buildings sit on a straight line because their coordinates say so. The globe marker is placed in Siberia and is not a surveyed site.',
    latitude: 62.3,
    longitude: 102.8,
    developmentStatus: 'concept',
    reliability: hypothesis('A second layout, included so the shell is not tied to one city shape.'),
  },
]

const auroraObjects: CityObject[] = [
  {
    id: 'object:aurora:commons',
    cityId: 'city:aurora',
    name: 'Commons',
    categoryId: 'category:civic',
    description:
      'A shared open structure at the center of the schematic. It is not a member of the electricity system. How a civic space should participate in resource accounting is still an open question.',
    placement: {
      position: { x: 0, y: 1.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 16, y: 3, z: 16 },
    },
    representation: {
      kind: 'model',
      url: '/models/test-cube.glb',
      fallback: { shape: 'cylinder', color: '#c3b7d8' },
    },
    systemIds: [],
    metrics: [],
    reliability: hypothesis('The commons is a placeholder for a shared civic program that has not been specified.'),
    documentIds: ['doc:city-form'],
  },
  {
    id: 'object:aurora:solar-field',
    cityId: 'city:aurora',
    name: 'Solar field',
    categoryId: 'category:energy',
    description:
      'Stands in for an electricity source. No collector area, yield, or storage has been calculated. The block only marks where a source sits in the model.',
    placement: {
      position: { x: -32, y: 2, z: 10 },
      rotation: { x: 0, y: 0.3, z: 0 },
      size: { x: 16, y: 4, z: 12 },
    },
    representation: { kind: 'primitive', shape: 'box', color: '#d4b483' },
    facilityType: 'energy-source',
    systemIds: ['system:aurora:energy'],
    metrics: [
      {
        label: 'Supply role',
        value: 'Source',
        reliability: demo('Role in the diagram, not a measured output.'),
      },
    ],
    reliability: demo('Geometry and role are placeholders.'),
    documentIds: ['doc:aurora-energy-question'],
  },
  {
    id: 'object:aurora:distribution-hub',
    cityId: 'city:aurora',
    name: 'Distribution hub',
    categoryId: 'category:distribution',
    description:
      'The distribution center in the demo. Electricity is recorded from the solar field to this hub, then from the hub to the habitats and the workshop. The records are links. They are not a calculated distribution.',
    placement: {
      position: { x: -12, y: 3, z: 6 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 8, y: 6, z: 8 },
    },
    representation: { kind: 'primitive', shape: 'box', color: '#8eb8d4' },
    facilityType: 'distribution-center',
    systemIds: ['system:aurora:energy'],
    metrics: [
      {
        label: 'Supply role',
        value: 'Passes electricity onward',
        reliability: demo('Connectivity only.'),
      },
    ],
    reliability: demo('One hub is enough to show a path. It is not a proposed network design.'),
    documentIds: ['doc:aurora-energy-question'],
  },
  {
    id: 'object:aurora:north-habitat',
    cityId: 'city:aurora',
    name: 'North habitat',
    categoryId: 'category:habitat',
    description: 'A residential block used as an electricity consumer in the demo diagram.',
    placement: {
      position: { x: 6, y: 5, z: -24 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 12, y: 10, z: 10 },
    },
    representation: { kind: 'primitive', shape: 'box', color: '#8fbfa8' },
    systemIds: ['system:aurora:energy'],
    metrics: [
      {
        label: 'Supply role',
        value: 'Consumer',
        reliability: demo('No occupancy or demand figure is attached.'),
      },
    ],
    reliability: demo('Massing only.'),
    documentIds: [],
  },
  {
    id: 'object:aurora:east-habitat',
    cityId: 'city:aurora',
    name: 'East habitat',
    categoryId: 'category:habitat',
    description: 'A second residential block, also a consumer, so the hub has more than one outgoing path.',
    placement: {
      position: { x: 26, y: 4, z: 2 },
      rotation: { x: 0, y: -0.2, z: 0 },
      size: { x: 14, y: 8, z: 10 },
    },
    representation: { kind: 'primitive', shape: 'box', color: '#7eaf98' },
    systemIds: ['system:aurora:energy'],
    metrics: [
      {
        label: 'Supply role',
        value: 'Consumer',
        reliability: demo('No occupancy or demand figure is attached.'),
      },
    ],
    reliability: demo('Massing only.'),
    documentIds: [],
  },
  {
    id: 'object:aurora:civic-workshop',
    cityId: 'city:aurora',
    name: 'Civic workshop',
    categoryId: 'category:production',
    description:
      'A production building in the electricity diagram. What it makes, and which materials it would need, is not defined.',
    placement: {
      position: { x: 4, y: 4, z: 22 },
      rotation: { x: 0, y: 0.15, z: 0 },
      size: { x: 18, y: 8, z: 12 },
    },
    representation: { kind: 'primitive', shape: 'box', color: '#d08a86' },
    systemIds: ['system:aurora:energy'],
    metrics: [
      {
        label: 'Supply role',
        value: 'Consumer',
        reliability: demo('Electricity consumer only. Material flows are not defined.'),
      },
    ],
    reliability: hypothesis('Included so production can later become its own system without moving the building.'),
    documentIds: ['doc:aurora-energy-question'],
  },
]

const meridianObjects: CityObject[] = [
  {
    id: 'object:meridian:west-habitat',
    cityId: 'city:meridian',
    name: 'West habitat',
    categoryId: 'category:habitat',
    description: 'The western end of a linear group. No supply connection is configured.',
    placement: {
      position: { x: -36, y: 4, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 12, y: 8, z: 10 },
    },
    representation: { kind: 'primitive', shape: 'box', color: '#8fbfa8' },
    systemIds: [],
    metrics: [],
    reliability: demo('Massing only.'),
    documentIds: ['doc:meridian-layout'],
  },
  {
    id: 'object:meridian:study',
    cityId: 'city:meridian',
    name: 'Study hall',
    categoryId: 'category:civic',
    description: 'A shared room in the line. Its program is a placeholder.',
    placement: {
      position: { x: -12, y: 3.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 14, y: 7, z: 12 },
    },
    representation: { kind: 'primitive', shape: 'box', color: '#c3b7d8' },
    systemIds: [],
    metrics: [],
    reliability: hypothesis('Program is undecided.'),
    documentIds: ['doc:meridian-layout'],
  },
  {
    id: 'object:meridian:depot',
    cityId: 'city:meridian',
    name: 'Depot',
    categoryId: 'category:distribution',
    description: 'A store building. It is not yet the endpoint of any resource flow.',
    placement: {
      position: { x: 12, y: 3, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 16, y: 6, z: 12 },
    },
    representation: { kind: 'primitive', shape: 'box', color: '#8eb8d4' },
    systemIds: [],
    metrics: [],
    reliability: demo('Present so a later goods or materials flow has a place to land.'),
    documentIds: [],
  },
  {
    id: 'object:meridian:east-platform',
    cityId: 'city:meridian',
    name: 'East platform',
    categoryId: 'category:production',
    description: 'A low platform at the eastern end of the line.',
    placement: {
      position: { x: 36, y: 1, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 18, y: 2, z: 14 },
    },
    representation: { kind: 'primitive', shape: 'cylinder', color: '#d08a86' },
    systemIds: [],
    metrics: [],
    reliability: demo('Massing only.'),
    documentIds: ['doc:meridian-layout'],
  },
]

const auroraEnergy: CitySystem = {
  id: 'system:aurora:energy',
  cityId: 'city:aurora',
  kind: 'energy',
  name: 'Aurora electricity diagram',
  description:
    'A demonstration path for electricity: a source, one hub, and three consumers. It does not estimate generation, demand, storage, or loss. The same system record shape can describe water, materials, goods, or waste once those flows are added.',
  memberObjectIds: [
    'object:aurora:solar-field',
    'object:aurora:distribution-hub',
    'object:aurora:north-habitat',
    'object:aurora:east-habitat',
    'object:aurora:civic-workshop',
  ],
  reliability: demo('Connectivity diagram. Not an energy balance.'),
  documentIds: ['doc:aurora-energy-question'],
}

const auroraFlows: ResourceFlow[] = [
  {
    id: 'flow:aurora:energy:solar-hub',
    systemId: 'system:aurora:energy',
    resourceTypeId: 'resource:electricity',
    sourceObjectId: 'object:aurora:solar-field',
    targetObjectId: 'object:aurora:distribution-hub',
    reliability: demo('Direction only. Quantity is intentionally absent.'),
  },
  {
    id: 'flow:aurora:energy:hub-north',
    systemId: 'system:aurora:energy',
    resourceTypeId: 'resource:electricity',
    sourceObjectId: 'object:aurora:distribution-hub',
    targetObjectId: 'object:aurora:north-habitat',
    reliability: demo('Direction only. Quantity is intentionally absent.'),
  },
  {
    id: 'flow:aurora:energy:hub-east',
    systemId: 'system:aurora:energy',
    resourceTypeId: 'resource:electricity',
    sourceObjectId: 'object:aurora:distribution-hub',
    targetObjectId: 'object:aurora:east-habitat',
    reliability: demo('Direction only. Quantity is intentionally absent.'),
  },
  {
    id: 'flow:aurora:energy:hub-workshop',
    systemId: 'system:aurora:energy',
    resourceTypeId: 'resource:electricity',
    sourceObjectId: 'object:aurora:distribution-hub',
    targetObjectId: 'object:aurora:civic-workshop',
    reliability: demo('Direction only. Quantity is intentionally absent.'),
  },
]

export const documents: CatalogDocument[] = [
  {
    id: 'doc:city-guide',
    title: 'Как работать с городом',
    summary: 'Пошагово: новый город, карта и сцена, объекты, модель, дороги, связи и сохранение.',
    body: [
      'Это инструкция к кнопкам, которые уже есть в программе. Карта, трёхмерная сцена, сохранённые связи и расчёт ресурсов — разные вещи. Карта показывает улицы. Сцена показывает объекты в метрах. Связь только записывает, что один объект соединён с другим. Программа не считает, сколько энергии или воды реально дошло.',
      'Что уже можно сделать в окне программы: создать город, поставить здание на сетке или на карте, подвинуть и повернуть его, изменить имя, описание и размеры, нарисовать дорогу, создать или удалить связь, скачать и загрузить JSON. Что пока нельзя кнопкой: выбрать файл модели, перенести центр уже созданного города, посчитать поставку ресурса. Для модели нужен файл в проекте. Это написано ниже.',
      'Создать город. Откройте Editor в верхнем меню. Справа форма New city. Name — имя, как оно будет видно в списке. City id — короткий латинский код, например harbor или city:harbor. Сохранится city:harbor. Коды city:aurora и city:meridian заняты. Latitude — широта от −90 до 90. Longitude — долгота от −180 до 180. Это точка WGS84, центр города. Нажмите Create city. Откроется редактор этого города, адрес вида /editor/city:harbor. Объектов, дорог и связей ещё нет. Просмотр без инструментов правки — View или адрес /cities/city:harbor. Убрать созданный город можно кнопкой Remove city на странице Editor. Aurora и Meridian этой кнопкой не удаляются.',
      'Открыть город и переключить вид. Просмотр города — Overview, Systems и Map. Редактор добавляет Layout. Overview, Layout и Systems — одна трёхмерная сцена. Map — плоская карта улиц. Объекты те же. Отдельного списка для карты нет. Overview — обзор. Layout — расстановка: сетка 4 м, кнопки Select, Place, Draw road. Systems — связи и расчёт. На карте видны те же объекты точками. Если карта не загрузилась, появится текст, что источник недоступен. Город при этом открывается.',
      'Поставить объект на сцене. Это делает редактор, не просмотр. Откройте город через Editor и включите Layout. В ряду зданий выберите тип, например Distribution center. Это склад-хаб в каталоге. Нажмите Place и щёлкните по сетке. Объект встаёт в ближайшую точку сетки 4 м. Select — выбрать и перетащить. Rotate — поворот на 90°. Delete — удалить выбранный объект. Дорога и связи, которые на него указывали, теряют эту точку. Проверка: справа в панели имя Distribution center, ниже Local position с метрами на восток и север. Обновите страницу: объект на том же месте. Запись лежит в этом браузере. В просмотре этих кнопок нет.',
      'Поставить объект на карте. В редакторе включите Map. Щёлкните землю, не маркер уже стоящего объекта. Справа появятся широта, долгота и метры: сколько на восток и на север от центра города. Выберите тип здания и нажмите Place here. Точка дальше 20 км от центра не сохраняется. Кнопка тогда не сработает. Сетка снова округляет до 4 м. Проверка: запомните метры, переключитесь на Layout. Здание стоит в этих метрах. Смена масштаба карты положение не меняет. В просмотре карта только показывает уже сохранённый город.',
      'Широта, долгота и местные метры. Широта и долгота задаются один раз в New city. Это центр. В сцене X — восток в метрах, Z — север в метрах, Y — вверх. Y — высота центра объекта, не высота над уровнем моря. Ноль сетки совпадает с центром города. Сдвиг на восток увеличивает долготу, сдвиг на север увеличивает широту. В панели объекта строка Local position — сохранённые метры. Строка WGS84 from the city origin — та же точка в градусах. Это плоский пересчёт около центра, не геодезическая точность. Дальше 20 км панель прямо пишет, что точка вне расчёта. Ближе 5° к полюсу местные метры не строятся. Поменять широту и долготу готового города формой нельзя. Это правка файла: в скачанном JSON у города поля latitude и longitude. Объекты при этом не переезжают: их метры читаются уже от нового центра.',
      'Свойства объекта. В редакторе щёлкните объект на сцене или его имя в списке справа. В форме поля Name, Description, Width (m), Height (m), Depth (m). Размер больше 0 и не больше 200 м. Нажмите Save properties. Появится Saved in this browser. Идентификатор под заголовком не меняется. Дороги и связи продолжают указывать на него. Высота центра становится половиной Height, чтобы низ стоял на земле. Горизонтальные метры не меняются. Проверка: обновите страницу. Имя и размеры те же. В просмотре форма скрыта: видны описание, положение и уже введённые числа.',
      'Модель из Blender. Кнопки «загрузить модель» нет. Объект рисуется ящиком, цилиндром или файлом .glb. Сейчас модель есть только у Commons в Aurora: файл public/models/test-cube.glb. Это проверочный куб, не дом из Blender. В Overview он выглядит плоским серым блоком в центре, размером 16 × 3 × 16 м. Если файл пропадёт, Commons снова станет сиреневым цилиндром, сцена не ломается. Карта модель не показывает, только точку.',
      'Как подставить свою модель. Это правка проекта, не кнопка. В Blender поставьте метры и перед экспортом включите Y Up: в сцене Y — вверх. Примените масштаб объекта. Экспортируйте glTF Binary (.glb). Положите файл в public/models/, например public/models/warehouse.glb. В src/data/demo/records.ts у нужного объекта замените только representation. Идентификатор и placement не трогайте. Пример для склада, который вы уже поставили, удобнее править в скачанном JSON, в том же поле representation:\n{\n  "kind": "model",\n  "url": "/models/warehouse.glb",\n  "fallback": { "shape": "box", "color": "#8eb8d4" }\n}\nfallback — простой ящик, если файл не открылся. Программа вписывает модель в Width, Height и Depth и ставит центр ящика в сохранённую точку. Размер не зависит от камеры. Если пропорции файла другие, модель растянется по осям. Обновите страницу. Если город уже сохранён в браузере, черновик прячет каталог: в Layout нажмите Reset city у демонстрационного города или поправьте representation в загружаемом JSON.',
      'Дорога. В Layout нажмите Draw road. Щёлкайте пустую сетку или сами объекты. Нужны хотя бы две точки. Finish road заканчивает ввод. Дорога — линия проезда. Она не проводит электричество, воду и данные. Проверка: выключите слой Roads слева. Линия пропадает, здания остаются. Снова включите Roads. В Systems золотые линии — это связи ресурсов, не дороги.',
      'Связь ресурсов. В редакторе откройте объект и включите Systems. Внизу панели форма: Recipient — кому, Resource — какой ресурс (Electricity, Potable water, Materials, Goods, Solid waste, Information). Нажмите Create link from this object. Связь идёт от открытого объекта к выбранному. Delete link удаляет запись. Числа производства, спроса и пределов линии задаются там же, в форме энергии. В просмотре форма скрыта, связь и уже посчитанный баланс видны. В Aurora уже есть схема электричества: Solar field → Distribution hub → три здания. Её можно посмотреть, не создавая новую. Вода и материалы в каталоге названы, своих стрелок у демо нет, пока вы их не создадите.',
      'Сохранить, скачать, вернуть. Каждая правка сама пишется в браузер. Сервера нет. В Layout редактора Download JSON скачивает future-city-layout.json со всеми городами этого браузера. Load JSON читает такой же файл обратно. Export city скачивает один город: имя, координаты, объекты, дороги, связи и параметры энергии. Import city на Planet, в редакторе или в просмотре читает этот файл и восстанавливает город. Демонстрационные Aurora и Meridian таким файлом не заменяются. Reset city у Aurora или Meridian возвращает демонстрационный каталог и стирает правки только этого города. У города, созданного в редакторе, Reset city очищает объекты, но сам город оставляет. Remove city на странице Editor удаляет созданный город целиком. Проверка сохранения: поставьте склад, обновите страницу, склад на месте.',
      'Короткий сценарий. В Editor создайте город с именем и координатами. Layout → Distribution center → Place → щелчок по сетке. Справа поправьте Name и Width, Save properties. Draw road от склада к другой точке, Finish road. Откройте склад, Systems, выберите второй объект и Electricity, Create link from this object. Export city. Open in viewer: кнопок расстановки нет, сцена показывает сохранённый город. Import city на пустом браузере возвращает тот же город.',
    ].join('\n\n'),
    kind: 'note',
    reliability: {
      status: 'demo',
      source: 'Интерфейс программы',
      note: 'Описание кнопок этой сборки. Не расчёт города и не вывод о том, что ресурс доставлен.',
      updatedAt: '2026-10-18',
    },
    links: [
      { kind: 'city', id: 'city:aurora' },
      { kind: 'city', id: 'city:meridian' },
    ],
  },
  {
    id: 'doc:reading-status',
    title: 'How to read certainty status',
    summary: 'What the five status labels mean in this project.',
    body: [
      'Every city, object, flow, document, and task can carry a certainty status.',
      'Verified means a result that this project has checked. Nothing in the demo catalog uses that label.',
      'Engineering fact means a claim grounded in established science or engineering, with a source. The demo does not use it yet.',
      'Fresco principle means an idea drawn from Jacque Fresco and The Venus Project. It guides questions. It is not treated as a measured design.',
      'Hypothesis means a project proposal that still needs work.',
      'Demo means placeholder content used to exercise the application.',
    ].join('\n\n'),
    kind: 'note',
    reliability: {
      status: 'engineering-fact',
      source: 'Project convention',
      note: 'This is a documentation convention of the application, not a claim about a city.',
      updatedAt: '2026-10-18',
    },
    links: [],
  },
  {
    id: 'doc:city-form',
    title: 'City form is a choice, not a rule',
    summary: 'Circular plans appear in Venus Project material. This model does not require them.',
    body: [
      'Published Venus Project imagery often shows circular cities. That image is useful as a historical design idea and is marked here as a Fresco principle.',
      'Aurora happens to place a commons near the middle. Meridian places buildings on a line. Both are ordinary coordinate lists.',
      'A later city can use any plan. The renderer does not assume a center, a ring, or a grid.',
    ].join('\n\n'),
    kind: 'principle',
    reliability: frescoPrinciple,
    links: [
      { kind: 'city', id: 'city:aurora' },
      { kind: 'city', id: 'city:meridian' },
      { kind: 'object', id: 'object:aurora:commons' },
    ],
  },
  {
    id: 'doc:aurora-energy-question',
    title: 'What should the Aurora electricity diagram calculate?',
    summary: 'An open research question linked to the demo energy system.',
    body: [
      'The current diagram only records that electricity is drawn from the solar field to the hub, and from the hub to three buildings.',
      'Before any balance is shown, the model needs an agreed method for demand, available supply, storage, and loss, plus the source of each number.',
      'Until that method exists, the screen must stay a diagram. It must not be described as a simulation.',
    ].join('\n\n'),
    kind: 'question',
    reliability: hypothesis('The diagram is intentional scaffolding. The calculation method is not chosen.'),
    links: [
      { kind: 'city', id: 'city:aurora' },
      { kind: 'system', id: 'system:aurora:energy' },
      { kind: 'object', id: 'object:aurora:solar-field' },
      { kind: 'object', id: 'object:aurora:distribution-hub' },
      { kind: 'object', id: 'object:aurora:civic-workshop' },
    ],
  },
  {
    id: 'doc:meridian-layout',
    title: 'Meridian has no resource system yet',
    summary: 'Why the second city is empty of systems.',
    body: [
      'Meridian exists so the city view can be checked without a system overlay.',
      'A future water, goods, or waste system can be added as new records that point at these object ids. The city page does not need a new component for that.',
    ].join('\n\n'),
    kind: 'hypothesis',
    reliability: hypothesis('The linear arrangement is a test of the data model.'),
    links: [
      { kind: 'city', id: 'city:meridian' },
      { kind: 'object', id: 'object:meridian:west-habitat' },
      { kind: 'object', id: 'object:meridian:study' },
      { kind: 'object', id: 'object:meridian:east-platform' },
    ],
  },
]

export const tasks: ProjectTask[] = [
  {
    id: 'task:energy-quantities',
    title: 'Decide whether Aurora electricity flows carry quantities',
    description:
      'The flow type already allows quantity, unit, interval, capacity, loss, and a basis note. None of those are filled in. Choose a method before showing numbers.',
    status: 'open',
    priority: 'high',
    cityId: 'city:aurora',
    systemId: 'system:aurora:energy',
    documentIds: ['doc:aurora-energy-question'],
    createdAt: '2026-10-18T09:00:00.000Z',
    updatedAt: '2026-10-18T09:00:00.000Z',
  },
  {
    id: 'task:meridian-system',
    title: 'Choose the first resource system for Meridian',
    description: 'Meridian has objects and no system. Pick one resource, name the members, and add flows only when the path is agreed.',
    status: 'open',
    priority: 'medium',
    cityId: 'city:meridian',
    documentIds: ['doc:meridian-layout'],
    createdAt: '2026-10-18T09:05:00.000Z',
    updatedAt: '2026-10-18T09:05:00.000Z',
  },
  {
    id: 'task:gltf-slot',
    title: 'Replace the Commons test cube with a Blender export',
    description: 'Commons loads public/models/test-cube.glb, a generated cube, not a Blender building. Export a .glb from Blender and replace that file, or point the object url at the new file.',
    status: 'open',
    priority: 'low',
    documentIds: [],
    createdAt: '2026-10-18T09:10:00.000Z',
    updatedAt: '2026-10-18T09:10:00.000Z',
  },
  {
    id: 'task:catalog-ids',
    title: 'Keep relationships on stable ids',
    description: 'Cities, objects, systems, flows, documents, and tasks already refer to each other by id. This task records that the first catalog passed that check.',
    status: 'done',
    priority: 'medium',
    documentIds: ['doc:reading-status'],
    createdAt: '2026-10-18T08:00:00.000Z',
    updatedAt: '2026-10-18T09:20:00.000Z',
  },
]

export const roads: Road[] = [
  {
    id: 'road:aurora:solar-hub',
    cityId: 'city:aurora',
    points: [
      { kind: 'object', objectId: 'object:aurora:solar-field' },
      { kind: 'control', x: -22, z: 10 },
      { kind: 'object', objectId: 'object:aurora:distribution-hub' },
    ],
  },
]

export const demoSnapshot: CatalogSnapshot = {
  cities,
  categories,
  objects: [...auroraObjects, ...meridianObjects],
  resourceTypes,
  systems: [auroraEnergy],
  flows: auroraFlows,
  roads,
  documents,
  tasks,
}
