import { useRef, useState } from 'react'
import { useReadyCatalog } from '../../data/useCatalog'
import controls from '../../shared/ui/controls.module.css'

export function downloadCityFile(raw: string, cityId: string): void {
  const blob = new Blob([raw], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${cityId.replaceAll(':', '-')}.future-city.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function ExportCityButton({ cityId }: { cityId: string }) {
  const { exportCity } = useReadyCatalog()
  return (
    <button
      type="button"
      className={controls.ghost}
      onClick={() => {
        const raw = exportCity(cityId)
        if (raw) {
          downloadCityFile(raw, cityId)
        }
      }}
    >
      Export city
    </button>
  )
}

export function ImportCityButton({ onImported }: { onImported: (result: ReturnType<ReturnType<typeof useReadyCatalog>['importCity']>) => void }) {
  const { importCity } = useReadyCatalog()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ raw: string; message: string } | null>(null)

  function finish(raw: string, choice?: 'copy' | 'replace') {
    const result = importCity(raw, choice)
    if (!result.ok && result.needsChoice) {
      setPending({ raw, message: result.message })
      return
    }
    setPending(null)
    onImported(result)
  }

  return (
    <>
      <button type="button" className={controls.ghost} onClick={() => fileRef.current?.click()}>Import city</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) {
            return
          }
          void file.text().then((raw) => finish(raw))
          event.target.value = ''
        }}
      />
      {pending ? (
        <div className={controls.stack}>
          <p className={controls.muted}>{pending.message}</p>
          <div className={controls.row}>
            <button type="button" className={controls.button} onClick={() => finish(pending.raw, 'replace')}>Replace city</button>
            <button type="button" className={controls.ghost} onClick={() => finish(pending.raw, 'copy')}>Import as a copy</button>
            <button type="button" className={controls.ghost} onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </>
  )
}
