# Decisions

## 2026-10-18 — Versions that actually install together

The current stable lines were checked against each other's peer ranges and against Node.

| Package | Version | Why this one |
| --- | --- | --- |
| React / React DOM | 19.3.1 | Current stable. |
| `@react-three/fiber` | 9.8.2 | Stable line for React 19. Fiber 9.5–9.7 reject React 19.3. Fiber 10 is alpha. |
| `three` | 0.186.1 | Accepted by Fiber 9 (`three >= 0.156`). |
| `@react-three/drei` | 10.7.9 | Orbit controls now, and the usual place to load glTF later. Peer is Fiber 9. |
| Vite | 8.3.4 | Current stable. Needs Node 20.19+; this project declares Node 22.22+ because React Router 8 does. |
| React Router | 8.4.0 | Current stable. Requires React 19.2.7+. |
| TypeScript | 5.9.3 | Current 5.9. TypeScript 6 and 7 are outside the range of `typescript-eslint` 8.71 (`< 6.1`). |
| Vitest | 5.0.5 | Works with Vite 6.4, 7, and 8. Needs Node 22.12+. |
| ESLint | 10.13.0 | Current stable that runs on Node 22. |

`@react-three/drei` is the one extra library. It avoids a private camera-controls wrapper that the glTF work would replace.

## 2026-10-18 — No Zustand yet

The URL holds the city, the object, the system, the view mode, and the category filter. The catalog context holds the loaded snapshot and tasks created during the session. A store can be added if that context starts re-rendering large scenes.

## 2026-10-18 — Resource systems stay generic

`CitySystem.kind` is a string. `ResourceFlow` points at a `ResourceType`. The electricity diagram is data: one system, one resource type, four flows. The graph layout classifies sources and consumers from those flows. It does not contain an energy formula.

Optional numeric fields exist on the flow type so a later method has a place to put a quantity. They are empty, and the interface does not invent totals.

## 2026-10-18 — English copy, no i18n framework

Interface strings are English. Shared status labels are in `src/shared/labels.ts`. That is the seam for a later translation. Catalog prose is data, not compiled UI text.

## 2026-10-18 — One canvas per route

Selection changes the nested object route and the highlight. It does not remount the city canvas. The system diagram is SVG, so it can be tested and drawn without WebGL.

## 2026-10-18 — Map base is a separate view

The city editor stays in local meters. A Map mode loads MapLibre GL and the OpenFreeMap Liberty style (`https://tiles.openfreemap.org/styles/liberty`). That public style needs no API key. `VITE_MAP_STYLE_URL` can replace it. The MapLibre worker is served by this app as `maplibre-gl-worker.cjs` so Vite does not wrap it. Clicks become east/north meters through `geodeticToLocal`, then the existing `placeObject` path. The screen scale is Web Mercator and is only a label. The official OpenStreetMap tile server is not used. If the style fails to load, the other city modes still open.

## 2026-10-18 — Layout edits sit on top of the catalog

Overview, layout, and systems are view modes of the same city scene. Layout changes positions, rotations, roads, and links through pure functions in `src/domain/layout.ts`, then stores a city draft in the browser. The scene only draws the draft. A link stores a source, a recipient, and a resource type. It does not calculate distribution. Roads stay a separate list from `ResourceFlow`.

## 2026-10-18 — Primitives first

`ObjectRepresentation` is a box or a cylinder. A glTF variant is not in the type until a loader exists, so the app cannot pretend a model file is shown. The task `task:gltf-slot` records that follow-up.
