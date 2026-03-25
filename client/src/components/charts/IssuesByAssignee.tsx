import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from 'recharts'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Issue, ProjectUser } from '@/types/issue'
import { X } from 'lucide-react'
import {
  ACC_DEFAULT_STATUS_ORDER,
  getAccDefaultStatus,
  getAccDefaultStatusColor,
  getAccDefaultStatusLabel,
} from '@/lib/issueStatus'
import { cn } from '@/lib/utils'

interface Props {
  issues: Issue[]
  users?: ProjectUser[]
  activeStatuses?: Set<(typeof ACC_DEFAULT_STATUS_ORDER)[number]>
  onToggleStatus?: (status: (typeof ACC_DEFAULT_STATUS_ORDER)[number]) => void
}

interface ChartDatum {
  name: string
  fullName: string
  userId: string
  total: number
  draft: number
  open: number
  pending: number
  in_progress: number
  completed: number
  in_review: number
  not_approved: number
  closed: number
}

interface TooltipEntry {
  color?: string
  name?: string
  value?: number | string
  payload?: ChartDatum
}

const VISIBLE_STATUS_ORDER = ACC_DEFAULT_STATUS_ORDER.filter(
  (status) => status !== 'unknown' && status !== 'void',
)

function truncateLabel(value: string) {
  return value.length > 22 ? `${value.slice(0, 20)}...` : value
}

function getUserDisplayName(user?: ProjectUser) {
  return user?.name?.trim() || 'Usuario eliminado'
}

function emptyStatusCounts() {
  return {
    draft: 0,
    open: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    in_review: 0,
    not_approved: 0,
    closed: 0,
  }
}

export default function IssuesByAssignee({
  issues,
  users = [],
  activeStatuses,
  onToggleStatus,
}: Props) {
  const [localStatuses, setLocalStatuses] = useState<Set<(typeof ACC_DEFAULT_STATUS_ORDER)[number]>>(
    () => new Set(ACC_DEFAULT_STATUS_ORDER),
  )
  const userMap = new Map<string, ProjectUser>()
  for (const user of users) {
    const keys = [user.id, user.autodeskId, user.userId].filter(Boolean) as string[]
    for (const key of keys) {
      userMap.set(key, user)
    }
  }

  const enabledStatuses = activeStatuses ?? localStatuses
  const filteredIssues = issues.filter((issue) => enabledStatuses.has(getAccDefaultStatus(issue.status)))
  const assignedIssues = filteredIssues.filter((issue) => !!issue.assignedTo)

  function handleToggleStatus(status: (typeof ACC_DEFAULT_STATUS_ORDER)[number]) {
    if (onToggleStatus) {
      onToggleStatus(status)
      return
    }

    setLocalStatuses((current) => {
      const next = new Set(current)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }

  const grouped = assignedIssues.reduce<Record<string, ChartDatum>>((acc, issue) => {
    const userId = issue.assignedTo!
    const user = userMap.get(userId)
    const fullName = getUserDisplayName(user)

    if (!acc[userId]) {
      acc[userId] = {
        name: truncateLabel(fullName),
        fullName,
        userId,
        total: 0,
        ...emptyStatusCounts(),
      }
    }

    const status = getAccDefaultStatus(issue.status)
    if (status !== 'unknown' && status !== 'void') {
      acc[userId][status] += 1
      acc[userId].total += 1
    }
    return acc
  }, {})

  const data = Object.values(grouped).sort((a, b) => b.total - a.total)
  const chartHeight = Math.max(300, data.length * 42)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Issues Asignados por Usuario y Estado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {VISIBLE_STATUS_ORDER.map((status) => {
            const isActive = enabledStatuses.has(status)

            return (
              <button
                key={status}
                type="button"
                onClick={() => handleToggleStatus(status)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-2.5 py-1 text-left transition-colors',
                  onToggleStatus || !activeStatuses
                    ? 'cursor-pointer hover:bg-accent/60'
                    : 'cursor-default border-transparent px-0 py-0 hover:bg-transparent',
                  isActive ? 'border-border text-foreground' : 'border-border/60 text-muted-foreground',
                )}
                aria-pressed={isActive}
                title={
                  onToggleStatus
                    ? `${isActive ? 'Ocultar' : 'Mostrar'} ${getAccDefaultStatusLabel(status)}`
                    : undefined
                }
              >
                <span
                  className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full"
                  style={{ backgroundColor: getAccDefaultStatusColor(status) }}
                >
                  {!isActive && <X className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
                <span>{getAccDefaultStatusLabel(status)}</span>
              </button>
            )
          })}
        </div>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No hay issues asignados.
          </div>
        ) : (
          <div className="pr-2">
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null

                      const items = (payload as TooltipEntry[]).filter(
                        (entry) => Number(entry.value ?? 0) > 0,
                      )

                      if (items.length === 0) return null

                      const datum = items[0]?.payload

                      return (
                        <div
                          style={{
                            backgroundColor: 'var(--color-popover)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 10,
                            color: 'var(--color-popover-foreground)',
                            boxShadow: '0 4px 12px rgba(0,0,0,.15)',
                            padding: '10px 12px',
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>
                            {datum ? datum.fullName : 'Usuario'}
                          </div>
                          <div style={{ display: 'grid', gap: 4 }}>
                            {items.map((entry) => {
                              const numericValue = Number(entry.value ?? 0)
                              const total = datum?.total ?? 0
                              const pct = total > 0 ? ((numericValue / total) * 100).toFixed(1) : '0.0'

                              return (
                                <div
                                  key={String(entry.name)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    color: 'var(--color-popover-foreground)',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 9999,
                                      backgroundColor: entry.color,
                                      display: 'inline-block',
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span>{entry.name} : {numericValue} ({pct}%)</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }}
                    contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-popover-foreground)', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}
                    labelStyle={{ color: 'var(--color-popover-foreground)', fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: 'var(--color-popover-foreground)', padding: '2px 0' }}
                  />
                  {VISIBLE_STATUS_ORDER.map((status) => (
                    <Bar
                      key={status}
                      dataKey={status}
                      stackId="status"
                      name={getAccDefaultStatusLabel(status)}
                      fill={getAccDefaultStatusColor(status)}
                    >
                      {status === VISIBLE_STATUS_ORDER[VISIBLE_STATUS_ORDER.length - 1] && (
                        <LabelList
                          dataKey="total"
                          position="right"
                          offset={10}
                          className="fill-foreground"
                          fontSize={11}
                          formatter={(value: number) => `${value} ${value === 1 ? 'issue' : 'issues'}`}
                        />
                      )}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
