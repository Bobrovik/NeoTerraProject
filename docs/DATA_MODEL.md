# Data model

Identifiers are stable strings. Relationships use those ids. The demo prefixes them, for example `city:aurora` and `object:aurora:solar-field`. The prefix is a convention, not something the router parses.

## Entities

| Entity | Required links |
| --- | --- |
| `City` | `latitude`, `longitude`, `developmentStatus`, `reliability` |
| `ObjectCategory` | name and color |
| `CityObject` | `cityId`, `categoryId`, placement, primitive representation, `systemIds`, `documentIds`, `reliability` |
| `ResourceType` | name, unit, color, `flowKind` (`energy`, `water`, `materials`, `goods`, `waste`, `information`). Independent of any one system. |
| `CitySystem` | `cityId`, `kind` (any non-empty string), `memberObjectIds`, `documentIds` |
| `ResourceFlow` | `systemId`, `resourceTypeId`, `sourceObjectId`, `targetObjectId`, `reliability` |
| `CatalogDocument` | `kind`, `reliability`, `links` to cities, objects, or systems |
| `ProjectTask` | status, priority, timestamps. City, object, and system are optional. |

`CatalogSnapshot` is the whole set. `CatalogSource` is the only loading seam.

## Flows are not electricity-specific

A flow names a resource type. A system names a `kind`. The demo system uses `kind: "energy"` and `resource:electricity`. The catalog also defines potable water, materials, goods, and solid waste, and no flows use them yet. Quantity, unit, interval, capacity, loss, and basis are optional fields on `ResourceFlow`. The demo leaves them empty, and no screen calculates them.

`CityObject.facilityType` is optional. The demo distribution hub uses `distribution-center`. Placing that building does not create a resource link.

`Road` is a physical route: an id, a `cityId`, and points that are either control coordinates or an object id. A road is not a pipeline, a power line, or a data channel. `ResourceFlow` remains the resource or information link. Deleting an object removes flows that used it and drops road points that named it.

Edits are not written into the demo file. They are a per-city draft in `localStorage` (`future-city.layouts.v1`), and the same JSON can be downloaded or loaded. Version 2 of that file also stores cities created on the planet page. A version 1 file, which has drafts only, still loads. A draft is rejected if an object, link, or road point does not resolve, if a city id is already used, or if an object id belongs to another city. A created city starts with an empty object, road, system, and link list.

## Placement

Globe coordinates are latitude and longitude in degrees. `latLonToVector3` maps them onto a sphere with Y up.

City coordinates are meters in a local space, also Y up. `placement.position` is the center of the mesh. A box uses `size` as width, height, and depth. A cylinder uses `size.x` as the diameter and `size.y` as the height. City space is not projected onto the globe. The two views meet only through `cityId`.

## Certainty

`Reliability.status` is one of:

- `verified` — checked by this project. Unused in the demo.
- `engineering-fact` — established engineering or science, with a source.
- `fresco-principle` — an idea from Jacque Fresco or The Venus Project, used as a prompt.
- `hypothesis` — a project proposal.
- `demo` — placeholder content.

`source`, `note`, and `updatedAt` are optional. Documents of kind `question` are how an open research question is stored. They link to the records they concern.

## Integrity

`collectIntegrityIssues` checks unique ids and that every reference resolves, including flow endpoints that must be members of their system. `demoCatalogSource` refuses to load a snapshot that fails. `npm test` covers the demo snapshot and a broken flow.
