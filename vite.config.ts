import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Connect, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const require = createRequire(import.meta.url)
const mapLibreWorkerPath = require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs')
const mapLibreWorkerFile = 'maplibre-gl-worker.cjs'

function mapLibreWorkerSource(): string {
  return readFileSync(mapLibreWorkerPath, 'utf8').replace(/;export\{[^}]+\};/, ';')
}

function serveMapLibreWorker(middlewares: Connect.Server) {
  middlewares.use((request, response, next) => {
    const path = request.url?.split('?')[0]
    if (path !== `/${mapLibreWorkerFile}`) {
      next()
      return
    }
    response.setHeader('Content-Type', 'text/javascript')
    response.end(mapLibreWorkerSource())
  })
}

function mapLibreWorker(): Plugin {
  return {
    name: 'maplibre-worker',
    configureServer(server) {
      serveMapLibreWorker(server.middlewares)
    },
    configurePreviewServer(server) {
      serveMapLibreWorker(server.middlewares)
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: mapLibreWorkerFile,
        source: mapLibreWorkerSource(),
      })
    },
  }
}

const ucdpProxy = {
  '/ucdp-feed': {
    target: 'https://ucdp.uu.se',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ucdp-feed/, ''),
  },
}

export default defineConfig({
  plugins: [react(), mapLibreWorker()],
  server: { proxy: ucdpProxy },
  preview: { proxy: ucdpProxy },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
