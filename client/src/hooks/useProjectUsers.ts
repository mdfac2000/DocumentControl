import { useQuery } from '@tanstack/react-query'
import { getProjectUsers } from '@/api/issues'

export function useProjectUsers(projectId: string | null) {
  return useQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: () => getProjectUsers(projectId!),
    enabled: !!projectId && projectId !== 'all',
    staleTime: 10 * 60 * 1000,
  })
}
