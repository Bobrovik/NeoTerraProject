import type { InfrastructureLayersState, LinkLayerEntry } from './layers'
import styles from './CityLayout.module.css'

export function InfrastructureLayers({
  layers,
  entries,
  onToggle,
}: {
  layers: InfrastructureLayersState
  entries: LinkLayerEntry[]
  onToggle: (key: keyof InfrastructureLayersState) => void
}) {
  return (
    <fieldset className={styles.layers}>
      <legend className={styles.layersTitle}>Infrastructure layers</legend>
      <label className={styles.layerRow}>
        <input type="checkbox" checked={layers.buildings} onChange={() => onToggle('buildings')} />
        Buildings
      </label>
      <label className={styles.layerRow}>
        <input type="checkbox" checked={layers.roads} onChange={() => onToggle('roads')} />
        Roads
      </label>
      {entries.map((entry) => (
        <label key={entry.kind} className={styles.layerRow}>
          <input type="checkbox" checked={layers[entry.kind]} onChange={() => onToggle(entry.kind)} />
          <i className={styles.swatch} style={{ background: entry.color }} />
          <span>{entry.label}</span>
          {entry.empty ? <span className={styles.layerEmpty}>empty</span> : null}
        </label>
      ))}
    </fieldset>
  )
}
