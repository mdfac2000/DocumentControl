import { Router, Request, Response } from 'express'
import axios, { AxiosError } from 'axios'

const router = Router()

const APS_BASE = 'https://developer.api.autodesk.com'

function getToken(req: Request): string | null {
  return req.cookies?.access_token ?? null
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

interface HubSummary {
  id: string
  name: string
  type: string
}

interface ProjectRecord {
  id: string
  type?: string
  attributes?: {
    name?: string
    scopes?: string[]
    extension?: {
      type?: string
      data?: Record<string, unknown>
    }
  }
  relationships?: {
    hub?: {
      data?: {
        id?: string
        type?: string
      }
    }
  }
}

interface FolderContentsResponse {
  data?: Array<{
    id: string
    type: string
    attributes?: {
      displayName?: string
    }
    relationships?: {
      tip?: {
        data?: {
          id?: string
          type?: string
        }
      }
    }
  }>
  links?: {
    next?: {
      href?: string
    }
  }
}

interface FolderSummary {
  totalDocuments: number
  totalFolders: number
}

interface FolderOption {
  id: string
  name: string
}

interface FolderTraversalResult extends FolderSummary {
  versionUrns: string[]
}

interface TraversedDocument {
  itemId: string
  name: string
  versionUrn: string
}

interface FolderDocumentsTraversalResult extends FolderSummary {
  documents: TraversedDocument[]
}

interface VersionBatchGetResponse {
  results?: Array<{
    itemUrn?: string
    versionUrn?: string
    requestedVersionUrn?: string
    name?: string
    customAttributes?: Array<{
      name?: string
      title?: string
      value?: string | number | boolean | null
    }>
  }>
}

// ACC Issues API v2 requires the raw UUID without the "b." prefix
function projectUuid(projectId: string | string[]): string {
  const id = Array.isArray(projectId) ? projectId[0] : projectId
  return id.startsWith('b.') ? id.slice(2) : id
}

function projectIssueUrls(projectId: string | string[], resource: 'issues' | 'issue-types' | 'root-cause-categories') {
  const uuid = projectUuid(projectId)
  return [
    `${APS_BASE}/construction/issues/v2/projects/${uuid}/${resource}`,
    `${APS_BASE}/construction/issues/v1/projects/${uuid}/${resource}`,
  ]
}

function parseAccFolderUrl(folderUrl: string) {
  const url = new URL(folderUrl)
  const projectMatch = url.pathname.match(/\/projects\/([^/]+)/)
  const projectId = projectMatch?.[1] ?? null
  const folderUrn = url.searchParams.get('folderUrn')

  if (!projectId || !folderUrn) {
    throw new Error('Invalid ACC folder URL. Expected projectId and folderUrn.')
  }

  return {
    projectId: decodeURIComponent(projectId),
    folderUrn: decodeURIComponent(folderUrn),
  }
}

async function resolveDocsProjectId(token: string, projectId: string): Promise<string> {
  if (projectId.startsWith('b.')) {
    return projectId
  }

  const prefixedProjectId = `b.${projectId}`

  try {
    await axios.get(`${APS_BASE}/project/v1/hubs`, {
      headers: authHeaders(token),
      params: { limit: 1 },
    })
    return prefixedProjectId
  } catch {
    return prefixedProjectId
  }
}

async function fetchFolderContentsPage(token: string, projectId: string, folderUrn: string, nextUrl?: string) {
  const url = nextUrl ?? `${APS_BASE}/data/v1/projects/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(folderUrn)}/contents`
  const { data } = await axios.get<FolderContentsResponse>(url, {
    headers: authHeaders(token),
  })
  return data
}

async function fetchImmediateChildFolders(token: string, projectId: string, folderUrn: string) {
  let nextUrl: string | undefined
  const folders: FolderOption[] = []

  do {
    const response = await fetchFolderContentsPage(token, projectId, folderUrn, nextUrl)
    const entries = response.data ?? []

    for (const entry of entries) {
      if (entry.type === 'folders' && entry.attributes?.displayName) {
        folders.push({
          id: entry.id,
          name: entry.attributes.displayName,
        })
      }
    }

    nextUrl = response.links?.next?.href
  } while (nextUrl)

  return folders.sort((a, b) => a.name.localeCompare(b.name))
}

async function resolveScopedFolderUrn(
  token: string,
  projectId: string,
  rootFolderUrn: string,
  childFolderName?: string
) {
  if (!childFolderName) {
    return rootFolderUrn
  }

  const childFolders = await fetchImmediateChildFolders(token, projectId, rootFolderUrn)
  const normalizedTarget = childFolderName.trim().toLowerCase()
  const match = childFolders.find((folder) => folder.name.trim().toLowerCase() === normalizedTarget)

  if (!match) {
    throw new Error(`No se encontro el tramo "${childFolderName}" en la carpeta seleccionada.`)
  }

  return match.id
}

async function summarizeFolderTree(
  token: string,
  projectId: string,
  folderUrn: string,
  visited = new Set<string>()
): Promise<FolderTraversalResult> {
  if (visited.has(folderUrn)) {
    return { totalDocuments: 0, totalFolders: 0, versionUrns: [] }
  }

  visited.add(folderUrn)

  let totalDocuments = 0
  let totalFolders = 0
  let nextUrl: string | undefined
  const childFolders: string[] = []
  const versionUrns: string[] = []

  do {
    const response = await fetchFolderContentsPage(token, projectId, folderUrn, nextUrl)
    const entries = response.data ?? []

    for (const entry of entries) {
      if (entry.type === 'items') {
        totalDocuments += 1
        const tipVersionUrn = entry.relationships?.tip?.data?.id
        if (tipVersionUrn) {
          versionUrns.push(tipVersionUrn)
        }
      }

      if (entry.type === 'folders') {
        totalFolders += 1
        childFolders.push(entry.id)
      }
    }

    nextUrl = response.links?.next?.href
  } while (nextUrl)

  for (const childFolderUrn of childFolders) {
    const childSummary = await summarizeFolderTree(token, projectId, childFolderUrn, visited)
    totalDocuments += childSummary.totalDocuments
    totalFolders += childSummary.totalFolders
    versionUrns.push(...childSummary.versionUrns)
  }

  return { totalDocuments, totalFolders, versionUrns }
}

async function collectFolderDocuments(
  token: string,
  projectId: string,
  folderUrn: string,
  visited = new Set<string>()
): Promise<FolderDocumentsTraversalResult> {
  if (visited.has(folderUrn)) {
    return { totalDocuments: 0, totalFolders: 0, documents: [] }
  }

  visited.add(folderUrn)

  let totalDocuments = 0
  let totalFolders = 0
  let nextUrl: string | undefined
  const childFolders: string[] = []
  const documents: TraversedDocument[] = []

  do {
    const response = await fetchFolderContentsPage(token, projectId, folderUrn, nextUrl)
    const entries = response.data ?? []

    for (const entry of entries) {
      if (entry.type === 'items') {
        totalDocuments += 1
        const tipVersionUrn = entry.relationships?.tip?.data?.id
        if (tipVersionUrn) {
          documents.push({
            itemId: entry.id,
            name: entry.attributes?.displayName ?? 'Documento sin nombre',
            versionUrn: tipVersionUrn,
          })
        }
      }

      if (entry.type === 'folders') {
        totalFolders += 1
        childFolders.push(entry.id)
      }
    }

    nextUrl = response.links?.next?.href
  } while (nextUrl)

  for (const childFolderUrn of childFolders) {
    const childResult = await collectFolderDocuments(token, projectId, childFolderUrn, visited)
    totalDocuments += childResult.totalDocuments
    totalFolders += childResult.totalFolders
    documents.push(...childResult.documents)
  }

  return { totalDocuments, totalFolders, documents }
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    result.push(items.slice(index, index + chunkSize))
  }
  return result
}

