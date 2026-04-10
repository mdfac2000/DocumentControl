import { createFileRoute } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'

export const Route = createFileRoute('/documents/minutas')({
  component: MinutasPage,
})

function MinutasPage() {
  const [selectedEntradaTramo, setSelectedEntradaTramo] = useState<string>('all')
  const [selectedSalidaTramo, setSelectedSalidaTramo] = useState<string>('all')
  const [selectedTableScope, setSelectedTableScope] = useState<'all' | 'entrada' | 'salida'>('all')

  function handleEntradaTramoChange(value: string | null) {
    setSelectedEntradaTramo(value ?? 'all')
  }

  function handleSalidaTramoChange(value: string | null) {
    setSelectedSalidaTramo(value ?? 'all')
  }

  function handleTableScopeChange(value: string | null) {
    if (value === 'entrada' || value === 'salida') {
      setSelectedTableScope(value)
      return
    }

    setSelectedTableScope('all')
  }

  const { data: entradaTramosData } = useQuery({
    queryKey: ['documents', 'minutas', 'tramos', 'entrada', MINUTAS_FOLDER_URL],
    queryFn: () => getFolderChildFolders(MINUTAS_FOLDER_URL),
    staleTime: 10 * 60 * 1000,
  })

  const { data: salidaTramosData } = useQuery({
    queryKey: ['documents', 'minutas', 'tramos', 'salida', MINUTAS_SALIDA_FOLDER_URL],
    queryFn: () => getFolderChildFolders(MINUTAS_SALIDA_FOLDER_URL),
    staleTime: 10 * 60 * 1000,
  })

  const entradaTramoOptions = entradaTramosData?.folders ?? []
  const salidaTramoOptions = salidaTramosData?.folders ?? []
  const entradaTramoFilter = selectedEntradaTramo === 'all' ? undefined : selectedEntradaTramo
  const salidaTramoFilter = selectedSalidaTramo === 'all' ? undefined : selectedSalidaTramo

  const {
    data: entradaData,
    isLoading: isEntradaLoading,
    isError: isEntradaError,
    error: entradaError,
  } = useQuery({
    queryKey: ['documents', 'minutas', MINUTAS_FOLDER_URL, entradaTramoFilter],
    queryFn: () => getFolderDocumentsSummary(MINUTAS_FOLDER_URL, entradaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: salidaData,
    isLoading: isSalidaLoading,
    isError: isSalidaError,
    error: salidaError,
  } = useQuery({
    queryKey: ['documents', 'minutas', 'salida', MINUTAS_SALIDA_FOLDER_URL, salidaTramoFilter],
    queryFn: () => getFolderDocumentsSummary(MINUTAS_SALIDA_FOLDER_URL, salidaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: entradaStatusData,
    isError: isEntradaStatusError,
    error: entradaStatusError,
  } = useQuery({
    queryKey: ['documents', 'minutas', 'entrada-status', MINUTAS_FOLDER_URL, STATUS_FIELD_NAME, entradaTramoFilter],
    queryFn: () => getFolderStatusDistribution(MINUTAS_FOLDER_URL, STATUS_FIELD_NAME, entradaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: salidaStatusData,
    isError: isSalidaStatusError,
    error: salidaStatusError,
  } = useQuery({
    queryKey: ['documents', 'minutas', 'salida-status', MINUTAS_SALIDA_FOLDER_URL, STATUS_FIELD_NAME, salidaTramoFilter],
    queryFn: () => getFolderStatusDistribution(MINUTAS_SALIDA_FOLDER_URL, STATUS_FIELD_NAME, salidaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })

  const { data: entradaTableData, isLoading: isEntradaTableLoading } = useQuery({
    queryKey: ['documents', 'minutas', 'entrada-table', MINUTAS_FOLDER_URL, entradaTramoFilter],
    queryFn: () => getFolderDocumentsTable(MINUTAS_FOLDER_URL, entradaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })

  const { data: salidaTableData, isLoading: isSalidaTableLoading } = useQuery({
    queryKey: ['documents', 'minutas', 'salida-table', MINUTAS_SALIDA_FOLDER_URL, salidaTramoFilter],
    queryFn: () => getFolderDocumentsTable(MINUTAS_SALIDA_FOLDER_URL, salidaTramoFilter),
    staleTime: 5 * 60 * 1000,
  })

  const hasError = isEntradaError || isSalidaError || isEntradaStatusError || isSalidaStatusError
  const combinedError = entradaError ?? salidaError ?? entradaStatusError ?? salidaStatusError
  const tableRows = (() => {
    if (selectedTableScope === 'entrada') {
      return entradaTableData?.rows ?? []
    }

    if (selectedTableScope === 'salida') {
      return salidaTableData?.rows ?? []
    }

    return [
      ...(entradaTableData?.rows ?? []),
      ...(salidaTableData?.rows ?? []),
    ]
  })()

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
