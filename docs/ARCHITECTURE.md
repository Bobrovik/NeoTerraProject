# Architecture

Future City is one React application with four layers.

## Domain

`src/domain` holds the catalog types and the functions that do not need a browser: globe coordinates, search, flow segments, the system diagram layout, task drafts, and referential integrity. Tests import this layer directly.

## Data

`CatalogSource.load()` returns a `CatalogSnapshot`. The only source today is `demoCatalogSource`, which checks integrity and then returns the records in `src/data/demo/records.ts`.

`CatalogProvider` loads that snapshot once at startup. Pages read it from context. Tasks created in the Tasks page are kept in component state for the browser session and are not written back into the demo file.

Structured catalog data is loaded at startup. That is a small in-memory snapshot. Future 3D files are not part of this load.

## Features

`src/features` contains the pages: home, planet, city, object inspector, system diagram, documents, tasks, and about. A feature asks the domain for records and renders them. It does not own a second copy of a building or a flow.

## 3D

`src/3d` turns records into a globe, meshes, and lines. `resolveFlowSegments` decides which lines exist. The mesh component only draws them. The system page is an SVG diagram from `buildSystemGraph`, so the same flows can be shown without a WebGL scene.

The planet page and the city scene are loaded when those routes open, so the home page does not download Three.js. The planet route and the city route each mount one canvas. The object inspector is a nested route beside the city canvas, so choosing another object does not recreate the WebGL context. Opening a system leaves the city route and unmounts that canvas.

## Navigation

| Path | View |
| --- | --- |
| `/` | Home |
| `/planet` | Globe |
| `/cities/:cityId` | City scene and summary |
| `/cities/:cityId/objects/:objectId` | Same scene, inspector open |
| `/cities/:cityId/systems/:systemId` | Resource diagram |
| `/documents` and `/documents/:documentId` | Notes |
| `/tasks` | Task board |
| `/about` | About |

`?view=schematic|flows` and `?category=` belong to the city scene. Search uses `searchCatalog` and then navigates.

## Interface language

Visible interface copy is English, in components and in `src/shared/labels.ts`. There is no localization library. A later translation can replace that label module and the component strings without changing the domain types. Catalog text is data, so another language can be another snapshot later.

## What is intentionally absent

No server, database, authentication, or resource-balance calculation. Zustand is not installed. Selection and view mode live in the URL. The catalog context holds the snapshot and session tasks.
