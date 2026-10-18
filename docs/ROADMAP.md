# Roadmap

## Done in 0.1

- Shell, search, and routes from the planet to a city, an object, and a system.
- Two demo cities. Aurora has an electricity diagram. Meridian has objects and no system.
- One catalog, with the scene, the inspector, and the diagram reading the same ids.
- Session-only tasks.
- Domain tests, typecheck, and a production build.

## Next, when there is a concrete model to add

- A `gltf` representation next to `primitive`, loaded when a city scene opens.
- Real building meshes for one object, still keyed by `CityObject.id`.
- A second resource system, likely water or materials, as data plus the existing diagram.
- Filled-in flow quantities only after a written method exists for demand, supply, and loss.
- Remembering created tasks past a reload, still without accounts.

## Later

- Interior views of one object.
- A server-backed catalog and saved tasks.
- Accounts and shared editing.
- A public site, linked from `appConfig.publicSiteUrl`.

Each of those should extend this app. None of them need a second code base.
