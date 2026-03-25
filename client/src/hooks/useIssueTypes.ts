import { useQuery } from '@tanstack/react-query'
import { getIssueTypes } from '@/api/issues'

export function useIssueTypes(projectId: string | null) {
  return useQuery({
    queryKey: ['issueTypes', projectId],
    queryFn: () => getIssueTypes(projectId!),
    enabled: !!projectId && projectId !== 'all',
    staleTime: 10 * 60 * 1000,
  })
}
