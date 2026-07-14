import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  basepath: '/trainer',
  // Route data only changes through mutations in this app, and mutations call
  // router.invalidate() explicitly - time-based staleness would just cause
  // redundant DB round-trips on navigation with no freshness benefit.
  defaultStaleTime: Infinity,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
