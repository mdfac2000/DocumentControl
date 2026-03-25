import api from './axiosInstance'
import type { Issue, IssuePage, IssueType, RootCauseCategory, ProjectUser } from '@/types/issue'

interface RawProjectUser {
  id?: string
  userId?: string
  autodeskId?: string
  name?: string
  displayName?: string
  fullName?: string
  userName?: string
  firstName?: string
  lastName?: string
  email?: string
  emailId?: string
  avatarUrl?: string
  profileImageUrl?: string
  profileImages?: {
    sizeX40?: string
    sizeX50?: string
    sizeX58?: string
    sizeX80?: string
  }
}

interface ProjectUsersPage {
  results?: RawProjectUser[]
  pagination?: {
    limit: number
    offset: number
    totalResults: number
  }
}

function normalizeProjectUser(user: RawProjectUser): ProjectUser | null {
  const firstName = user.firstName?.trim() ?? ''
  const lastName = user.lastName?.trim() ?? ''
  const combinedName = `${firstName} ${lastName}`.trim()

  const autodeskId = user.autodeskId ?? user.userId ?? user.id
  const id = user.id ?? autodeskId
  const name =
    user.name?.trim() ||
    user.displayName?.trim() ||
    user.fullName?.trim() ||
    user.userName?.trim() ||
    combinedName ||
    ''

  if (!id) {
    return null
  }

  return {
    id,
    autodeskId,
    userId: user.userId ?? autodeskId,
    name: name || user.email || user.emailId || autodeskId || id,
    email: user.email ?? user.emailId,
    avatarUrl:
      user.avatarUrl ??
      user.profileImageUrl ??
      user.profileImages?.sizeX80 ??
      user.profileImages?.sizeX58 ??
      user.profileImages?.sizeX50 ??
      user.profileImages?.sizeX40,
  }
}

export async function getIssuesPage(
  projectId: string,
  offset: number,
  limit = 200
): Promise<IssuePage> {
  const { data } = await api.get<IssuePage>(
    `/api/acc/projects/${projectId}/issues`,
    { params: { limit, offset } }
  )
  return data
}

export async function fetchAllIssues(projectId: string): Promise<Issue[]> {
  const first = await getIssuesPage(projectId, 0)
  const total = first.pagination.totalResults
  const pages: Issue[][] = [first.results]

  const offsets: number[] = []
  for (let offset = 200; offset < total; offset += 200) {
    offsets.push(offset)
  }

  const rest = await Promise.all(
    offsets.map((offset) => getIssuesPage(projectId, offset))
  )
  rest.forEach((page) => pages.push(page.results))

  return pages.flat()
}

export async function getIssueTypes(projectId: string): Promise<IssueType[]> {
  const { data } = await api.get<{ results: IssueType[] }>(
    `/api/acc/projects/${projectId}/issue-types`
  )
  return data.results
}

export async function getRootCauseCategories(projectId: string): Promise<RootCauseCategory[]> {
  const { data } = await api.get<{ results: RootCauseCategory[] }>(
    `/api/acc/projects/${projectId}/root-cause-categories`
  )
  return data.results
}

export async function getProjectUsers(projectId: string): Promise<ProjectUser[]> {
  const { data: firstPage } = await api.get<ProjectUsersPage>(
    `/api/acc/projects/${projectId}/users`,
    { params: { limit: 200, offset: 0 } }
  )

  const pages: RawProjectUser[][] = [firstPage.results ?? []]
  const totalResults = firstPage.pagination?.totalResults ?? pages[0].length
  const pageSize = firstPage.pagination?.limit ?? 200

  const offsets: number[] = []
  for (let offset = pageSize; offset < totalResults; offset += pageSize) {
    offsets.push(offset)
  }

  const rest = await Promise.all(
    offsets.map(async (offset) => {
      const { data } = await api.get<ProjectUsersPage>(
        `/api/acc/projects/${projectId}/users`,
        { params: { limit: pageSize, offset } }
      )
      return data.results ?? []
    })
  )

  rest.forEach((page) => pages.push(page))

  return pages.flat()
    .map(normalizeProjectUser)
    .filter((user): user is ProjectUser => user !== null)
}
