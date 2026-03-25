import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useProjectStore } from '@/store/projectStore'
import { useIssues } from '@/hooks/useIssues'
import { useIssueTypes } from '@/hooks/useIssueTypes'
import { useProjectUsers } from '@/hooks/useProjectUsers'
import { fetchAllIssues, getIssueTypes, getProjectUsers } from '@/api/issues'
import type { Issue, IssueType, ProjectUser } from '@/types/issue'
import IssuesTable from '@/components/issues/IssuesTable'
import { ListChecks } from 'lucide-react'

export const Route = createFileRoute('/issues')({
  component: IssuesPage,
})

function IssuesPage() {
  const { selectedProjectIds } = useProjectStore()
  const isMulti = selectedProjectIds.length > 1
  const singleId = selectedProjectIds.length === 1 ? selectedProjectIds[0] : null

  // Single-project queries
  const { data: singleIssues = [], isLoading: loadingSingle } = useIssues(isMulti ? null : singleId)
  const { data: singleTypes = [] } = useIssueTypes(isMulti ? null : singleId)
  const { data: singleUsers = [] } = useProjectUsers(isMulti ? null : singleId)

  // Multi-project query
  const { data: multiData, isLoading: loadingMulti } = useQuery({
    queryKey: ['multi-issues', selectedProjectIds],
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
        <ListChecks className="size-10 opacity-30" />
        <p className="text-sm">Selecciona un proyecto en el panel lateral para ver sus issues.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Issues</h1>
        <p className="text-muted-foreground text-sm">
          {isMulti
            ? `Issues de ${selectedProjectIds.length} proyectos seleccionados.`
            : 'Lista completa de issues con filtros y exportación.'}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <IssuesTable issues={issues} issueTypes={issueTypes} users={users} />
      )}
    </div>
  )
}
