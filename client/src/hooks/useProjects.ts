import { useQuery } from '@tanstack/react-query'
import { getHubs, getProjects } from '@/api/projects'

export function useHubs() {
  return useQuery({
    queryKey: ['hubs'],
    queryFn: getHubs,
    staleTime: 10 * 60 * 1000,
  })
}

export function useProjects(hubId: string | null) {
  return useQuery({
    queryKey: ['projects', hubId],
    queryFn: () => getProjects(hubId!),
    enabled: !!hubId,
    staleTime: 10 * 60 * 1000,
  })
}
