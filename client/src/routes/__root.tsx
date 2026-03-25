import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useAuthStore } from '@/store/authStore'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  useEffect(() => {
    if (!isLoading && !isAuthenticated && currentPath !== '/login') {
      navigate({ to: '/login' }).catch(console.error)
    }
    if (!isLoading && isAuthenticated && currentPath === '/login') {
      navigate({ to: '/' }).catch(console.error)
    }
  }, [isLoading, isAuthenticated, currentPath, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated || currentPath === '/login') {
    return <Outlet />
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
