import api from './axiosInstance'
import type { HubsResponse, ProjectsResponse } from '@/types/project'
import type { UserProfile, AuthStatus } from '@/types/user'

export async function getHubs(): Promise<HubsResponse> {
  const { data } = await api.get<HubsResponse>('/api/acc/hubs')
  return data
}

export async function getProjects(hubId: string): Promise<ProjectsResponse> {
  const { data } = await api.get<ProjectsResponse>(`/api/acc/hubs/${hubId}/projects`)
  return data
}

export async function getUserProfile(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/api/auth/status')
  return data
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const { data } = await api.get<AuthStatus>('/api/auth/status')
  return data
}
