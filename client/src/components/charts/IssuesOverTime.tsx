import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Issue } from '@/types/issue'
import { groupByWeek } from '@/lib/dateHelpers'
import { isClosedIssueStatus } from '@/lib/issueStatus'
import { format, parseISO, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  issues: Issue[]
}

export default function IssuesOverTime({ issues }: Props) {
  const createdCounts = issues.reduce<Record<string, number>>((acc, issue) => {
    const week = groupByWeek(issue.createdAt)
    acc[week] = (acc[week] ?? 0) + 1
    return acc
  }, {})

  // For closed issues, use updatedAt as approximate close date
  const closedCounts = issues
    .filter((i) => isClosedIssueStatus(i.status))
    .reduce<Record<string, number>>((acc, issue) => {
      const week = groupByWeek(issue.updatedAt)
      acc[week] = (acc[week] ?? 0) + 1
      return acc
    }, {})

  // Merge all week keys and fill gaps
  const allKeys = new Set([...Object.keys(createdCounts), ...Object.keys(closedCounts)])
  const weeks = [...allKeys].sort()
  const filled: { week: string; label: string; tooltipLabel: string; created: number; closed: number }[] = []

  if (weeks.length > 0) {
    let current = parseISO(weeks[0])
    const end = parseISO(weeks[weeks.length - 1])
    while (current <= end) {
      const key = format(current, 'yyyy-MM-dd')
      filled.push({
        week: key,
        label: format(current, 'dd MMM yy', { locale: es }),
        tooltipLabel: format(current, 'dd MMM yyyy', { locale: es }),
        created: createdCounts[key] ?? 0,
        closed: closedCounts[key] ?? 0,
      })
      current = addDays(current, 7)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Issues Creados y Cerrados por Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={filled} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gradientCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradientClosed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              cursor={false}
              labelFormatter={(_label, payload) => {
                const datum = payload?.[0]?.payload as { tooltipLabel?: string } | undefined
                return `Semana del ${datum?.tooltipLabel ?? ''}`.trim()
              }}
              contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-popover-foreground)', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}
              labelStyle={{ color: 'var(--color-popover-foreground)', fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: 'var(--color-popover-foreground)', padding: '2px 0' }}
            />
            <Legend iconType="circle" iconSize={8} />
            <Area
              type="monotone"
              dataKey="created"
              name="Creados"
              stroke="#3b82f6"
              fill="url(#gradientCreated)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="closed"
              name="Cerrados"
              stroke="#22c55e"
              fill="url(#gradientClosed)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
