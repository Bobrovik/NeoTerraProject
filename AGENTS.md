# NeoTerraProject

## Project Overview

NeoTerraProject (package `future-city`, product name Future City) is a browser research model of a resource-based city and planet. It connects planetary resource layers, city layouts, objects, systems, documents, and tasks. The city and planet interface is English. The resource catalog interface can be shown in English or Russian; English is the default. One id is meant to identify the same thing in the mesh, the inspector, a system membership, and a flow endpoint.

## Architecture

Layers:

- `src/domain` — types and pure functions. No React or Three.js except where a module already imports Three for geometry.
- `src/data` — demo records, catalog loading, `localStorage`, and remote feed adapters.
- `src/features` — pages and forms.
- `src/3d` — city and globe scenes.
- `src/shared` — controls, status, search, breadcrumbs.
- `src/app` — shell, router, config.

The in-memory catalog (`CatalogSnapshot`) is cities, object categories, city objects, resource types, systems, flows, roads, documents, and tasks. The resource/source/consumer card catalog is a separate domain model in `src/domain/resource-catalog.ts`. Its browser adapter is `src/data/resource-catalog-storage.ts`. List filtering and sorting live in `src/domain/resource-catalog-view.ts`. The form draft is converted by `src/domain/resource-catalog-form.ts`. Physical dimensions, quantities, units, and property definitions are pure functions in `src/domain/quantity`. User definitions are stored by `src/data/quantity-library-storage.ts`. Relationship queries, integrity notices, and link add/remove live in `src/domain/resource-network.ts`. Pages: `src/features/catalog/CatalogPage.tsx`, `src/features/catalog/CatalogCardPage.tsx`, and `src/features/catalog/CatalogNetworkPage.tsx`.

## Routing

Router: `src/app/router.tsx`. Shell: `src/app/AppShell.tsx`.

- `/` Home
- `/planet` Planet
- `/catalog` resource, source, and consumer cards
- `/catalog/network` graph and list of produces and uses connections
- `/catalog/new` and `/catalog/:cardId` create, view, and edit one card
- `/cities/:cityId` city viewer, plus `objects/:objectId`
- `/cities/:cityId/systems/:systemId`
- `/editor` and `/editor/:cityId` city editor, plus object routes
- `/documents` and `/documents/:documentId`
- `/tasks`
- `/about`

Viewer and editor share `CityLayout`. The viewer does not render the Systems tab, layout tools, or the right inspector.

## Data Model

Defined in `src/domain/types.ts`.

- `City`, `CityObject`, `CitySystem`, `Road` are city-scoped. Object placement is local meters, Y-up.
- `ResourceType` is a named unit and color. `ResourceFlow` links two objects inside one system and may carry quantity, unit, interval, capacity, and loss. A flow is not a distribution network. A road is not a pipe.
- `Metric` on a city object is a display string plus reliability, not a numeric quantity.
- `ReliabilityStatus`: `verified`, `engineering-fact`, `fresco-principle`, `hypothesis`, `demo`.
- `CatalogDocument` and `ProjectTask` link back to city, object, or system ids.

Demo cities Aurora (`city:aurora`) and Meridian (`city:meridian`) stay in the demo snapshot. They do not receive automatic rates or tutorial writes.

Resource catalog cards are universal records, not city objects and not instances placed in a city. One card has `kind`: `resource`, `source`, or `consumer`. A source and a consumer are separate cards today. A later city instance may both produce and consume; that does not require a new card kind now. Shared fields include status, scarcity, and priority. Scarcity is a supply classification. It is separate from physical abundance, total reserves, recoverable reserves, and supply deficit. Those accounts are optional measurements. A missing number is `null`. A card does not store a city id, a region id, or a region label. A saved file that still has those fields is read, and the next save omits them. Measurements inside an old regional record stay. The place names do not.

A characteristic is a property definition plus one or more measurements. Property definitions, physical quantities, and units live in `src/domain/quantity`. A dimension is seven integer exponents: mass `M`, length `L`, time `T`, electric current `I`, thermodynamic temperature `Θ` (stored as `Th`), amount of substance `N`, and luminous intensity `J`. The zero dimension is the dimensionless quantity `1`. A quantity is not a unit. An affine unit converts to the coherent unit of the same dimension by `factor * value + offset`. A defined unit, such as pH, NTU, or CFU/100 mL, has no numeric conversion. Absolute temperature and a temperature interval share the dimension `Θ` and do not convert into each other. Symbol matching is case sensitive.

