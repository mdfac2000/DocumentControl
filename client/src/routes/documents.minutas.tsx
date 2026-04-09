import { createFileRoute } from '@tanstack/react-router'
import { ClipboardList, FileText } from 'lucide-react'
import DocumentsDashboardPage from '@/components/documents/DocumentsDashboardPage'

const MINUTAS_POR_TRAMO_FOLDER_URL =
  'https://acc.autodesk.com/docs/files/projects/1fe1347a-35a4-4d0a-b39b-467914a005b1?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.kzTFRvAsTrWuNxVU6ge3Nw&viewModel=detail&moduleId=folders'
const MINUTAS_GENERALES_FOLDER_URL =
  'https://acc.autodesk.com/docs/files/projects/1fe1347a-35a4-4d0a-b39b-467914a005b1?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.GeFZb1M4QEGlKxWuQFb3vA&viewModel=detail&moduleId=folders'

export const Route = createFileRoute('/documents/minutas')({
  component: MinutasPage,
})

function MinutasPage() {
  return (
    <DocumentsDashboardPage
      pageTitle="Minutas"
      pageDescription="Resumen de documentos detectados en la carpeta de ACC configurada para minutas."
      queryNamespace="minutas"
      tableTitle="Detalle de Minutas"
      scopes={[
        {
          id: 'por-tramo',
          title: 'Minutas por tramo',
          chartTitle: 'Minutas por tramo por Estatus',
          tableLabel: 'Minutas por tramo',
          icon: ClipboardList,
          folderUrl: MINUTAS_POR_TRAMO_FOLDER_URL,
        },
        {
          id: 'generales',
          title: 'Minutas generales',
          chartTitle: 'Minutas generales por Estatus',
          tableLabel: 'Minutas generales',
          icon: FileText,
          folderUrl: MINUTAS_GENERALES_FOLDER_URL,
        },
      ]}
    />
  )
}
