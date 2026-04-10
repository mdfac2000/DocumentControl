import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { getFolderChildFolders, getFolderDocumentsSummary, getFolderDocumentsTable, getFolderStatusDistribution } from '@/api/documents'
import DocumentsTable from '@/components/documents/DocumentsTable'
import DocumentStatusPie from '@/components/charts/DocumentStatusPie'
import KpiCard from '@/components/kpi/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MINUTAS_FOLDER_URL =
  'https://acc.autodesk.com/docs/files/projects/1fe1347a-35a4-4d0a-b39b-467914a005b1?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.kzTFRvAsTrWuNxVU6ge3Nw&viewModel=detail&moduleId=folders'
const MINUTAS_SALIDA_FOLDER_URL =
  'https://acc.autodesk.com/docs/files/projects/1fe1347a-35a4-4d0a-b39b-467914a005b1?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.mno345pqr678STU901vwx234&viewModel=detail&moduleId=folders'
const STATUS_FIELD_NAME = 'Estatus'

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
          Resumen de documentos detectados en la carpeta de ACC configurada para minutas.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard
          title="Minutas de entrada"
          value={entradaData?.totalDocuments ?? 0}
          icon={ArrowDownToLine}
          description={selectedEntradaTramo === 'all' ? 'Todos los tramos' : selectedEntradaTramo}
          isLoading={isEntradaLoading}
        />
        <KpiCard
          title="Minutas de salida"
          value={salidaData?.totalDocuments ?? 0}
          icon={ArrowUpFromLine}
          description={selectedSalidaTramo === 'all' ? 'Todos los tramos' : selectedSalidaTramo}
          isLoading={isSalidaLoading}
        />
      </div>

      {hasError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {combinedError instanceof Error ? combinedError.message : 'No se pudo consultar una de las carpetas de ACC.'}
        </div>
      ) : null}

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <DocumentStatusPie
          title="Minutas de entrada por Estatus"
          data={entradaStatusData?.distribution ?? []}
          headerContent={
            <Select value={selectedEntradaTramo} onValueChange={handleEntradaTramoChange}>
              <SelectTrigger size="sm" className="w-[380px] max-w-full">
                <SelectValue placeholder="Selecciona un tramo">
                  {selectedEntradaTramo === 'all' ? 'Todos los tramos' : selectedEntradaTramo}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">Todos los tramos</SelectItem>
                {entradaTramoOptions.map((tramo) => (
                  <SelectItem key={tramo.id} value={tramo.name}>
                    {tramo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <DocumentStatusPie
          title="Minutas de salida por Estatus"
          data={salidaStatusData?.distribution ?? []}
          headerContent={
            <Select value={selectedSalidaTramo} onValueChange={handleSalidaTramoChange}>
              <SelectTrigger size="sm" className="w-[380px] max-w-full">
                <SelectValue placeholder="Selecciona un tramo">
                  {selectedSalidaTramo === 'all' ? 'Todos los tramos' : selectedSalidaTramo}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">Todos los tramos</SelectItem>
                {salidaTramoOptions.map((tramo) => (
                  <SelectItem key={tramo.id} value={tramo.name}>
                    {tramo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <CardTitle className="text-sm font-medium">Detalle de Minutas</CardTitle>
            <span className="shrink-0 text-xs text-muted-foreground">{tableRows.length} documentos</span>
          </div>
          <Select value={selectedTableScope} onValueChange={handleTableScopeChange}>
            <SelectTrigger size="sm" className="w-[240px] max-w-full">
              <SelectValue>
                {selectedTableScope === 'all'
                  ? 'Todos'
                  : selectedTableScope === 'entrada'
                    ? 'Minutas de entrada'
                    : 'Minutas de salida'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="entrada">Minutas de entrada</SelectItem>
              <SelectItem value="salida">Minutas de salida</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {(() => {
            const isTableLoading =
              selectedTableScope === 'all'
                ? isEntradaTableLoading || isSalidaTableLoading
                : selectedTableScope === 'entrada'
                  ? isEntradaTableLoading
                  : isSalidaTableLoading

            if (isTableLoading) {
              return (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-10 animate-pulse rounded-md bg-muted/40" />
                  ))}
                </div>
              )
            }

            return <DocumentsTable rows={tableRows} hideCount />
          })()}
        </CardContent>
      </Card>
    </div>
  )
}
