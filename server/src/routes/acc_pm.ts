import { Router, Request, Response } from 'express'
import axios from 'axios'

const router = Router()

const APS_BASE = 'https://developer.api.autodesk.com'

router.get('/pm/summary', async (req: Request, res: Response) => {
  try {
    const accessToken = req.cookies?.access_token
    if (!accessToken) {
      return res.status(401).json({ error: 'No autenticado en ACC' })
    }

    const projectId = req.query.projectId as string
    if (!projectId) {
      return res.status(400).json({ error: 'Falta projectId' })
    }

    const docsProjectResp = await axios.get(
      `${APS_BASE}/project/v1/hubs/${encodeURIComponent(projectId)}/projects`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const docsProject = docsProjectResp.data?.data?.[0]
    if (!docsProject) {
      return res.status(404).json({ error: 'No se pudo resolver Docs project' })
    }

    const docsProjectId = docsProject.id

    const foldersResp = await axios.get(
      `${APS_BASE}/data/v1/projects/${encodeURIComponent(docsProjectId)}/folders`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const folders = foldersResp.data?.data ?? []

    const pmFolder = folders.find(
      (f: any) => f.attributes?.name === '00_Project Management'
    )

    if (!pmFolder) {
      return res.status(404).json({
        error: 'No se encontró la carpeta 00_Project Management',
      })
    }

    const pmContentsResp = await axios.get(
      `${APS_BASE}/data/v1/projects/${encodeURIComponent(docsProjectId)}/folders/${encodeURIComponent(pmFolder.id)}/contents`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const subfolders = (pmContentsResp.data?.data ?? [])
      .filter((item: any) => item.type === 'folders')
      .map((item: any) => ({
        id: item.id,
        name: item.attributes?.name,
      }))

    res.json({
      projectId,
      folder: '00_Project Management',
      subfolders,
    })
  } catch (error: any) {
    console.error('ERROR pm/summary', error?.response?.data || error.message)
    res.status(500).json({ error: 'Error obteniendo Project Management' })
  }
})

export default router