import {
  type ColumnFiltersState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { Fragment, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DocumentRow } from '@/types/document'

const columnHelper = createColumnHelper<DocumentRow>()

const STATUS_LABELS: Record<string, string> = {
  EER: 'En espera de respuesta',
  IFM: 'Informativo',
  RDF: 'Respuesta DFS',
  AARTF: 'Atendido por ARTF',
  CLD: 'Cancelado',
  EEA: 'En espera de acuse',
  EFM: 'En Firma',
  ERV: 'En Revision',
  CNC: 'Conocimiento',
  RCB: 'Respuesta CB',
  'S/RCB': 'Sin Respuesta de CB',
  RRARTF: 'Requiere Respuesta ARTF',
  ACB: 'Atendido por C&B',
  'S/RDEF': 'Sin Respuesta de DEFENSA',
}

function displayValue(value: DocumentRow[keyof DocumentRow]) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  return String(value)
}

function formatSharedDate(value: DocumentRow['receivedDate']) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value !== 'string') {
    return String(value)
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

interface Props {
  rows: DocumentRow[]
  hideCount?: boolean
}

export default function DocumentsTable({ rows, hideCount = false }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columns = useMemo(
    () => [
      columnHelper.accessor('fileName', {
        header: 'Nombre del archivo',
        cell: (info) => <span className="block max-w-[320px] truncate text-sm">{info.getValue()}</span>,
        size: 320,
      }),
      columnHelper.accessor('receivedDate', {
        header: 'Fecha de Recepcion',
        cell: (info) => <span className="text-sm text-muted-foreground">{formatSharedDate(info.getValue())}</span>,
        size: 160,
      }),
      columnHelper.accessor('discipline', {
        header: 'Disciplina',
        cell: (info) => <span className="text-sm text-muted-foreground">{displayValue(info.getValue())}</span>,
        size: 150,
      }),
      columnHelper.accessor('status', {
        header: 'Estatus',
        cell: (info) => {
          const rawStatus = displayValue(info.getValue())
          const statusMeaning = STATUS_LABELS[rawStatus]

          return (
            <div className="space-y-0.5">
              <span className="block text-sm">{rawStatus}</span>
              {statusMeaning ? (
                <span className="block text-xs text-muted-foreground">{statusMeaning}</span>
              ) : null}
            </div>
          )
        },
        size: 140,
      }),
      columnHelper.accessor('subject', {
        header: 'Asunto',
        cell: (info) => (
          <span
            className="block max-w-[360px] truncate text-sm text-muted-foreground"
            title={displayValue(info.getValue())}
          >
            {displayValue(info.getValue())}
          </span>
        ),
        size: 360,
      }),
    ],
    []
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="space-y-4">
      {!hideCount ? (
        <div className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} documentos
        </div>
      ) : null}

      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <Fragment key={headerGroup.id}>
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.column.getSize() }}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  {headerGroup.headers.map((header) => {
                    const column = header.column
                    const value = (column.getFilterValue() as string | undefined) ?? ''

                    return (
                      <TableCell key={`${header.id}-filter`} className="bg-background/80">
                        <Input
                          value={value}
                          onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                          placeholder="Filtrar..."
                          className="h-8 min-w-[120px] text-xs"
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              </Fragment>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No se encontraron documentos.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filas por pagina:</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="size-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
