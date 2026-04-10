import { getFolderChildFolders, getFolderDocumentsSummary, getFolderDocumentsTable } from '@/api/documents'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'
import { useState } from 'react'

// URL de las minutas por tramo
const MINUTAS_FOLDER_URL = 'https://acc.autodesk.com/docs/files/projects/1fe1347a-35a4-4d0a-b39b-467914a005b1?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.kzTFRvAsTrWuNxVU6ge3Nw&viewModel=detail&moduleId=folders';

// URL de las minutas generales
const MINUTAS_SALIDA_FOLDER_URL = 'https://acc.autodesk.com/docs/files/projects/1fe1347a-35a4-4d0a-b39b-467914a005b1?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.GeFZb1M4QEGlKxWuQFb3vA&viewModel=detail&moduleId=folders';

export const Route = createFileRoute('/documents/minutas')({
  component: MinutasPage,
})

function MinutasPage() {
  const [selectedEntradaTramo] = useState<string>('all')
  const [selectedSalidaTramo] = useState<string>('all')
  const [] = useState<'all' | 'entrada' | 'salida'>('all')




  useQuery({
    queryKey: ['documents', 'minutas', 'tramos', 'entrada', MINUTAS_FOLDER_URL],
    queryFn: () => getFolderChildFolders(MINUTAS_FOLDER_URL),
    staleTime: 10 * 60 * 1000,
  })

  useQuery({
    queryKey: ['documents', 'minutas', 'tramos', 'salida', MINUTAS_SALIDA_FOLDER_URL],
    queryFn: () => getFolderChildFolders(MINUTAS_SALIDA_FOLDER_URL),
    staleTime: 10 * 60 * 1000,
  })

  const entradaTramoFilter = selectedEntradaTramo === 'all' ? undefined : selectedEntradaTramo
  const salidaTramoFilter = selectedSalidaTramo === 'all' ? undefined : selectedSalidaTramo

  useQuery({
    queryKey: ['documents', 'minutas', MINUTAS_FOLDER_URL, entradaTramoFilter],
    queryFn: () => getFolderDocumentsSummary(MINUTAS_FOLDER_URL, entradaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })

  useQuery({
    queryKey: ['documents', 'minutas', 'salida', MINUTAS_SALIDA_FOLDER_URL, salidaTramoFilter],
    queryFn: () => getFolderDocumentsSummary(MINUTAS_SALIDA_FOLDER_URL, salidaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })



  useQuery({
    queryKey: ['documents', 'minutas', 'entrada-table', MINUTAS_FOLDER_URL, entradaTramoFilter],
    queryFn: () => getFolderDocumentsTable(MINUTAS_FOLDER_URL, entradaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })

  useQuery({
    queryKey: ['documents', 'minutas', 'salida-table', MINUTAS_SALIDA_FOLDER_URL, salidaTramoFilter],
    queryFn: () => getFolderDocumentsTable(MINUTAS_SALIDA_FOLDER_URL, salidaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })


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
