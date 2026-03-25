import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getAuthStatus } from '@/api/projects'

interface AuthInitializerProps {
  children: React.ReactNode
}

export default function AuthInitializer({ children }: AuthInitializerProps) {
  const { setUser, setAuthenticated, setLoading } = useAuthStore()

  useEffect(() => {
    getAuthStatus()
      .then((status) => {
        if (status.authenticated && status.user) {
          setUser(status.user)
        } else {
          setAuthenticated(false)
        }
      })
      .catch(() => {
        setAuthenticated(false)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [setUser, setAuthenticated, setLoading])

  return <>{children}</>
}
