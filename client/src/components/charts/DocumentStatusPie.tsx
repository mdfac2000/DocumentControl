import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PIE_COLORS = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#ca8a04',
  '#4f46e5',
]

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

function getStatusMeaning(status: string) {
  return STATUS_LABELS[status] ?? status
}

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
  title: string
  data: Array<{
    status: string
    value: number
  }>
  headerContent?: React.ReactNode
}

export default function DocumentStatusPie({ title, data, headerContent }: Props) {
  const chartData = data.map((entry, index) => ({
    status: entry.status,
    name: entry.status,
    value: entry.value,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }))

  const total = chartData.reduce((sum, entry) => sum + entry.value, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {headerContent}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No hay datos de Estatus para mostrar.
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={renderLabel}
                  labelLine={{ className: 'stroke-muted-foreground', strokeWidth: 1 }}
                  strokeWidth={2}
                  stroke="var(--color-card)"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    color: 'var(--color-popover-foreground)',
                    boxShadow: '0 4px 12px rgba(0,0,0,.15)',
                  }}
                  labelStyle={{
                    color: 'var(--color-popover-foreground)',
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                  itemStyle={{
                    color: 'var(--color-popover-foreground)',
                    padding: '2px 0',
                  }}
                  formatter={(value: number, name: string) => {
                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
                    return [`${value} (${pct}%)`, `${name} - ${getStatusMeaning(String(name))}`]
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid gap-2 sm:grid-cols-2">
              {chartData.map((entry) => (
                <div key={entry.status} className="flex items-start gap-2 text-xs">
                  <span
                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{entry.status}</p>
                    <p className="text-muted-foreground">{getStatusMeaning(entry.status)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