async function fetchVersionDetails(token: string, projectId: string, versionUrns: string[]) {
  const chunks = chunkArray(versionUrns, 100)
  const results: NonNullable<VersionBatchGetResponse['results']> = []

  for (const urns of chunks) {
    const { data } = await axios.post<VersionBatchGetResponse>(
      `${APS_BASE}/bim360/docs/v1/projects/${encodeURIComponent(projectUuid(projectId))}/versions:batch-get`,
      { urns },
      {
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
      }
    )

    const chunkResults = (data.results ?? []).map((result, index) => ({
      ...result,
      requestedVersionUrn: result.versionUrn ?? urns[index],
    }))

    results.push(...chunkResults)
  }

  return results
}

function getCustomAttributeValue(
  attributes: Array<{ name?: string; title?: string; value?: string | number | boolean | null }> | undefined,
  targetName: string
) {
  function normalizeLabel(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  const normalizedTarget = normalizeLabel(targetName)
  const match = attributes?.find((attribute) => {
    const keys = [attribute.name, attribute.title]
      .filter((key): key is string => Boolean(key))
      .map((key) => normalizeLabel(key))

    return keys.includes(normalizedTarget) || keys.some((key) => key.includes(normalizedTarget) || normalizedTarget.includes(key))
  })

  return match?.value
}

async function getFolderStatusDistribution(token: string, projectId: string, folderUrn: string, statusFieldName: string) {
  const traversal = await summarizeFolderTree(token, projectId, folderUrn)
  const versions = traversal.versionUrns.length > 0
    ? await fetchVersionDetails(token, projectId, traversal.versionUrns)
    : []

  const counts = versions.reduce<Record<string, number>>((acc, version) => {
    const rawValue = getCustomAttributeValue(version.customAttributes, statusFieldName)
    const status = typeof rawValue === 'string' && rawValue.trim().length > 0
      ? rawValue.trim()
      : 'Sin estatus'

    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})

  const distribution = Object.entries(counts)
    .map(([status, value]) => ({ status, value }))
    .sort((a, b) => b.value - a.value || a.status.localeCompare(b.status))

  return {
    totalDocuments: traversal.totalDocuments,
    totalFolders: traversal.totalFolders,
    distribution,
  }
}

async function getFolderDocumentsTable(
  token: string,
  projectId: string,
  folderUrn: string
) {
  const traversal = await collectFolderDocuments(token, projectId, folderUrn)
  const versions = traversal.documents.length > 0
    ? await fetchVersionDetails(token, projectId, traversal.documents.map((document) => document.versionUrn))
    : []

  const versionMap = new Map(
    versions.map((version) => [version.versionUrn ?? version.requestedVersionUrn ?? '', version])
  )

  const rows = traversal.documents.map((document) => {
    const version = versionMap.get(document.versionUrn)
    const attributes = version?.customAttributes

    return {
      id: document.itemId,
      fileName: version?.name ?? document.name,
      receivedDate: getCustomAttributeValue(attributes, 'Fecha de Recepción'),
      discipline: getCustomAttributeValue(attributes, 'Disciplina'),
      status: getCustomAttributeValue(attributes, 'Estatus'),
      subject: getCustomAttributeValue(attributes, 'Asunto'),
    }
  })

  return rows
}

// GET /api/acc/projects/:projectId/debug
router.get('/projects/:projectId/debug', async (req: Request, res: Response) => {
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }
  const authToken = token

  const projectIdParam = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId
  const projectId = projectIdParam
  const uuid = projectUuid(projectId)
  const prefixedProjectId = projectId.startsWith('b.') ? projectId : `b.${uuid}`
  const basicAuth = `Basic ${Buffer.from(
    `${process.env.APS_CLIENT_ID}:${process.env.APS_CLIENT_SECRET}`
  ).toString('base64')}`

  async function tryUrl(label: string, url: string, params?: Record<string, unknown>) {
    try {
      const { data, status } = await axios.get(url, {
        headers: authHeaders(authToken),
        params: { limit: 1, offset: 0, ...params },
      })
      return { label, ok: true, status, url, sample: JSON.stringify(data).slice(0, 600) }
    } catch (e) {
      const ae = e as AxiosError
      return { label, ok: false, status: ae.response?.status, url, error: ae.response?.data ?? ae.message }
    }
  }

  async function getProjectSearchContext() {
    try {
      const { data } = await axios.get(`${APS_BASE}/project/v1/hubs`, { headers: authHeaders(authToken) })
      const hubs = (data?.data ?? []) as Array<{ id: string; attributes?: { name?: string }; type: string }>

      const projectsByHub = await Promise.all(
        hubs.map(async (hub) => {
          try {
            const response = await axios.get(`${APS_BASE}/project/v1/hubs/${hub.id}/projects`, {
              headers: authHeaders(authToken),
            })
            const projects = (response.data?.data ?? []) as ProjectRecord[]
            const matchedProject = projects.find((project) =>
              [project.id, projectUuid(project.id)].includes(projectId) ||
              [project.id, projectUuid(project.id)].includes(uuid)
            )

            return {
              hub: {
                id: hub.id,
                name: hub.attributes?.name ?? '',
                type: hub.type,
              },
              projectCount: projects.length,
              matchedProject: matchedProject ?? null,
            }
          } catch (e) {
            const ae = e as AxiosError
            return {
              hub: {
                id: hub.id,
                name: hub.attributes?.name ?? '',
                type: hub.type,
              },
              projectCount: null,
              error: ae.response?.data ?? ae.message,
            }
          }
        })
      )

      const matchedHub = projectsByHub.find((entry) => entry.matchedProject)?.hub ?? null
      const matchedProject = projectsByHub.find((entry) => entry.matchedProject)?.matchedProject ?? null

      return {
        matchedHub,
        matchedProject,
        scannedHubs: projectsByHub,
      }
    } catch (e) {
      const ae = e as AxiosError
      return { error: ae.response?.data ?? ae.message }
    }
  }

  // 1. Check token info (scopes + expiry)
  let tokenInfo: unknown = null
  try {
    const { data } = await axios.post(
      `${APS_BASE}/authentication/v2/introspect`,
      new URLSearchParams({ token: authToken }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: basicAuth,
        },
      }
    )
    tokenInfo = { active: data.active, scope: data.scope, exp: data.exp }
  } catch (e) {
    tokenInfo = { error: (e as Error).message }
  }

  // 2. Verify hubs are accessible (confirms token + data:read works)
  let hubsCheck: unknown = null
  try {
    const { data } = await axios.get(`${APS_BASE}/project/v1/hubs`, { headers: authHeaders(authToken) })
    const hubs = (data?.data ?? []) as Array<{ id: string; attributes?: { name?: string }; type: string }>
    hubsCheck = hubs.map((h): HubSummary => ({ id: h.id, name: h.attributes?.name ?? '', type: h.type }))
  } catch (e) {
    const ae = e as AxiosError
    hubsCheck = { error: ae.response?.data ?? ae.message }
  }

  // 3. Inspect where Autodesk sees this project and which metadata it exposes
  const projectSearch = await getProjectSearchContext()

  // 4. ACC Issues API calls
  const results = await Promise.all([
    tryUrl('issues v2 (uuid)', `${APS_BASE}/construction/issues/v2/projects/${uuid}/issues`),
    tryUrl('issues v1 (uuid)', `${APS_BASE}/construction/issues/v1/projects/${uuid}/issues`),
    tryUrl('issues v2 (prefixed)', `${APS_BASE}/construction/issues/v2/projects/${prefixedProjectId}/issues`),
    tryUrl('issue-types v2', `${APS_BASE}/construction/issues/v2/projects/${uuid}/issue-types`),
    tryUrl('issue-types v1', `${APS_BASE}/construction/issues/v1/projects/${uuid}/issue-types`),
    tryUrl('root-cause-categories v2', `${APS_BASE}/construction/issues/v2/projects/${uuid}/root-cause-categories`),
    tryUrl('root-cause-categories v1', `${APS_BASE}/construction/issues/v1/projects/${uuid}/root-cause-categories`),
    tryUrl('user profile', `${APS_BASE}/userprofile/v1/users/@me`),
  ])

  res.json({ projectId, uuid, prefixedProjectId, tokenInfo, hubsCheck, projectSearch, results })
})

