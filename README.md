# Future City

A local research application for exploring a city model from a planet view down to a building and a resource diagram. The working name lives in `src/app/config.ts`.

The first version uses simple 3D shapes and a demonstration electricity diagram. It is not a simulation, and the demo cities are not construction proposals.

## Requirements

- Node.js 22.22 or newer
- npm

The machine used to create this project had Node 18.16 as the default `node` on `PATH`. Vite 8, React Router 8, and Vitest 5 do not support that runtime, so commands were run with Node 22.23.3. Use a current Node 22 when you install and start the app.

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run lint
npm run build
```

`npm run dev` serves the app at `http://localhost:5173`.

## Where things live

- `src/domain` — types and pure functions. No React and no Three.js.
- `src/data` — catalog loading and the demo records.
- `src/features` — pages and interaction.
- `src/3d` — globe, city meshes, and flow lines.
- `src/app` — shell, routes, and the product name.

## Add a city

On the planet page, enter a name, a city id such as `city:harbor`, and a WGS84 latitude and longitude. The city is stored in this browser, appears on the globe, and opens in the existing editor with an empty grid. Aurora and Meridian stay in the demo catalog. Remove city deletes only a city created this way.

The same browser file can be downloaded and loaded from a city's Layout toolbar. Practical steps in Russian are in `docs/ru/города.md`.

To add a city to the demo catalog instead, edit `src/data/demo/records.ts` and run `npm test`. The integrity test fails if an id does not resolve.

## Add an object

Add a `CityObject` whose `cityId` points at an existing city. Set `placement` in city meters (Y up, position is the center of the mesh) and `representation` to a box or a cylinder. For a cylinder, `size.x` is the diameter and `size.y` is the height.

## Edit a city

Open a city and switch to Layout or Systems. Layout places buildings on a 4 m grid, moves and rotates them, and draws roads by clicking points or objects. Systems creates or deletes resource links. Those links are records only. The app does not calculate how much of a resource is delivered. Download JSON saves the same draft that is kept in this browser. Reset city drops that draft and shows the demo again.

## Add a resource system

1. Add a `ResourceType` if the resource is not already listed. Water, materials, goods, and solid waste are named already and have no flows.
2. Add a `CitySystem` with a `kind` string such as `water` or `energy`, a `cityId`, and `memberObjectIds`.
3. Add `ResourceFlow` records that point at that system, a resource type, and two member objects.
4. Put the system id on each member object's `systemIds`.

The city page and the system diagram use those records. They do not branch on the energy system.

## Certainty

Demo content is marked `demo`, `hypothesis`, or `fresco-principle`. Do not mark a placeholder as `verified`. The labels are explained in the document "How to read certainty status".
