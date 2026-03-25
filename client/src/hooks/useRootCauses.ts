import { useQuery } from '@tanstack/react-query'
import { getRootCauseCategories } from '@/api/issues'

export function useRootCauses(projectId: string | null) {
  return useQuery({
    queryKey: ['rootCauses', projectId],
    queryFn: () => getRootCauseCategories(projectId!),
    enabled: !!projectId && projectId !== 'all',
    staleTime: 10 * 60 * 1000,
  })
}
