import { Trash2, Clock, CalendarOff, Download } from 'lucide-react'
import { StatusBadge } from '@/components/shared'
import { type Session } from '@/types'

interface SessionCardProps {
  session: Session
  presentCount: number
  totalPlayers: number
  canDelete: boolean
  onOpen: () => void
  onDelete: () => void
  onToggleHoliday: () => void
  holidayPending: boolean
  onExportCsv?: () => void
  exportPending?: boolean
}

export default function SessionCard({ session, presentCount, totalPlayers, canDelete, onOpen, onDelete, onToggleHoliday, holidayPending, onExportCsv, exportPending }: SessionCardProps) {
  const isHoliday = session.status === 'HOLIDAY'

  const timeRange = session.startTime
    ? `${session.startTime}${session.endTime ? ` – ${session.endTime}` : ''}`
    : 'Time not set'

  return (
    <div className="relative bg-card border border-border rounded-lg overflow-hidden group">
      <button
        type="button"
        onClick={onOpen}
        disabled={isHoliday}
        aria-label={isHoliday ? `${session.title}, holiday; attendance is not recorded` : `Open attendance for ${session.title}`}
        className="w-full px-4 py-3 pr-28 text-left hover:bg-surface/60 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-semibold text-brand-900 truncate">{session.title}</span>
          <StatusBadge status={session.status} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeRange}
          </span>
          {!isHoliday && <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {presentCount}/{totalPlayers} Present
          </span>}
        </div>
        {isHoliday && <p className="mt-1 text-xs font-medium text-amber-800">No camp — excluded from attendance totals</p>}
        {session.notes && (
          <p className="text-xs text-slate-500 mt-1 font-sans line-clamp-1">{session.notes}</p>
        )}
      </button>

      <div className="absolute right-2 top-2 flex items-center gap-1">
        {onExportCsv && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onExportCsv() }}
            disabled={exportPending}
            aria-label={`Export attendance CSV for ${session.title}`}
            title="Export session attendance"
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
        {canDelete && (
          <>
            <button
              type="button"
              onClick={onToggleHoliday}
              disabled={holidayPending}
              aria-label={isHoliday ? `Restore ${session.title} from holiday` : `Mark ${session.title} as holiday`}
              title={isHoliday ? 'Restore session' : 'Mark no camp / holiday'}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
            >
              <CalendarOff className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${session.title}`}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}