import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { CatalogProvider } from './data/CatalogProvider'
import { demoCatalogSource } from './data/demo'
import './shared/styles/tokens.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element was not found.')
}

createRoot(root).render(
  <StrictMode>
    <CatalogProvider source={demoCatalogSource}>
      <RouterProvider router={router} />
    </CatalogProvider>
  </StrictMode>,
)
