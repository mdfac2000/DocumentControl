import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import type { AxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useProjectStore } from '@/store/projectStore'
import { useIssues } from '@/hooks/useIssues'
import { fetchAllIssues, getProjectUsers } from '@/api/issues'
import type { Issue, ProjectUser } from '@/types/issue'
import KpiCard from '@/components/kpi/KpiCard'
import IssuesByStatus from '@/components/charts/IssuesByStatus'
import IssuesOverTime from '@/components/charts/IssuesOverTime'
import IssuesByAssignee from '@/components/charts/IssuesByAssignee'
import { isOverdue } from '@/lib/dateHelpers'
import { getIssueStatusGroup, isClosedIssueStatus } from '@/lib/issueStatus'
import { useProjectUsers } from '@/hooks/useProjectUsers'
import {
  LayoutDashboard,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  Percent,
  UserX,
} from 'lucide-react'


export const Route = createFileRoute('/')({
  component: OverviewPage,
})

function OverviewPage() {
  const { selectedProjectIds } = useProjectStore()
  const isMulti = selectedProjectIds.length > 1
  const singleId = selectedProjectIds.length === 1 ? selectedProjectIds[0] : null

  // Single-project queries
  const { data: singleIssues = [], isLoading: loadingSingle, error: issuesError } = useIssues(isMulti ? null : singleId)
  const { data: singleUsers = [] } = useProjectUsers(isMulti ? null : singleId)

  // Multi-project query
  const { data: multiData, isLoading: loadingMulti } = useQuery({
    queryKey: ['multi-projects-data', selectedProjectIds],
    queryFn: async (): Promise<{ issues: Issue[]; users: ProjectUser[] }> => {
      const [issueArrays, userArrays] = await Promise.all([
        Promise.all(selectedProjectIds.map((id) => fetchAllIssues(id))),
        Promise.all(selectedProjectIds.map((id) => getProjectUsers(id).catch(() => [] as ProjectUser[]))),
      ])
      return {
        issues: issueArrays.flat(),
        users: userArrays.flat(),
      }
    },
    enabled: isMulti,
    staleTime: 5 * 60 * 1000,
  })

  const issues = isMulti ? (multiData?.issues ?? []) : singleIssues
  const users = isMulti ? (multiData?.users ?? []) : singleUsers
  const isLoading = isMulti ? loadingMulti : loadingSingle

  function getErrorDetail(err: unknown): string {
    const ae = err as AxiosError<{ title?: string; detail?: string; developerMessage?: string; message?: string }>
    const body = ae?.response?.data

    if (ae?.response?.status === 404) {
      return 'Este proyecto no expone el API de ACC Issues para esta app o no tiene Issues habilitado.'
    }

    return body?.detail ?? body?.developerMessage ?? body?.title ?? body?.message ?? (err as Error)?.message ?? 'Error desconocido'
  }

  const kpis = useMemo(() => {
    const total = issues.length
    const active = issues.filter((i) => getIssueStatusGroup(i.status) === 'open').length
    const closed = issues.filter((i) => isClosedIssueStatus(i.status)).length
    const unassigned = issues.filter((i) => !i.assignedTo).length
    const overdue = issues.filter(
      (i) => isOverdue(i.dueDate) && !isClosedIssueStatus(i.status)
    ).length
    const closureRate = total > 0 ? (closed / total) * 100 : 0
    return { total, active, closed, unassigned, overdue, closureRate }
  }, [issues])

  const closureRateLabel = useMemo(() => {
    return `${kpis.closureRate.toFixed(1)}%`
  }, [kpis.closureRate])

  const closureRateVariant = useMemo(() => {
    if (kpis.closureRate >= 70) return 'success' as const
    if (kpis.closureRate >= 40) return 'warning' as const
    return 'destructive' as const
  }, [kpis.closureRate])

  if (selectedProjectIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
        <LayoutDashboard className="size-10 opacity-30" />
        <p className="text-sm">Selecciona un proyecto en el panel lateral para comenzar.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analitica</h1>
        <p className="text-muted-foreground text-sm">Vista general de todos los issues del proyecto.</p>
      </div>

      {issuesError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm space-y-2">
          <p className="font-semibold text-destructive">No se pudieron cargar los issues (APS devolvio error)</p>
          <p className="text-muted-foreground font-mono break-all">{getErrorDetail(issuesError)}</p>
          <p className="text-xs text-muted-foreground">
            Posibles causas: (1) La app APS no tiene habilitado el producto <strong>Autodesk Construction Cloud</strong> en el portal de desarrolladores.
            (2) El proyecto no tiene el modulo de Issues activado. (3) El usuario no tiene permisos de Issues en ese proyecto.
            <br />Diagnostico detallado:{' '}
            <a
              href={`/api/acc/projects/${singleId}/debug`}
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              abrir endpoint debug
            </a>
          </p>
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Total Issues" value={kpis.total} icon={LayoutDashboard} isLoading={isLoading} />
        <KpiCard
          title="Activos"
          value={kpis.active}
          icon={CircleDot}
          description="Requieren seguimiento"
          isLoading={isLoading}
          variant="warning"
        />
        <KpiCard
          title="Cerrados"
          value={kpis.closed}
          icon={CheckCircle2}
          description="Finalizados"
          isLoading={isLoading}
          variant="success"
        />
        <KpiCard
          title="Sin asignar"
          value={kpis.unassigned}
          icon={UserX}
          description="Pendientes de responsable"
          isLoading={isLoading}
          variant="default"
        />
        <KpiCard
          title="Vencidos"
          value={kpis.overdue}
          icon={AlertCircle}
          description="Fuera de fecha"
          isLoading={isLoading}
          variant="destructive"
        />
        <KpiCard
          title="Tasa de Cierre"
          value={closureRateLabel}
          icon={Percent}
          description="Del total visible"
          isLoading={isLoading}
          variant={closureRateVariant}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        {!isLoading && issues.length > 0 && (
          <>
            <IssuesByStatus issues={issues} />
            <IssuesOverTime issues={issues} />
          </>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1">
        {!isLoading && issues.length > 0 && (
          <IssuesByAssignee issues={issues} users={users} />
        )}
      </div>

      {isLoading && (
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}
