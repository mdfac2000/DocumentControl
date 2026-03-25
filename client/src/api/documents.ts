import api from './axiosInstance'
import type { DocumentRow } from '@/types/document'

export interface FolderDocumentsSummary {
  source: {
    folderUrl: string
    projectId: string
    folderUrn: string
    childFolderName?: string
  }
  totalDocuments: number
  totalFolders: number
}

export interface FolderChildFoldersResponse {
  source: {
    folderUrl: string
    projectId: string
    folderUrn: string
  }
  folders: Array<{
    id: string
    name: string
  }>
}

export interface FolderDocumentsTableResponse {
  source: {
    folderUrl: string
    projectId: string
    folderUrn: string
    childFolderName?: string
  }
  rows: DocumentRow[]
}

export interface FolderStatusDistribution {
  source: {
    folderUrl: string
    projectId: string
    folderUrn: string
    fieldName: string
    childFolderName?: string
  }
  totalDocuments: number
  totalFolders: number
  distribution: Array<{
    status: string
    value: number
  }>
}

export async function getFolderDocumentsSummary(folderUrl: string, childFolderName?: string): Promise<FolderDocumentsSummary> {
  const { data } = await api.get<FolderDocumentsSummary>('/api/acc/folder-documents-summary', {
    params: { folderUrl, childFolderName },
  })
  return data
}

export async function getFolderStatusDistribution(folderUrl: string, fieldName: string, childFolderName?: string): Promise<FolderStatusDistribution> {
  const { data } = await api.get<FolderStatusDistribution>('/api/acc/folder-status-distribution', {
    params: { folderUrl, fieldName, childFolderName },
  })
  return data
}

export async function getFolderChildFolders(folderUrl: string): Promise<FolderChildFoldersResponse> {
  const { data } = await api.get<FolderChildFoldersResponse>('/api/acc/folder-child-folders', {
    params: { folderUrl },
  })
  return data
}

export async function getFolderDocumentsTable(folderUrl: string, childFolderName?: string): Promise<FolderDocumentsTableResponse> {
  const { data } = await api.get<FolderDocumentsTableResponse>('/api/acc/folder-documents-table', {
    params: { folderUrl, childFolderName },
  })
  return data
}