The built-in library is code. User-defined properties, quantities, and units are the only records in `future-city.quantity-library.v1`. A card measurement may cite `propertyId` and `unitId`. It may also carry `valueOrigin` (`measured`, `experimental`, `calculated`, `model`, `regulatory`, `design`), method, uncertainty, lower and upper values, a text value, and the temperature or pressure at which it was taken. Several measurements may cite one property. A missing number stays absent.

`quantityKind` remains the legacy closed set: `mass`, `volume`, `density`, `power`, `energy`, `productionRate`, `consumptionRate`, `reserve`, `area`, `count`, `efficiency`. Power and energy are different kinds. A stock and a rate are different kinds. A new measurement writes `quantityKind` only when its quantity id is exactly mass, volume, density, power, energy, or area, or when the property is the built-in efficiency property. Anything else keeps the entered value and unit and omits `quantityKind`. Reading a legacy measurement does not invent a property. A measurement without `propertyId` is shown as needing a physical quantity. Optional `measuredAt`, `periodStart`, `periodEnd`, `conditions`, `evidenceId`, and `aspect` sit on a measurement. `aspect` is `property`, `quality`, `requirement`, `metric`, or `operation`. A missing aspect stays a quantitative metric. A requirement is one recorded value. A range uses the measurement's lower and upper values.

Evidence records have their own ids. A measurement may cite one of them. A draft may have an empty evidence list. Source-only and consumer-only fields live in `sourceProfile` and `consumerProfile`.

Links are separate records. `produces` connects a source card to a resource card. `uses` connects a consumer card to a resource card. A link that cites a missing card, or the wrong kind of card, is rejected. A link does not store a rate; rates stay on measurements.

## Data Persistence

Five separate browser stores, plus one interface-settings record. None is a server database.

- `future-city.layouts.v1` — city drafts and user cities. File versions `1 | 2`. Writes use version 2. Parse still accepts version 1.
- City project file `future-city-project` version 1 — one city export/import. Demo ids are not overwritten. An import of a demo city becomes `city:${stem}-imported`.
- `future-city.planet-feeds.v1` version 1 — cached planet feeds.
- `future-city.resource-catalog.v1` version 1 — `{ version, cards, links }`. The first read with no key is an empty catalog. A corrupt file or an unknown version is left in place and is not treated as empty. Writes go through the catalog parser and touch only this key. No demonstration cards are seeded. The file does not store translations of a card.
- `future-city.settings.v1` version 1 — `{ version, language }` where language is `en` or `ru`. A missing, corrupt, or unknown file is read as English and is not overwritten until the user chooses a language. The choice is interface copy only.
- `future-city.quantity-library.v1` version 1 — `{ version, properties, quantities, units }` for definitions a person adds. Built-in definitions stay in code and are not written into this file. A missing key is an empty user library. A corrupt file or an unknown version is left in place and is not treated as empty. The catalog key stays version 1.

Missing values stay absent. Do not store a missing number as zero.

## Implemented Features

- City viewer and editor, object placement, roads, schematic 3D, energy balance (`calculateEnergyBalance`), and a single-city project file.
- Planet layers: flags, armed conflicts, forest resources, freshwater, mineral deposits, population. Extra layers default off.
- Forest and population color countries from national World Bank statistics. They are not forest-stand maps or counts of people inside a shape.
- Conflicts are UCDP candidate points through the Vite `/ucdp-feed` forward. Country-only precision is not drawn.
- Minerals are USGS major nonfuel deposits (OFR 2005-1294). Shape and color mark the category. Oil, natural gas, reserves, and mine status are not in that file.
- Resource catalog types, versioned storage, a `/catalog` list, a card form, and a `/catalog/network` page. The form and the network page read and write the same catalog file. A source can record the resources it produces, and a consumer can record the resources it uses. The network draws those links and can add or delete them. A link is not a flow, and the page does not calculate a balance. No seeded cards.
- Scientific characteristics: a built-in quantity and unit library, user-defined definitions, dimension checks, and unit conversion inside the existing card sections. The pump relation `P = ρ × g × Q × H / η` is checked as a dimension identity for power. There is no hydraulic calculation.