// GET /api/acc/hubs
router.get('/hubs', async (req: Request, res: Response) => {
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    const { data } = await axios.get(`${APS_BASE}/project/v1/hubs`, {
      headers: authHeaders(token),
    })
    res.json(data)
  } catch (err) {
    const axiosErr = err as AxiosError
    const status = axiosErr.response?.status ?? 500
    const body = axiosErr.response?.data ?? { error: axiosErr.message }
    console.error(`[APS] ERROR ${status}`, JSON.stringify(body, null, 2))
    res.status(status).json(body)
  }
})

// GET /api/acc/hubs/:hubId/projects
router.get('/hubs/:hubId/projects', async (req: Request, res: Response) => {
  const hubId = Array.isArray(req.params.hubId) ? req.params.hubId[0] : req.params.hubId
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    const { data } = await axios.get(`${APS_BASE}/project/v1/hubs/${hubId}/projects`, {
      headers: authHeaders(token),
    })
    res.json(data)
  } catch (err) {
    const axiosErr = err as AxiosError
    const status = axiosErr.response?.status ?? 500
    const body = axiosErr.response?.data ?? { error: axiosErr.message }
    console.error(`[APS] ERROR ${status}`, JSON.stringify(body, null, 2))
    res.status(status).json(body)
  }
})

