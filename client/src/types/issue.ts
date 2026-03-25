export type IssueStatus = string

export type AssignedToType = 'user' | 'company' | 'role'

export interface Issue {
  id: string
  displayId: number
  title: string
  status: IssueStatus
  assignedTo: string | null
  assignedToType: AssignedToType | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  issueTypeId: string | null
  issueSubtypeId: string | null
  rootCauseId: string | null
  locationDescription: string | null
  customAttributes: Record<string, unknown> | null
  priority: string | null
  createdBy: string | null
  ownerId: string | null
}

export interface IssuePage {
  results: Issue[]
  pagination: {
    limit: number
    offset: number
    totalResults: number
  }
}

export interface IssueQueryParams {
  limit?: number
  offset?: number
  filter?: {
    status?: IssueStatus[]
    issueTypeId?: string
    assignedTo?: string
  }
}

export interface IssueSubtype {
  id: string
  title: string
  code: string
  isActive: boolean
}

export interface IssueType {
  id: string
  title: string
  code: string
  isActive: boolean
  subtypes: IssueSubtype[]
}

export interface RootCauseCategory {
  id: string
  title: string
  isActive: boolean
  rootCauses: RootCause[]
}

export interface RootCause {
  id: string
  title: string
  isActive: boolean
}

export interface ProjectUser {
  id: string
  autodeskId?: string
  userId?: string
  name: string
  email?: string
  avatarUrl?: string
}
