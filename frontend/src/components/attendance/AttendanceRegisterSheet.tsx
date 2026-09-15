import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { usePlayers, useAttendance, useBulkSubmitAttendance } from '@/hooks'
import { type AttendanceStatus } from '@/types/attendance'
import { type Session } from '@/types'
import { CalendarClock, CheckCheck, RotateCcw, Save } from 'lucide-react'

const STATUS_OPTIONS: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-600 text-white border-emerald-700',
  ABSENT: 'bg-rose-600 text-white border-rose-700',
  LATE: 'bg-amber-500 text-white border-amber-600',
  EXCUSED: 'bg-indigo-600 text-white border-indigo-700',
}

const SUMMARY_STYLES: Record<AttendanceStatus, { label: string; cls: string }> = {
  PRESENT: { label: '✓ Present', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  LATE: { label: '⏱ Late', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  ABSENT: { label: '✕ Absent', cls: 'text-rose-700 bg-rose-50 border-rose-200' },
  EXCUSED: { label: '— Excused', cls: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
}

interface AttendanceRegisterSheetProps {
  session: Session | null
  sportId: number
  onOpenChange: (open: boolean) => void
}

/** Inner content, mounted only while a session is selected so all queries run with real ids. */
function RegisterBody({
  session,
  sportId,
  onClose,
}: {
  session: Session
  sportId: number
  onClose: () => void
}) {
  const { data: players = [], isLoading: playersLoading } = usePlayers(sportId)
  const { data: records = [], isLoading: attendanceLoading } = useAttendance(session.id)
  const bulkSubmit = useBulkSubmitAttendance(session.id)

  const [statuses, setStatuses] = useState<Map<number, AttendanceStatus>>(() => new Map())
  const [remarks, setRemarks] = useState<Record<number, string>>({})
  const initializedRef = useRef(false)

  const loaded = !playersLoading && !attendanceLoading

  // Seed statuses + remarks from the server exactly once per opened session. A re-fetch
  // later (e.g. cache invalidation) won't clobber edits the user is typing right now.
  useEffect(() => {
    if (!loaded || initializedRef.current) return
    const nextStatuses = new Map<number, AttendanceStatus>()
    const nextRemarks: Record<number, string> = {}
    for (const rec of records) {
      const pid = rec.playerId ?? rec.player?.id
      if (pid == null) continue
      nextStatuses.set(Number(pid), rec.status)
      if (rec.remarks) nextRemarks[Number(pid)] = rec.remarks
    }
    for (const p of players) {
      if (!nextStatuses.has(p.id)) nextStatuses.set(p.id, 'PRESENT')
    }
    setStatuses(nextStatuses)
    setRemarks(nextRemarks)
    initializedRef.current = true
  }, [loaded, records, players])

  const setStatus = (playerId: number, status: AttendanceStatus) => {
    setStatuses((prev) => {
      const next = new Map(prev)
      next.set(playerId, status)
      return next
    })
  }

  const markAll = (status: AttendanceStatus) => {
    setStatuses(() => {
      const next = new Map<number, AttendanceStatus>()
      for (const p of players) next.set(p.id, status)
      return next
    })
  }

  const summary = useMemo(() => {
    let present = 0
    let late = 0
    let absent = 0
    let excused = 0
    for (const st of statuses.values()) {
      if (st === 'PRESENT') present++
      else if (st === 'LATE') late++
      else if (st === 'ABSENT') absent++
      else if (st === 'EXCUSED') excused++
    }
    return { present, late, absent, excused }
  }, [statuses])

  const handleSave = async () => {
    const payloadRecords = players.map((p) => ({
      playerId: p.id,
      status: statuses.get(p.id) ?? 'PRESENT',
      remarks: remarks[p.id]?.trim() || '',
    }))
    try {
      await bulkSubmit.mutateAsync({ records: payloadRecords })
      toast.success('Attendance recorded successfully.')
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save attendance.')
    }
  }

  const timeRange = session.startTime
    ? `${session.startTime}${session.endTime ? ` – ${session.endTime}` : ''}`
    : 'Time not set'

  return (
    <SheetContent className="flex w-full max-w-xl flex-col gap-4">
      <SheetHeader className="text-left">
        <SheetTitle className="font-display">{session.title}</SheetTitle>
        <SheetDescription className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          {session.sessionDate} · {timeRange}
        </SheetDescription>
      </SheetHeader>

      {!loaded ? (
        <LoadingSkeleton type="table" count={5} />
      ) : players.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400 font-sans">
          No athletes are enrolled in this sport yet.
        </div>
      ) : (
        <>
          {/* Roster */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {players.map((p, i) => {
              const currentSt = statuses.get(p.id) ?? 'PRESENT'
              return (
                <div key={p.id} className={i > 0 ? 'border-t border-border/60 py-3' : 'py-3'}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display font-medium text-brand-900 truncate">{p.fullName}</div>
                      <div className="text-[11px] font-sans text-slate-500">
                        {p.position || 'Athlete'}
                        {p.jerseyNumber != null && ` · #${p.jerseyNumber}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {STATUS_OPTIONS.map((st) => {
                        const selected = currentSt === st
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatus(p.id, st)}
                            aria-pressed={selected}
                            className={`px-2 py-1 text-[10px] font-mono font-medium rounded border transition-all ${
                              selected ? STATUS_STYLES[st] : 'bg-surface text-slate-400 border-border hover:bg-surface/80 hover:text-slate-600'
                            }`}
                          >
                            {st}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <Input
                    value={remarks[p.id] ?? ''}
                    onChange={(e) =>
                      setRemarks((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    placeholder="Remarks (optional)"
                    className="h-7 mt-2 font-sans text-xs"
                  />
                </div>
              )
            })}
          </div>

          {/* Footer actions */}
          <div className="shrink-0 space-y-3 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              {STATUS_OPTIONS.map((st) => (
                <span key={st} className={`px-2 py-0.5 rounded border ${SUMMARY_STYLES[st].cls}`}>
                  {SUMMARY_STYLES[st].label} {summary[st.toLowerCase() as 'present' | 'late' | 'absent' | 'excused']}
                </span>
              ))}
              <span className="text-slate-500 ml-auto">{players.length} athletes</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => markAll('PRESENT')} className="font-sans text-xs h-7">
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark All Present
              </Button>
              <Button size="sm" variant="outline" type="button" onClick={() => markAll('ABSENT')} className="font-sans text-xs h-7">
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Mark All Absent
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                onClick={handleSave}
                disabled={bulkSubmit.isPending}
                className="bg-accent hover:bg-accent-light text-white font-sans text-xs h-7"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {bulkSubmit.isPending ? 'Saving…' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        </>
      )}
    </SheetContent>
  )
}

export default function AttendanceRegisterSheet({
  session,
  sportId,
  onOpenChange,
}: AttendanceRegisterSheetProps) {
  return (
    <Sheet open={session != null} onOpenChange={onOpenChange}>
      {session && sportId > 0 && <RegisterBody session={session} sportId={sportId} onClose={() => onOpenChange(false)} />}
    </Sheet>
  )
}