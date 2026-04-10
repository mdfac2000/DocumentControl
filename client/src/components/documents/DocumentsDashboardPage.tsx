import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  getFolderChildFolders,
  getFolderDocumentsSummary,
  getFolderDocumentsTable,
  getFolderStatusDistribution,
} from '@/api/documents'
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
import DocumentsTable from './DocumentsTable'

export interface DocumentsDashboardScopeConfig {
  id: string
  title: string
  chartTitle: string
  tableLabel: string
  icon: LucideIcon
  folderUrl?: string | null
}

interface DocumentsDashboardPageProps {
  pageTitle: string
  pageDescription: string
  queryNamespace: string
  scopes: DocumentsDashboardScopeConfig[]
  tableTitle: string
  statusFieldName?: string
  missingConfigurationMessage?: string
}

function normalizeFolderUrl(folderUrl?: string | null) {
  if (!folderUrl) {
    return undefined
  }

  const normalizedUrl = folderUrl.trim()
  return normalizedUrl.length > 0 ? normalizedUrl : undefined
}

export default function DocumentsDashboardPage({
  pageTitle,
  pageDescription,
  queryNamespace,
  scopes,
  tableTitle,
  statusFieldName = 'Estatus',
  missingConfigurationMessage,
}: DocumentsDashboardPageProps) {
  const normalizedScopes = scopes.map((scope) => ({
    ...scope,
    folderUrl: normalizeFolderUrl(scope.folderUrl),
  }))

  const [selectedTramos, setSelectedTramos] = useState<Record<string, string>>(() =>
    Object.fromEntries(normalizedScopes.map((scope) => [scope.id, 'all'])) as Record<string, string>
  )
  const [selectedTableScope, setSelectedTableScope] = useState<string>('all')

  const availableScopeIds = normalizedScopes
    .filter((scope) => Boolean(scope.folderUrl))
    .map((scope) => scope.id)
  const resolvedTableScope =
    selectedTableScope === 'all' || availableScopeIds.includes(selectedTableScope)
      ? selectedTableScope
      : 'all'

  function handleTramoChange(scopeId: string, value: string | null) {
    setSelectedTramos((current) => ({
      ...current,
      [scopeId]: value ?? 'all',
    }))
  }

  function handleTableScopeChange(value: string | null) {
    if (value === 'all' || (value !== null && availableScopeIds.includes(value))) {
      setSelectedTableScope(value ?? 'all')
      return
    }

    setSelectedTableScope('all')
  }

  const childFolderQueries = useQueries({
    queries: normalizedScopes.map((scope) => ({
      queryKey: ['documents', queryNamespace, 'tramos', scope.id, scope.folderUrl ?? 'unconfigured'],
      queryFn: () => getFolderChildFolders(scope.folderUrl!),
      staleTime: 10 * 60 * 1000,
      enabled: Boolean(scope.folderUrl),
    })),
  })

  const summaryQueries = useQueries({
    queries: normalizedScopes.map((scope) => {
      const selectedTramo = selectedTramos[scope.id] ?? 'all'
      const tramoFilter = selectedTramo === 'all' ? undefined : selectedTramo

      return {
        queryKey: ['documents', queryNamespace, 'summary', scope.id, scope.folderUrl ?? 'unconfigured', tramoFilter],
        queryFn: () => getFolderDocumentsSummary(scope.folderUrl!, tramoFilter),
        staleTime: 5 * 60 * 1000,
        enabled: Boolean(scope.folderUrl),
      }
    }),
  })

  const statusQueries = useQueries({
    queries: normalizedScopes.map((scope) => {
      const selectedTramo = selectedTramos[scope.id] ?? 'all'
      const tramoFilter = selectedTramo === 'all' ? undefined : selectedTramo

      return {
        queryKey: [
          'documents',
          queryNamespace,
          'status',
          scope.id,
          scope.folderUrl ?? 'unconfigured',
          statusFieldName,
          tramoFilter,
        ],
        queryFn: () => getFolderStatusDistribution(scope.folderUrl!, statusFieldName, tramoFilter),
        staleTime: 5 * 60 * 1000,
        enabled: Boolean(scope.folderUrl),
      }
    }),
  })

  const tableQueries = useQueries({
    queries: normalizedScopes.map((scope) => {
      const selectedTramo = selectedTramos[scope.id] ?? 'all'
      const tramoFilter = selectedTramo === 'all' ? undefined : selectedTramo

      return {
        queryKey: ['documents', queryNamespace, 'table', scope.id, scope.folderUrl ?? 'unconfigured', tramoFilter],
        queryFn: () => getFolderDocumentsTable(scope.folderUrl!, tramoFilter),
        staleTime: 5 * 60 * 1000,
        enabled: Boolean(scope.folderUrl),
      }
    }),
  })

  const scopeStates = normalizedScopes.map((scope, index) => {
    const selectedTramo = selectedTramos[scope.id] ?? 'all'

    return {
      scope,
      selectedTramo,
      tramoOptions: childFolderQueries[index].data?.folders ?? [],
      childFolderQuery: childFolderQueries[index],
      summaryQuery: summaryQueries[index],
      statusQuery: statusQueries[index],
      tableQuery: tableQueries[index],
    }
  })

  const missingScopes = scopeStates.filter((scopeState) => !scopeState.scope.folderUrl)
  const combinedError = scopeStates
    .flatMap((scopeState) => [
      scopeState.childFolderQuery.isError ? scopeState.childFolderQuery.error : null,
      scopeState.summaryQuery.isError ? scopeState.summaryQuery.error : null,
      scopeState.statusQuery.isError ? scopeState.statusQuery.error : null,
      scopeState.tableQuery.isError ? scopeState.tableQuery.error : null,
    ])
    .find((error) => error !== null)

  const tableRows =
    resolvedTableScope === 'all'
      ? scopeStates.flatMap((scopeState) => scopeState.tableQuery.data?.rows ?? [])
      : scopeStates.find((scopeState) => scopeState.scope.id === resolvedTableScope)?.tableQuery.data?.rows ?? []

  const isTableLoading =
    resolvedTableScope === 'all'
      ? scopeStates.some((scopeState) => scopeState.scope.folderUrl && scopeState.tableQuery.isLoading)
      : scopeStates.find((scopeState) => scopeState.scope.id === resolvedTableScope)?.tableQuery.isLoading ?? false

  const chartsGridClassName =
    scopeStates.length > 1 ? 'grid gap-4 grid-cols-1 xl:grid-cols-2' : 'grid gap-4 grid-cols-1'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{pageDescription}</p>
      </div>

      {missingScopes.length > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-200">
          {missingConfigurationMessage ??
            `Falta configurar la carpeta de ACC para ${missingScopes
              .map((scopeState) => scopeState.scope.title.toLowerCase())
              .join(' y ')}.`}
        </div>
      ) : null}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {scopeStates.map((scopeState) => (
          <KpiCard
            key={scopeState.scope.id}
            title={scopeState.scope.title}
            value={scopeState.summaryQuery.data?.totalDocuments ?? 0}
            icon={scopeState.scope.icon}
            description={
              scopeState.scope.folderUrl
                ? scopeState.selectedTramo === 'all'
                  ? 'Todos los tramos'
                  : scopeState.selectedTramo
                : 'Carpeta ACC pendiente'
            }
            isLoading={scopeState.scope.folderUrl ? scopeState.summaryQuery.isLoading : false}
          />
        ))}
      </div>

      {combinedError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {combinedError instanceof Error ? combinedError.message : 'No se pudo consultar una de las carpetas de ACC.'}
        </div>
      ) : null}

      <div className={chartsGridClassName}>
        {scopeStates.map((scopeState) => (
          <DocumentStatusPie
            key={scopeState.scope.id}
            title={scopeState.scope.chartTitle}
            data={scopeState.statusQuery.data?.distribution ?? []}
            headerContent={
              <Select
                value={scopeState.selectedTramo}
                onValueChange={(value) => handleTramoChange(scopeState.scope.id, value)}
              >
                <SelectTrigger size="sm" className="w-[380px] max-w-full" disabled={!scopeState.scope.folderUrl}>
                  <SelectValue placeholder="Selecciona un tramo">
                    {!scopeState.scope.folderUrl
                      ? 'Carpeta pendiente'
                      : scopeState.selectedTramo === 'all'
                        ? 'Todos los tramos'
                        : scopeState.selectedTramo}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">Todos los tramos</SelectItem>
                  {scopeState.tramoOptions.map((tramo) => (
                    <SelectItem key={tramo.id} value={tramo.name}>
                      {tramo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <CardTitle className="text-sm font-medium">{tableTitle}</CardTitle>
            <span className="shrink-0 text-xs text-muted-foreground">{tableRows.length} documentos</span>
          </div>
          <Select value={resolvedTableScope} onValueChange={handleTableScopeChange}>
            <SelectTrigger size="sm" className="w-[240px] max-w-full" disabled={availableScopeIds.length === 0}>
              <SelectValue>
                {resolvedTableScope === 'all'
                  ? 'Todos'
                  : scopeStates.find((scopeState) => scopeState.scope.id === resolvedTableScope)?.scope.tableLabel ??
                    'Todos'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">Todos</SelectItem>
              {scopeStates
                .filter((scopeState) => scopeState.scope.folderUrl)
                .map((scopeState) => (
                  <SelectItem key={scopeState.scope.id} value={scopeState.scope.id}>
                    {scopeState.scope.tableLabel}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isTableLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-md bg-muted/40" />
              ))}
            </div>
          ) : (
            <DocumentsTable rows={tableRows} hideCount />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
