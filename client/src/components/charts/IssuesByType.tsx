import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Issue } from '@/types/issue'
import type { IssueType } from '@/types/issue'

interface Props {
  issues: Issue[]
  issueTypes: IssueType[]
}

export default function IssuesByType({ issues, issueTypes }: Props) {
  const typeMap = new Map(issueTypes.map((t) => [t.id, t.title]))

  const counts = issues.reduce<Record<string, number>>((acc, issue) => {
    const typeId = issue.issueTypeId
    if (!typeId) return acc
    const label = typeMap.get(typeId) ?? typeId
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})

  const data = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([name, value]) => ({ name, value }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Issues por Tipo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <Tooltip cursor={false} contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-popover-foreground)', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }} labelStyle={{ color: 'var(--color-popover-foreground)', fontWeight: 600, marginBottom: 4 }} itemStyle={{ color: 'var(--color-popover-foreground)', padding: '2px 0' }} />
            <Bar dataKey="value" name="Issues" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={`hsl(${210 + index * 15}, 70%, ${55 - index * 2}%)`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
