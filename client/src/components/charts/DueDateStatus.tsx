import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Issue } from '@/types/issue'
import { isOverdue } from '@/lib/dateHelpers'
import { groupByMonth } from '@/lib/dateHelpers'
import { isClosedIssueStatus } from '@/lib/issueStatus'

interface Props {
  issues: Issue[]
}

export default function DueDateStatus({ issues }: Props) {
  const buckets: Record<string, { overdue: number; onTime: number; noDueDate: number }> = {}

  issues.forEach((issue) => {
    const month = groupByMonth(issue.createdAt)
    if (!buckets[month]) {
      buckets[month] = { overdue: 0, onTime: 0, noDueDate: 0 }
    }
    if (!issue.dueDate) {
      buckets[month].noDueDate++
    } else if (isOverdue(issue.dueDate) && !isClosedIssueStatus(issue.status)) {
      buckets[month].overdue++
    } else {
      buckets[month].onTime++
    }
  })

  const data = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Estado de Fechas de Vencimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip cursor={false} contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-popover-foreground)', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }} labelStyle={{ color: 'var(--color-popover-foreground)', fontWeight: 600, marginBottom: 4 }} itemStyle={{ color: 'var(--color-popover-foreground)', padding: '2px 0' }} />
            <Legend iconType="circle" iconSize={10} />
            <Bar dataKey="overdue" name="Vencido" stackId="a" fill="#ef4444" />
            <Bar dataKey="onTime" name="A tiempo" stackId="a" fill="#22c55e" />
            <Bar dataKey="noDueDate" name="Sin fecha" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
