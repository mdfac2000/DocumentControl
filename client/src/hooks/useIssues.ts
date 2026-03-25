import { useQuery } from '@tanstack/react-query'
import { fetchAllIssues } from '@/api/issues'

export function useIssues(projectId: string | null) {
  return useQuery({
    queryKey: ['issues', projectId],
    queryFn: () => fetchAllIssues(projectId!),
    enabled: !!projectId && projectId !== 'all',
    staleTime: 5 * 60 * 1000,
  })
}
