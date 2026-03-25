import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  description?: string
  variant?: 'default' | 'destructive' | 'warning' | 'success'
  isLoading?: boolean
}

export default function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
  isLoading = false,
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon
          className={cn(
            'size-4',
            variant === 'default' && 'text-muted-foreground',
            variant === 'destructive' && 'text-destructive',
            variant === 'warning' && 'text-yellow-500',
            variant === 'success' && 'text-green-600'
          )}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        ) : (
          <div
            className={cn(
              'text-2xl font-bold',
              variant === 'destructive' && 'text-destructive',
              variant === 'warning' && 'text-yellow-600',
              variant === 'success' && 'text-green-600'
            )}
          >
            {value}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
