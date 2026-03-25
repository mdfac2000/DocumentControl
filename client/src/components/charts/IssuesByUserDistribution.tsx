import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Issue, ProjectUser } from '@/types/issue'

interface Props {
  issues: Issue[]
  users?: ProjectUser[]
}

interface ChartDatum {
  name: string
  fullName: string
  userId: string
  count: number
  percentage: number
}

function truncateLabel(value: string) {
  return value.length > 22 ? `${value.slice(0, 20)}...` : value
}

function getUserDisplayName(user?: ProjectUser) {
  return user?.name?.trim() || 'Usuario eliminado'
}

export default function IssuesByUserDistribution({ issues, users = [] }: Props) {
  const userMap = new Map<string, ProjectUser>()
  for (const user of users) {
    const keys = [user.id, user.autodeskId, user.userId].filter(Boolean) as string[]
    for (const key of keys) {
      userMap.set(key, user)
    }
  }

  const assignedIssues = issues.filter((issue) => !!issue.assignedTo)
  const unassignedCount = issues.length - assignedIssues.length
  const totalAssigned = assignedIssues.length

  const counts = assignedIssues.reduce<Record<string, number>>((acc, issue) => {
    const userId = issue.assignedTo!
    acc[userId] = (acc[userId] ?? 0) + 1
    return acc
  }, {})

  const data: ChartDatum[] = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([userId, count]) => {
      const user = userMap.get(userId)
      const fullName = getUserDisplayName(user)
      return {
        name: truncateLabel(fullName),
        fullName,
        userId,
        count,
        percentage: totalAssigned > 0 ? (count / totalAssigned) * 100 : 0,
      }
    })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Distribución por Usuario</CardTitle>
        <p className="text-xs text-muted-foreground">Sin asignar: {unassignedCount}</p>
      </CardHeader>
      <CardContent>
        {totalAssigned === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No hay issues asignados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip
                cursor={false}
                contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-popover-foreground)', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}
                labelStyle={{ color: 'var(--color-popover-foreground)', fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ color: 'var(--color-popover-foreground)', padding: '2px 0' }}
                formatter={(_value: number, _name, payload) => {
                  const datum = payload?.payload as ChartDatum | undefined
                  if (!datum) return ['0%', 'Sin datos']
                  return [
                    `${datum.percentage.toFixed(1)}% (${datum.count})`,
                    `${datum.fullName} (${datum.userId})`,
                  ]
                }}
              />
              <Bar dataKey="percentage" name="% asignado" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={index} fill={`hsl(${205 + index * 9}, 70%, 52%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
