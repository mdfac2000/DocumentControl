import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useProjectStore } from '@/store/projectStore'
import { useIssues } from '@/hooks/useIssues'
import { useIssueTypes } from '@/hooks/useIssueTypes'
import { useProjectUsers } from '@/hooks/useProjectUsers'
import { fetchAllIssues, getIssueTypes, getProjectUsers } from '@/api/issues'
import type { Issue, IssueType, ProjectUser } from '@/types/issue'
import ForceGraph from '@/components/charts/ForceGraph'
import { GitGraph } from 'lucide-react'

export const Route = createFileRoute('/graph')({
  component: GraphPage,
})

function GraphPage() {
  const { selectedProjectIds } = useProjectStore()
  const isMulti = selectedProjectIds.length > 1
  const singleId = selectedProjectIds.length === 1 ? selectedProjectIds[0] : null

  // Single-project queries
  const { data: singleIssues = [], isLoading: loadingSingle } = useIssues(isMulti ? null : singleId)
  const { data: singleTypes = [] } = useIssueTypes(isMulti ? null : singleId)
  const { data: singleUsers = [] } = useProjectUsers(isMulti ? null : singleId)

  // Multi-project query
  const { data: multiData, isLoading: loadingMulti } = useQuery({
    queryKey: ['multi-graph-data', selectedProjectIds],
    queryFn: async (): Promise<{ issues: Issue[]; issueTypes: IssueType[]; users: ProjectUser[] }> => {
      const [issueArrays, typeArrays, userArrays] = await Promise.all([
        Promise.all(selectedProjectIds.map((id) => fetchAllIssues(id))),
        Promise.all(selectedProjectIds.map((id) => getIssueTypes(id).catch(() => [] as IssueType[]))),
        Promise.all(selectedProjectIds.map((id) => getProjectUsers(id).catch(() => [] as ProjectUser[]))),
      ])
      return {
        issues: issueArrays.flat(),
        issueTypes: typeArrays.flat(),
        users: userArrays.flat(),
      }
    },
    enabled: isMulti,
    staleTime: 5 * 60 * 1000,
  })

  const issues = isMulti ? (multiData?.issues ?? []) : singleIssues
  const issueTypes = isMulti ? (multiData?.issueTypes ?? []) : singleTypes
  const users = isMulti ? (multiData?.users ?? []) : singleUsers
  const isLoading = isMulti ? loadingMulti : loadingSingle

  if (selectedProjectIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
        <GitGraph className="size-10 opacity-30" />
        <p className="text-sm">Selecciona un proyecto en el panel lateral para ver el grafo.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grafo de Relaciones</h1>
          <p className="text-muted-foreground text-sm">Cargando datos…</p>
        </div>
        <div className="h-[calc(100vh-12rem)] rounded-xl border bg-muted/30 animate-pulse" />
      </div>
    )
  }

  const assignedIssues = issues.filter((i) => i.assignedTo)
  const uniqueAssignees = new Set(assignedIssues.map((i) => i.assignedTo)).size

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Grafo de Relaciones</h1>
        <p className="text-muted-foreground text-sm">
          {uniqueAssignees} personas vinculadas a {assignedIssues.length} issues.
          Arrastra los nodos para explorar. Usa scroll para hacer zoom.
        </p>
      </div>

      <div className="rounded-xl border bg-background overflow-hidden h-[calc(100vh-12rem)]">
        <ForceGraph issues={issues} users={users} issueTypes={issueTypes} />
      </div>
    </div>
  )
}