// GET /api/acc/projects/:projectId/issues
router.get('/projects/:projectId/issues', async (req: Request, res: Response) => {
  const { projectId } = req.params
  const { limit, offset } = req.query
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const urls = projectIssueUrls(projectId, 'issues')
  const params = { limit: Number(limit ?? 200), offset: Number(offset ?? 0) }
  let lastError: AxiosError | null = null

  for (const url of urls) {
    console.log(`[APS] GET ${url}`, params)
    try {
      const { data } = await axios.get(url, { headers: authHeaders(token), params })
      res.json(data)
      return
    } catch (err) {
      const axiosErr = err as AxiosError
      lastError = axiosErr
      if (axiosErr.response?.status !== 404) {
        const status = axiosErr.response?.status ?? 500
        const body = axiosErr.response?.data ?? { error: axiosErr.message }
        console.error(`[APS] ERROR ${status}`, JSON.stringify(body, null, 2))
        res.status(status).json(body)
        return
      }
    }
  }

  const status = lastError?.response?.status ?? 500
  const body = lastError?.response?.data ?? { error: lastError?.message ?? 'Unknown error' }
  res.status(status).json(body)
})

// GET /api/acc/projects/:projectId/issue-types
router.get('/projects/:projectId/issue-types', async (req: Request, res: Response) => {
  const { projectId } = req.params
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const urls = projectIssueUrls(projectId, 'issue-types')
  let lastError: AxiosError | null = null

  for (const url of urls) {
    console.log(`[APS] GET ${url}`)
    try {
      const { data } = await axios.get(url, { headers: authHeaders(token), params: { include: 'subtypes' } })
      res.json(data)
      return
    } catch (err) {
      const axiosErr = err as AxiosError
      lastError = axiosErr
      if (axiosErr.response?.status !== 404) {
        const status = axiosErr.response?.status ?? 500
        const body = axiosErr.response?.data ?? { error: axiosErr.message }
        console.error(`[APS] ERROR ${status}`, JSON.stringify(body, null, 2))
        res.status(status).json(body)
        return
      }
    }
  }

  const status = lastError?.response?.status ?? 500
  const body = lastError?.response?.data ?? { error: lastError?.message ?? 'Unknown error' }
  res.status(status).json(body)
})

