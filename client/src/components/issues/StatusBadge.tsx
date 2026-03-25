import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getIssueStatusGroup, getIssueStatusLabel } from '@/lib/issueStatus'
import type { IssueStatus } from '@/types/issue'

const GROUP_CLASS_NAMES = {
  draft: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  open: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  closed: 'bg-green-100 text-green-700 hover:bg-green-100',
  void: 'bg-gray-100 text-gray-500 hover:bg-gray-100',
  unknown: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-100',
} as const

interface StatusBadgeProps {
  status: IssueStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const group = getIssueStatusGroup(status)
  return (
    <Badge variant="outline" className={cn('text-xs font-medium border-0', GROUP_CLASS_NAMES[group])}>
      {getIssueStatusLabel(status)}
    </Badge>
  )
}
