import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Issue } from '@/types/issue'
import {
  ACC_DEFAULT_STATUS_ORDER,
  getAccDefaultStatus,
  getAccDefaultStatusColor,
  getAccDefaultStatusLabel,
} from '@/lib/issueStatus'

function renderLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  value,
  percent,
  name,
}: PieLabelRenderProps & { value: number; name: string }) {
  const RADIAN = Math.PI / 180
  const radius = Number(outerRadius) + 18
  const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN)
  const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN)
  const pct = ((percent ?? 0) * 100).toFixed(0)
  const anchor = x > Number(cx) ? 'start' : 'end'
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" className="fill-foreground">
      <tspan fontSize={12} fontWeight={600}>{name}</tspan>
      <tspan fontSize={11} dx={4}>{value} ({pct}%)</tspan>
    </text>
  )
}

interface Props {
  issues: Issue[]
}

export default function IssuesByStatus({ issues }: Props) {
  const counts = issues.reduce<Partial<Record<(typeof ACC_DEFAULT_STATUS_ORDER)[number], number>>>((acc, issue) => {
    const status = getAccDefaultStatus(issue.status)
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})

  const data = ACC_DEFAULT_STATUS_ORDER
    .map((status) => ({
      status,
      value: counts[status] ?? 0,
    }))
    .filter(({ value }) => value > 0)
    .map(({ status, value }) => ({
      name: getAccDefaultStatusLabel(status),
      value,
      color: getAccDefaultStatusColor(status),
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Issues por Estado</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={renderLabel}
              labelLine={{ className: 'stroke-muted-foreground', strokeWidth: 1 }}
              strokeWidth={2}
              stroke="var(--color-card)"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-popover-foreground)', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}
              labelStyle={{ color: 'var(--color-popover-foreground)', fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: 'var(--color-popover-foreground)', padding: '2px 0' }}
              formatter={(value: number, name: string) => {
                const total = data.reduce((s, d) => s + d.value, 0)
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
                return [`${value} (${pct}%)`, name]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
