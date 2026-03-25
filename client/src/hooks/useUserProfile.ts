import { useQuery } from '@tanstack/react-query'
import { getAuthStatus } from '@/api/projects'

export function useAuthStatus() {
  return useQuery({
    queryKey: ['authStatus'],
    queryFn: getAuthStatus,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