// GET /api/acc/projects/:projectId/users
router.get('/projects/:projectId/users', async (req: Request, res: Response) => {
  const { projectId } = req.params
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const uuid = projectUuid(projectId)
  const { limit, offset } = req.query
  // Use ACC Admin users, not Issues users. APS tutorials explicitly note that
  // issue payloads only expose user IDs, and project member details must be
  // resolved through the Project Users endpoint.
  const url = `${APS_BASE}/construction/admin/v1/projects/${uuid}/users`
  console.log(`[APS] GET ${url}`)
  try {
    const { data } = await axios.get(url, {
      headers: authHeaders(token),
      params: {
        limit: Number(limit ?? 200),
        offset: Number(offset ?? 0),
      },
    })
    if (data.results?.[0]) {
      console.log('[APS] users[0] sample:', JSON.stringify(data.results[0]))
    }
    res.json(data)
  } catch (err) {
    const axiosErr = err as AxiosError
    const status = axiosErr.response?.status ?? 500
    const body = axiosErr.response?.data ?? { error: axiosErr.message }
    console.error(`[APS] users ERROR ${status}`, JSON.stringify(body))
    res.status(status).json(body)
  }
})

// GET /api/acc/projects/:projectId/root-cause-categories
router.get('/projects/:projectId/root-cause-categories', async (req: Request, res: Response) => {
  const { projectId } = req.params
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const urls = projectIssueUrls(projectId, 'root-cause-categories')
  let lastError: AxiosError | null = null

  for (const url of urls) {
    console.log(`[APS] GET ${url}`)
    try {
      const { data } = await axios.get(url, { headers: authHeaders(token), params: { include: 'rootCauses' } })
      res.json(data)
      return
    } catch (err) {
      const axiosErr = err as AxiosError
      lastError = axiosErr
      if (axiosErr.response?.status !== 404) {
        const status = axiosErr.response?.status ?? 500
        const body = axiosErr.response?.data ?? { error: axiosErr.message }
        console.error(`[APS] ERROR ${status}`, JSON.stringify(body, null, 2))
        res.status(status).json(body)
        return
      }
    }
  }

  const status = lastError?.response?.status ?? 500
  const body = lastError?.response?.data ?? { error: lastError?.message ?? 'Unknown error' }
  res.status(status).json(body)
})

