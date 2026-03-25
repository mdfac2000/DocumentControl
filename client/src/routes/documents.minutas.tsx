import { createFileRoute } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'

export const Route = createFileRoute('/documents/minutas')({
  component: MinutasPage,
})

function MinutasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minutas</h1>
        <p className="text-sm text-muted-foreground">
          Aqui podemos centralizar las minutas, acuerdos, responsables y fechas compromiso.
        </p>
      </div>

      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-muted-foreground">
        <ClipboardList className="size-10 opacity-30" />
        <p className="text-sm">Modulo de minutas separado y listo para desarrollarse.</p>
      </div>
    </div>
  )
}
