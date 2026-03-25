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
import type { RootCauseCategory } from '@/types/issue'

interface Props {
  issues: Issue[]
  rootCauses: RootCauseCategory[]
}

export default function IssuesByRootCause({ issues, rootCauses }: Props) {
  // Build a flat map of rootCauseId → title (both categories and individual root causes)
  const causeMap = new Map<string, string>()
  rootCauses.forEach((cat) => {
    causeMap.set(cat.id, cat.title)
    cat.rootCauses.forEach((rc) => causeMap.set(rc.id, rc.title))
  })

  // DEBUG: log to browser console so we can see what data we have
  console.log('[RootCause] categories received:', rootCauses)
  console.log('[RootCause] causeMap entries:', [...causeMap.entries()])
  const issueRootCauseIds = [...new Set(issues.map(i => i.rootCauseId).filter(Boolean))]
  console.log('[RootCause] unique rootCauseIds from issues:', issueRootCauseIds)
  console.log('[RootCause] unmatched IDs:', issueRootCauseIds.filter(id => !causeMap.has(id!)))

  const counts = issues.reduce<Record<string, number>>((acc, issue) => {
    if (!issue.rootCauseId) return acc
    const label = causeMap.get(issue.rootCauseId) ?? issue.rootCauseId
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})

  if (Object.keys(counts).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Issues por Causa Raíz</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Sin datos de causa raíz
        </CardContent>
      </Card>
    )
  }

  const data = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([name, value]) => ({ name, value }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Issues por Causa Raíz</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <Tooltip cursor={false} contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-popover-foreground)', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }} labelStyle={{ color: 'var(--color-popover-foreground)', fontWeight: 600, marginBottom: 4 }} itemStyle={{ color: 'var(--color-popover-foreground)', padding: '2px 0' }} />
            <Bar dataKey="value" name="Issues" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={`hsl(${30 + index * 15}, 75%, 52%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