// GET /api/acc/folder-documents-summary?folderUrl=https://acc.autodesk.com/...
router.get('/folder-documents-summary', async (req: Request, res: Response) => {
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const folderUrl = Array.isArray(req.query.folderUrl) ? req.query.folderUrl[0] : req.query.folderUrl
  const childFolderName = Array.isArray(req.query.childFolderName) ? req.query.childFolderName[0] : req.query.childFolderName

  if (!folderUrl || typeof folderUrl !== 'string') {
    res.status(400).json({ error: 'Missing folderUrl query parameter' })
    return
  }

  try {
    const { projectId, folderUrn } = parseAccFolderUrl(folderUrl)
    const docsProjectId = await resolveDocsProjectId(token, projectId)
    const scopedFolderUrn = await resolveScopedFolderUrn(
      token,
      docsProjectId,
      folderUrn,
      typeof childFolderName === 'string' ? childFolderName : undefined
    )
    const summary = await summarizeFolderTree(token, docsProjectId, scopedFolderUrn)

    res.json({
      source: {
        folderUrl,
        projectId: docsProjectId,
        folderUrn: scopedFolderUrn,
        childFolderName: typeof childFolderName === 'string' ? childFolderName : undefined,
      },
      ...summary,
    })
  } catch (err) {
    const axiosErr = err as AxiosError
    const status = axiosErr.response?.status ?? 500
    const body = axiosErr.response?.data ?? { error: (err as Error).message }
    console.error(`[APS] folder-documents-summary ERROR ${status}`, JSON.stringify(body, null, 2))
    res.status(status).json(body)
  }
})

