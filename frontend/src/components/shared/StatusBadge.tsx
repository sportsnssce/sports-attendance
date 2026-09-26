import { cn } from '@/lib/utils'
import { type AttendanceStatus } from '@/types/attendance'

interface StatusBadgeProps {
  status: AttendanceStatus | string
  className?: string
}

const statusColors: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-800 border-green-200',
  ABSENT: 'bg-red-100 text-red-800 border-red-200',
  LATE: 'bg-amber-100 text-amber-800 border-amber-200',
  EXCUSED: 'bg-blue-100 text-blue-800 border-blue-200',
}

const campStatusColors: Record<string, string> = {
  UPCOMING: 'bg-slate-100 text-slate-700 border-slate-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

const sessionStatusColors: Record<string, string> = {
  SCHEDULED: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_PROGRESS: 'bg-accent/10 text-accent border-accent/30',
  COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  HOLIDAY: 'bg-amber-100 text-amber-900 border-amber-300',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = String(status).toUpperCase()

  if (normalized in statusColors) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-mono',
          statusColors[normalized as AttendanceStatus],
          className
        )}
      >
        {normalized === 'LATE' ? 'Present(I)' : normalized}
      </span>
    )
  }

  if (normalized in campStatusColors) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-mono',
          campStatusColors[normalized],
          className
        )}
      >
        {normalized}
      </span>
    )
  }

  if (normalized in sessionStatusColors) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-mono',
          sessionStatusColors[normalized],
          className
        )}
      >
        {normalized}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-border bg-surface text-slate-600 font-mono',
        className
      )}
    >
      {normalized}
    </span>
  )
}
