import { createFileRoute } from '@tanstack/react-router'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import DocumentsDashboardPage from '@/components/documents/DocumentsDashboardPage'

const OFICIOS_FOLDER_URL =
  'https://acc.autodesk.com/docs/files/projects/1fe1347a-35a4-4d0a-b39b-467914a005b1?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.duYMxdrlQGyGHeTCgUxBcQ&viewModel=detail&moduleId=folders'
const OFICIOS_SALIDA_FOLDER_URL =
  'https://acc.autodesk.com/docs/files/projects/1fe1347a-35a4-4d0a-b39b-467914a005b1?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.uPZRNLXBSvu2-C7CoPLrWQ&viewModel=detail&moduleId=folders'

export const Route = createFileRoute('/documents/oficios')({
  component: OficiosPage,
})

function OficiosPage() {
  return (
    <DocumentsDashboardPage
      pageTitle="Oficios"
      pageDescription="Resumen de documentos detectados en la carpeta de ACC configurada para oficios."
      queryNamespace="oficios"
      tableTitle="Detalle de Oficios"
      scopes={[
        {
          id: 'entrada',
          title: 'Oficios de entrada',
          chartTitle: 'Oficios de entrada por Estatus',
          tableLabel: 'Oficios de entrada',
          icon: ArrowDownToLine,
          folderUrl: OFICIOS_FOLDER_URL,
        },
        {
          id: 'salida',
          title: 'Oficios de salida',
          chartTitle: 'Oficios de salida por Estatus',
          tableLabel: 'Oficios de salida',
          icon: ArrowUpFromLine,
          folderUrl: OFICIOS_SALIDA_FOLDER_URL,
        },
      ]}
    />
  )
}
