import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
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
import StatusBadge from './StatusBadge'
import { formatDate, isOverdue } from '@/lib/dateHelpers'
import { exportIssuesToCsv } from '@/lib/csvExport'
import { cn } from '@/lib/utils'
import type { Issue, IssueStatus, ProjectUser } from '@/types/issue'
import type { IssueType } from '@/types/issue'
import { ArrowUpDown, Download, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getAccDefaultStatus } from '@/lib/issueStatus'

const columnHelper = createColumnHelper<Issue>()

const STATUS_OPTIONS: IssueStatus[] = [
  'draft',
  'open',
  'pending',
  'in_progress',
  'completed',
  'in_review',
  'not_approved',
  'closed',
]

const STATUS_LABELS: Record<IssueStatus, string> = {
  draft: 'Borrador',
  open: 'Abierta',
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
  in_review: 'En revisión',
  not_approved: 'No aprobada',
  closed: 'Cerrada',
}

interface Props {
  issues: Issue[]
  issueTypes: IssueType[]
  users: ProjectUser[]
}

export default function IssuesTable({ issues, issueTypes, users }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const selectedStatus = (columnFilters.find((filter) => filter.id === 'status')?.value as string) ?? 'all'

  const typeMap = useMemo(
    () => new Map(issueTypes.map((t) => [t.id, t.title])),
    [issueTypes],
  )

  const userMap = useMemo(() => {
    const map = new Map<string, ProjectUser>()
    for (const user of users) {
      for (const key of [user.id, user.autodeskId, user.userId].filter(Boolean) as string[]) {
        map.set(key, user)
      }
    }
    return map
  }, [users])

  function getUserDisplayName(userId: string | null) {
    if (!userId) return null
    return userMap.get(userId)?.name?.trim() || 'Usuario eliminado'
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('displayId', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            #<ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
        size: 60,
      }),
      columnHelper.accessor('title', {
        header: 'Título',
        cell: (info) => (
          <span className="line-clamp-2 text-sm">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => <StatusBadge status={info.getValue()} />,
        filterFn: (row, _id, value: string) =>
          value === 'all' || getAccDefaultStatus(row.original.status) === value,
        size: 110,
      }),
      columnHelper.accessor('issueTypeId', {
        header: 'Tipo',
        cell: (info) => {
          const id = info.getValue()
          return (
            <span className="text-sm text-muted-foreground">
              {id ? (typeMap.get(id) ?? id.slice(0, 8)) : '—'}
            </span>
          )
        },
        size: 140,
      }),
      columnHelper.accessor('assignedTo', {
        header: 'Asignado a',
        cell: (info) => {
          const id = info.getValue()
          const name = getUserDisplayName(id)
          return (
            <span className="block max-w-32 truncate text-sm text-muted-foreground">
              {name ?? '—'}
            </span>
          )
        },
        size: 140,
      }),
      columnHelper.accessor('dueDate', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Vencimiento<ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: (info) => {
          const due = info.getValue()
          const overdue = isOverdue(due) && info.row.original.status !== 'closed'
          return (
            <span className={cn('text-sm', overdue && 'font-medium text-destructive')}>
              {formatDate(due)}
            </span>
          )
        },
        size: 120,
      }),
      columnHelper.accessor('createdAt', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Creado<ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>
        ),
        size: 110,
      }),
      columnHelper.accessor('priority', {
        header: 'Prioridad',
        cell: (info) => (
          <span className="capitalize text-sm text-muted-foreground">
            {info.getValue() ?? '—'}
          </span>
        ),
        size: 90,
      }),
    ],
    [typeMap, userMap],
  )

  const table = useReactTable({
    data: issues,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  const filteredIssues = table.getFilteredRowModel().rows.map((r) => r.original)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Input
            placeholder="Buscar por título..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 w-64 pr-8 text-sm"
          />
          {globalFilter && (
            <button
              type="button"
              onClick={() => setGlobalFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select
          value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
          onValueChange={(val) =>
            table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)
          }
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Estado">
              {selectedStatus === 'all'
                ? 'Todos los estados'
                : (STATUS_LABELS[selectedStatus as keyof typeof STATUS_LABELS] ?? selectedStatus)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredIssues.length} issues
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => exportIssuesToCsv(filteredIssues)}
          >
            <Download className="size-3" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No se encontraron issues.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
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
          <span className="text-xs text-muted-foreground">Filas por página:</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(val) => table.setPageSize(Number(val))}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de{' '}
            {table.getPageCount()}
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