// GET /api/acc/folder-status-distribution?folderUrl=https://acc.autodesk.com/...&fieldName=Estatus
router.get('/folder-status-distribution', async (req: Request, res: Response) => {
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const folderUrl = Array.isArray(req.query.folderUrl) ? req.query.folderUrl[0] : req.query.folderUrl
  const fieldName = Array.isArray(req.query.fieldName) ? req.query.fieldName[0] : req.query.fieldName
  const childFolderName = Array.isArray(req.query.childFolderName) ? req.query.childFolderName[0] : req.query.childFolderName

  if (!folderUrl || typeof folderUrl !== 'string') {
    res.status(400).json({ error: 'Missing folderUrl query parameter' })
    return
  }

  if (!fieldName || typeof fieldName !== 'string') {
    res.status(400).json({ error: 'Missing fieldName query parameter' })
    return
  }

  try {
    const { projectId, folderUrn } = parseAccFolderUrl(folderUrl)
    const docsProjectId = await resolveDocsProjectId(token, projectId)
    const scopedFolderUrn = await resolveScopedFolderUrn(
      token,
      docsProjectId,
      folderUrn,
      typeof childFolderName === 'string' ? childFolderName : undefined
    )
    const distribution = await getFolderStatusDistribution(token, docsProjectId, scopedFolderUrn, fieldName)

    res.json({
      source: {
        folderUrl,
        projectId: docsProjectId,
        folderUrn: scopedFolderUrn,
        fieldName,
        childFolderName: typeof childFolderName === 'string' ? childFolderName : undefined,
      },
      ...distribution,
    })
  } catch (err) {
    const axiosErr = err as AxiosError
    const status = axiosErr.response?.status ?? 500
    const body = axiosErr.response?.data ?? { error: (err as Error).message }
    console.error(`[APS] folder-status-distribution ERROR ${status}`, JSON.stringify(body, null, 2))
    res.status(status).json(body)
  }
})

// GET /api/acc/folder-child-folders?folderUrl=https://acc.autodesk.com/...
router.get('/folder-child-folders', async (req: Request, res: Response) => {
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const folderUrl = Array.isArray(req.query.folderUrl) ? req.query.folderUrl[0] : req.query.folderUrl

  if (!folderUrl || typeof folderUrl !== 'string') {
    res.status(400).json({ error: 'Missing folderUrl query parameter' })
    return
  }

  try {
    const { projectId, folderUrn } = parseAccFolderUrl(folderUrl)
    const docsProjectId = await resolveDocsProjectId(token, projectId)
    const folders = await fetchImmediateChildFolders(token, docsProjectId, folderUrn)

    res.json({
      source: {
        folderUrl,
        projectId: docsProjectId,
        folderUrn,
      },
      folders,
    })
  } catch (err) {
    const axiosErr = err as AxiosError
    const status = axiosErr.response?.status ?? 500
    const body = axiosErr.response?.data ?? { error: (err as Error).message }
    console.error(`[APS] folder-child-folders ERROR ${status}`, JSON.stringify(body, null, 2))
    res.status(status).json(body)
  }
})

// GET /api/acc/folder-documents-table?folderUrl=https://acc.autodesk.com/...&childFolderName=...
router.get('/folder-documents-table', async (req: Request, res: Response) => {
  const token = getToken(req)
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const folderUrl = Array.isArray(req.query.folderUrl) ? req.query.folderUrl[0] : req.query.folderUrl
  const childFolderName = Array.isArray(req.query.childFolderName) ? req.query.childFolderName[0] : req.query.childFolderName

  if (!folderUrl || typeof folderUrl !== 'string') {
    res.status(400).json({ error: 'Missing folderUrl query parameter' })
    return
  }

  try {
    const { projectId, folderUrn } = parseAccFolderUrl(folderUrl)
    const docsProjectId = await resolveDocsProjectId(token, projectId)
    const scopedFolderUrn = await resolveScopedFolderUrn(
      token,
      docsProjectId,
      folderUrn,
      typeof childFolderName === 'string' ? childFolderName : undefined
    )
    const rows = await getFolderDocumentsTable(token, docsProjectId, scopedFolderUrn)

    res.json({
      source: {
        folderUrl,
        projectId: docsProjectId,
        folderUrn: scopedFolderUrn,
        childFolderName: typeof childFolderName === 'string' ? childFolderName : undefined,
      },
      rows,
    })
  } catch (err) {
    const axiosErr = err as AxiosError
    const status = axiosErr.response?.status ?? 500
    const body = axiosErr.response?.data ?? { error: (err as Error).message }
    console.error(`[APS] folder-documents-table ERROR ${status}`, JSON.stringify(body, null, 2))
    res.status(status).json(body)
  }
})

export default router
