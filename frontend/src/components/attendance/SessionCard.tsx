import { Trash2, Clock } from 'lucide-react'
import { StatusBadge } from '@/components/shared'
import { useAttendance } from '@/hooks'
import { type Session } from '@/types'

interface SessionCardProps {
  session: Session
  totalPlayers: number
  canDelete: boolean
  onOpen: () => void
  onDelete: () => void
}

/** Present count on the card = people who showed up (PRESENT + LATE). */
function usePresentCount(sessionId: number | undefined) {
  const { data: records = [] } = useAttendance(sessionId ?? 0)
  return records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length
}

export default function SessionCard({ session, totalPlayers, canDelete, onOpen, onDelete }: SessionCardProps) {
  const present = usePresentCount(session.id)

  const timeRange = session.startTime
    ? `${session.startTime}${session.endTime ? ` – ${session.endTime}` : ''}`
    : 'Time not set'

  return (
    <div className="relative bg-card border border-border rounded-lg overflow-hidden group">
      <button
        type="button"
        onClick={onOpen}
        className="w-full px-4 py-3 pr-12 text-left hover:bg-surface/60 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif font-semibold text-brand-900 truncate">{session.title}</span>
          <StatusBadge status={session.status} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeRange}
          </span>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {present}/{totalPlayers} Present
          </span>
        </div>
        {session.notes && (
          <p className="text-xs text-slate-500 mt-1 font-sans line-clamp-1">{session.notes}</p>
        )}
      </button>

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${session.title}`}
          className="absolute right-2 top-2 p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}