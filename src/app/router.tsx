/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import { AboutPage } from '../features/about/AboutPage'
import { DocumentListPage } from '../features/documents/DocumentListPage'
import { DocumentPage } from '../features/documents/DocumentPage'
import { HomePage } from '../features/home/HomePage'
import { NotFoundPage } from '../features/not-found/NotFoundPage'
import { CitySummary } from '../features/objects/CitySummary'
import { ObjectInspector } from '../features/objects/ObjectInspector'
import { SystemPage } from '../features/systems/SystemPage'
import { TasksPage } from '../features/tasks/TasksPage'
import { LoadingState } from '../shared/ui/Status'
import { AppShell } from './AppShell'

const PlanetPage = lazy(() => import('../features/planet/PlanetPage').then((module) => ({ default: module.PlanetPage })))
const CityLayout = lazy(() => import('../features/city/CityLayout').then((module) => ({ default: module.CityLayout })))

function LazyView({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState label="Loading view…" />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'planet', element: <LazyView><PlanetPage /></LazyView> },
      {
        path: 'cities/:cityId',
        children: [
          {
            element: <LazyView><CityLayout /></LazyView>,
            children: [
              { index: true, element: <CitySummary /> },
              { path: 'objects/:objectId', element: <ObjectInspector /> },
            ],
          },
          { path: 'systems/:systemId', element: <SystemPage /> },
        ],
      },
      { path: 'documents', element: <DocumentListPage /> },
      { path: 'documents/:documentId', element: <DocumentPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
