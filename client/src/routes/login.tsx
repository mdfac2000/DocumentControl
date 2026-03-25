import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/' }).catch(console.error)
    }
  }, [isAuthenticated, navigate])

  function handleLogin() {
    window.location.href = '/api/auth/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">ACC</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Issues Analytics</CardTitle>
          <CardDescription>
            Inicia sesion con tu cuenta de Autodesk para acceder al dashboard de issues de ACC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            onClick={handleLogin}
          >
            Iniciar sesion con Autodesk
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Al iniciar sesion, autorizas el acceso de lectura a tus proyectos de ACC.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
