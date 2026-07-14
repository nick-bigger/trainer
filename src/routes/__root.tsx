import { BottomNav } from '@/components/bottom-nav'
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      {/* Pages pad their own bottom edge with --bottom-nav-clearance so the fixed
          nav (including the iPhone home-indicator inset) never covers content. */}
      <div className="flex-1">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
