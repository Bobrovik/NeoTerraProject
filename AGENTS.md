# NeoTerraProject

## Project Overview

NeoTerraProject (package `future-city`, product name Future City) is a browser research model of a resource-based city and planet. It connects planetary resource layers, city layouts, objects, systems, documents, and tasks. The interface is English. One id is meant to identify the same thing in the mesh, the inspector, a system membership, and a flow endpoint.

## Architecture

Layers:

- `src/domain` — types and pure functions. No React or Three.js except where a module already imports Three for geometry.
- `src/data` — demo records, catalog loading, `localStorage`, and remote feed adapters.
- `src/features` — pages and forms.
- `src/3d` — city and globe scenes.
- `src/shared` — controls, status, search, breadcrumbs.
- `src/app` — shell, router, config.

The in-memory catalog (`CatalogSnapshot`) is cities, object categories, city objects, resource types, systems, flows, roads, documents, and tasks. The resource/source/consumer card catalog is a separate domain model in `src/domain/resource-catalog.ts`. Its browser adapter is `src/data/resource-catalog-storage.ts`. List filtering and sorting live in `src/domain/resource-catalog-view.ts`. The page is `src/features/catalog/CatalogPage.tsx`.

## Routing

Router: `src/app/router.tsx`. Shell: `src/app/AppShell.tsx`.

- `/` Home
- `/planet` Planet
- `/catalog` resource, source, and consumer cards
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

Resource catalog cards are global records, not city objects. One card has `kind`: `resource`, `source`, or `consumer`. Shared fields include status, scarcity, and priority. Scarcity is a supply classification. It is separate from physical abundance, total reserves, recoverable reserves, regional availability, and supply deficit. Those accounts are optional measurements. A missing number is `null`.

`quantityKind` is a closed set: `mass`, `volume`, `density`, `power`, `energy`, `productionRate`, `consumptionRate`, `reserve`, `area`, `count`, `efficiency`. Power and energy are different kinds. A stock and a rate are different kinds. There is no unit converter. Optional `measuredAt`, `periodStart`, `periodEnd`, `conditions`, and `evidenceId` sit on a measurement.

Evidence records have their own ids. A measurement may cite one of them. A draft may have an empty evidence list. Source-only and consumer-only fields live in `sourceProfile` and `consumerProfile`.

Links are separate records. `produces` connects a source card to a resource card. `uses` connects a consumer card to a resource card. A link that cites a missing card, or the wrong kind of card, is rejected. A link does not store a rate; rates stay on measurements.

## Data Persistence

Four separate browser stores. None is a server database.

- `future-city.layouts.v1` — city drafts and user cities. File versions `1 | 2`. Writes use version 2. Parse still accepts version 1.
- City project file `future-city-project` version 1 — one city export/import. Demo ids are not overwritten. An import of a demo city becomes `city:${stem}-imported`.
- `future-city.planet-feeds.v1` version 1 — cached planet feeds.
- `future-city.resource-catalog.v1` version 1 — `{ version, cards, links }`. The first read with no key is an empty catalog. A corrupt file or an unknown version is left in place and is not treated as empty. Writes go through the catalog parser and touch only this key. No demonstration cards are seeded.

Missing values stay absent. Do not store a missing number as zero.

## Implemented Features

- City viewer and editor, object placement, roads, schematic 3D, energy balance (`calculateEnergyBalance`), and a single-city project file.
- Planet layers: flags, armed conflicts, forest resources, freshwater, mineral deposits, population. Extra layers default off.
- Forest and population color countries from national World Bank statistics. They are not forest-stand maps or counts of people inside a shape.
- Conflicts are UCDP candidate points through the Vite `/ucdp-feed` forward. Country-only precision is not drawn.
- Minerals are USGS major nonfuel deposits (OFR 2005-1294). Shape and color mark the category. Oil, natural gas, reserves, and mine status are not in that file.
- Resource catalog types, versioned storage, and a `/catalog` list with type counts, search, filters, and sorting. The list does not show measurements or evidence. Create card is present and inactive until the form exists. No seeded cards.

## Current State

Branch: `feature/building-placement`. Remote: `origin` → `https://github.com/Bobrovik/NeoTerraProject.git`.

The resource catalog list is in the primary navigation. Card creation and detail views are not built.

The working tree may contain edits outside a catalog commit. Do not fold unrelated files into a catalog commit.

## Technical Decisions

- Keep city layout storage, planet feed cache, and the resource card catalog in separate versioned keys. The layout parser rejects unknown shapes, so catalog cards do not belong in `future-city.layouts.v1`. A link that cites a missing card is rejected rather than stored.
- Do not reuse `ResourceType` or `ResourceFlow` as the universal card. Those types are city-flow records. A global card needs its own id and optional links to a city id later.
- Catalog search, filters, and sorting are pure functions. Kind, text, category, scarcity, priority, and status apply together. Text matches name, summary, category, and subcategory.
- Absence of a measurement is not zero. Priority is not scarcity. A stock is not a replenishment rate. Power (kW) is not energy (kWh).
- Do not invent scientific numbers. A demo value must be labeled demo. A link is not verification.
- Do not rewrite `calculateEnergyBalance`, the editor/viewer split, or city import unless the task requires it.
- Node on PATH may be 18. Use portable Node 22 at `%LOCALAPPDATA%\node-v22.23.3-win-x64` for tests, `tsc`, and ESLint. PowerShell does not accept `&&`.

## Known Issues

- `src/features/city/CityFileActions.tsx` has an existing `react-refresh/only-export-components` warning.
- JRC and Hansen forest rasters are not loaded. Forest color is a national percent.
- UCDP is readable in dev and preview only when the Vite forward is present.
- USGS major deposits are nonfuel locations through 2009, not reserves or mine status.

## Next Steps

Stage 2 is in place: `/catalog`, the Catalog nav item, and `src/domain/resource-catalog-view.ts`.

Stage 3, not started: the universal card form, measurements, scarcity, priority, evidence, and source or consumer fields. Then link editing in the interface. Do not seed scientific examples.
