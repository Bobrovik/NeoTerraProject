/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import type { CityIntent } from '../features/city/city-view'
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
const CityEditorHome = lazy(() => import('../features/city/CityEditorHome').then((module) => ({ default: module.CityEditorHome })))

function LazyView({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState label="Loading view…" />}>{children}</Suspense>
}

function cityRoutes(intent: CityIntent): RouteObject[] {
  return [
    {
      element: <LazyView><CityLayout intent={intent} /></LazyView>,
      children: [
        { index: true, element: <CitySummary /> },
        { path: 'objects/:objectId', element: <ObjectInspector /> },
      ],
    },
    { path: 'systems/:systemId', element: <SystemPage /> },
  ]
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'planet', element: <LazyView><PlanetPage /></LazyView> },
      { path: 'cities/:cityId', children: cityRoutes('view') },
      {
        path: 'editor',
        children: [
          { index: true, element: <LazyView><CityEditorHome /></LazyView> },
          { path: ':cityId', children: cityRoutes('edit') },
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