## Current State

Branch: `feature/building-placement`. Remote: `origin` → `https://github.com/Bobrovik/NeoTerraProject.git`.

The resource catalog list, card editor, relationship network, and scientific characteristic library are in the app.

The working tree may contain edits outside a catalog commit. Do not fold unrelated files into a catalog commit.

## Technical Decisions

- Keep city layout storage, planet feed cache, and the resource card catalog in separate versioned keys. The layout parser rejects unknown shapes, so catalog cards do not belong in `future-city.layouts.v1`. A link that cites a missing card is rejected rather than stored.
- Do not reuse `ResourceType` or `ResourceFlow` as the universal card. Those types are city-flow records. A universal card has its own id. A city instance, when one exists, points at that card and keeps location, stock, and actual performance for itself.
- Catalog search, filters, and sorting are pure functions. Kind, text, category, scarcity, priority, and status apply together. Text matches name, summary, category, and subcategory.
- The card form keeps an editing draft and writes a catalog card on save. An empty numeric field stays `null` or omitted. Deleting evidence clears measurement references to that id. A URL does not set verification. Catalog labels, buttons, statuses, and messages come from `src/shared/i18n`. A new language is another dictionary with the same keys; components are not rewritten for it. The RU / EN switcher is `LanguageSwitcher`, shown on catalog routes, and the saved choice also sets the catalog navigation label. Names, descriptions, categories, units, conditions, and study text stay as entered. The form shows name, category, description, status, priority, and scarcity first. Image stays in a closed section. Studies are entered once and chosen as a measurement's data source. Extra measurement fields stay closed until opened. Characteristics are added by group: property, quality or requirement, metric, and operation. Each named account still holds one measurement; several measurements of one kind go in the measurement list. Catalog failures are stable codes in `src/domain/catalog-message.ts`; the page translates the code.
- Produces and uses links stay the catalog link records. The network page adds and deletes those records through the same parser and storage key. Replacing a connection is a delete followed by an add. Missing or wrong-kind links and duplicate endpoint pairs are errors. A card with no connection is a warning, and the page does not delete it. The graph is plain SVG in three columns. Above 18 visible nodes it asks for a focus before drawing.
- Absence of a measurement is not zero. Priority is not scarcity. A stock is not a replenishment rate. Power (kW) is not energy (kWh). A physical quantity is not a unit. pH is a logarithmic activity, and NTU and CFU stay method-specific units.
- Do not invent scientific numbers. A demo value must be labeled demo. A link is not verification. Do not invent a property for a legacy `quantityKind`, and do not invent a `quantityKind` for a quantity that is not one of the explicit mappings.
- Changing a compatible unit converts the entered number through the dimension model. An incompatible unit is not offered. User definitions are validated for dimension, id, factor, and unit compatibility before they are stored. Selecting a library quantity fills its dimension and compatible units.
- Do not rewrite `calculateEnergyBalance`, the editor/viewer split, or city import unless the task requires it.
- Node on PATH may be 18. Use portable Node 22 at `%LOCALAPPDATA%\node-v22.23.3-win-x64` for tests, `tsc`, and ESLint. PowerShell does not accept `&&`.

## Known Issues

- `src/features/city/CityFileActions.tsx` has an existing `react-refresh/only-export-components` warning.
- JRC and Hansen forest rasters are not loaded. Forest color is a national percent.
- UCDP is readable in dev and preview only when the Vite forward is present.
- USGS major deposits are nonfuel locations through 2009, not reserves or mine status.

## Next Steps

The catalog is a universal library. City placement, actual stock, and current performance stay out of the card. The compact bilingual form is `src/features/catalog/CatalogCardPage.tsx`. Characteristics are chosen from the quantity library or defined by the user; they are not a fixed table of pipeline fields.

Stop here. Do not start a city-instance catalog stage unless a new task asks for it. Do not seed scientific examples. Do not add a hydraulic simulator until a task asks for that calculation.
