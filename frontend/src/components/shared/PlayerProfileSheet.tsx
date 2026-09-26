import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { usePlayerProfile, usePlayerAttendance } from '@/hooks'
import { Crown, Trash2, Mail, Phone, FileText, User, Building2, Trophy, CalendarDays, Download } from 'lucide-react'
import { type Player } from '@/types'
import { type SportLite } from '@/types/sport'
import { DayButton, type DayButtonProps } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { parseISOLocal, toISOLocal } from '@/lib/date'
import { downloadCsv } from '@/lib/csv'

interface PlayerProfileSheetProps {
  player: Player | null
  sportId: number | null
  sportName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Roster/captain context only: render the "Promote to Captain" affordance. */
  showPromote?: boolean
  canPromote?: boolean
  onPromote?: () => void
  promotePending?: boolean
  onDeletePlayer?: () => void
}

/**
 * Shared player-details sheet used by RosterPage (captain context: promote + delete)
 * and AdminPage (admin context: read-only). Sport memberships and captaincy come from
 * GET /api/players/{id}/profile; contact/jersey/year/department/notes come from the player prop.
 */
export function PlayerProfileSheet({
  player,
  sportId,
  sportName,
  open,
  onOpenChange,
  showPromote = false,
  canPromote = false,
  onPromote,
  promotePending = false,
  onDeletePlayer,
}: PlayerProfileSheetProps) {
  if (!player) return null
  const age = player.dateOfBirth ? calculateAge(player.dateOfBirth) : null
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <SheetContent className="w-[85vw] sm:w-[400px] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-6 pt-6 pb-8 pr-1">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-surface border border-border flex items-center justify-center font-mono font-bold text-lg text-brand-900">
                  {player.jerseyNumber || <User className="h-5 w-5 text-slate-400" />}
                </div>
                <div>
                  <SheetTitle className="font-display text-xl font-bold text-brand-900">
                    {player.fullName}
                  </SheetTitle>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    {[player.year, player.department, sportName].filter(Boolean).join(' · ') || 'Athlete'}
                  </p>
                </div>
              </div>
              {onDeletePlayer && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 text-rose-600 hover:bg-rose-50 border-rose-200"
                  onClick={onDeletePlayer}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-4 text-sm font-sans">
            <div className="p-3 bg-surface rounded-lg border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{player.email || 'No email registered'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{player.phone || 'No phone registered'}</span>
              </div>
              {player.department && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>{player.department}</span>
                </div>
              )}
              {player.year && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  <span>{player.year}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                <span>Age: {age == null ? 'N/A' : `${age} years`}</span>
              </div>
              {player.notes && (
                <div className="flex items-start gap-2 text-xs text-slate-600 pt-1 border-t border-border">
                  <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                  <span>{player.notes}</span>
                </div>
              )}
            </div>

            <PlayerProfileCard
              playerId={player.id}
              sportId={sportId}
              showPromote={showPromote}
              canPromote={canPromote}
              onPromote={onPromote}
              promotePending={promotePending}
            />

            <PlayerAttendanceHistory playerId={player.id} playerName={player.fullName} sports={player.sports ?? []} defaultSportId={sportId} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PlayerProfileCard({
  playerId,
  sportId,
  showPromote,
  canPromote,
  onPromote,
  promotePending,
}: {
  playerId: number
  sportId: number | null
  showPromote: boolean
  canPromote: boolean
  onPromote?: () => void
  promotePending: boolean
}) {
  const { data: profile, isLoading } = usePlayerProfile(playerId)

  if (isLoading) {
    return <LoadingSkeleton type="card" count={1} />
  }

  if (!profile) return null

  const captainSports = profile.captainSports ?? []
  const alreadyCaptainHere = sportId != null && captainSports.some((s) => s.id === sportId)
  const canPromoteHere = showPromote && canPromote && sportId != null && !alreadyCaptainHere

  return (
    <div className="space-y-3 pt-1 border-t border-border">
      {profile.isCaptain ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <Crown className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium text-amber-800">
            👑 Captain of {captainSports.map((s) => s.name).join(', ') || 'a sport'}
          </span>
        </div>
      ) : (
        canPromoteHere &&
        onPromote && (
          <Button
            size="sm"
            onClick={onPromote}
            disabled={promotePending}
            className="bg-accent hover:bg-accent-light text-white font-sans text-xs h-7 gap-1.5"
          >
            <Crown className="h-3.5 w-3.5" />
            {promotePending ? 'Promoting…' : 'Promote to Captain'}
          </Button>
        )
      )}

      <div className="flex flex-wrap gap-1.5">
        {profile.sports.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20"
          >
            <Trophy className="h-3 w-3" />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function PlayerAttendanceHistory({
  playerId,
  playerName,
  sports,
  defaultSportId,
}: {
  playerId: number
  playerName: string
  sports: SportLite[]
  defaultSportId: number | null
}) {
  const { data: attendances = [], isLoading } = usePlayerAttendance(playerId)
  const [sportFilter, setSportFilter] = useState<number | 'all'>(defaultSportId ?? 'all')
  const filteredAttendances = useMemo(
    () => sportFilter === 'all'
      ? attendances
      : attendances.filter((record) => record.sportId === sportFilter),
    [attendances, sportFilter]
  )
  const latestDate = filteredAttendances[0]?.sessionDate
  const [selectedDate, setSelectedDate] = useState(() => toISOLocal(new Date()))

  useEffect(() => {
    if (latestDate) setSelectedDate(latestDate)
  }, [playerId, sportFilter, latestDate])

  useEffect(() => {
    setSportFilter(defaultSportId ?? 'all')
  }, [playerId, defaultSportId])

  const sessionsByDate = useMemo(() => {
    const byDate = new Map<string, typeof filteredAttendances>()
    for (const item of filteredAttendances) {
      if (!item.sessionDate) continue
      const dateRecords = byDate.get(item.sessionDate) ?? []
      dateRecords.push(item)
      byDate.set(item.sessionDate, dateRecords)
    }
    return byDate
  }, [filteredAttendances])

  const totals = useMemo(() => filteredAttendances.reduce(
    (counts, item) => {
      counts[item.status.toLowerCase() as 'present' | 'absent' | 'late' | 'excused'] += 1
      return counts
    },
    { present: 0, absent: 0, late: 0, excused: 0 },
  ), [filteredAttendances])

  const markedDays = sessionsByDate

  const DayButtonWithStatus = useMemo(() => {
    const styles: Record<string, string> = {
      PRESENT: 'bg-emerald-500',
      LATE: 'bg-amber-400',
      ABSENT: 'bg-rose-500',
      EXCUSED: 'bg-indigo-500',
    }
    return function AttendanceDayButton(props: DayButtonProps) {
      const { day, className, children, ...rest } = props
      const dayRecords = markedDays.get(day.isoDate) ?? []
      return (
        <DayButton
          day={day}
          className={cn(
            'relative isolate h-9 w-9 cursor-pointer p-0 pb-1 font-normal aria-selected:bg-accent aria-selected:text-white',
            className,
          )}
          {...rest}
        >
          <span>{children}</span>
          {dayRecords.length > 0 && (
            <span aria-hidden="true" className="pointer-events-none absolute bottom-0.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-px">
              {dayRecords.map((record) => (
                <span key={record.id} className={cn('h-1 w-1 rounded-full', styles[record.status])} />
              ))}
            </span>
          )}
        </DayButton>
      )
    }
  }, [markedDays])

  const selectedDayRecords = sessionsByDate.get(selectedDate) ?? []
  const total = filteredAttendances.length
  const attendanceRate = total === 0 ? 0 : Math.round(((totals.present + totals.late) / total) * 100)

  const exportHistory = () => {
    const sportLabel = sportFilter === 'all' ? 'all-sports' : (sports.find((sport) => sport.id === sportFilter)?.name ?? 'sport')
    downloadCsv(`player-${playerId}-${sportLabel}-attendance.csv`,
      ['Player', 'Sport', 'Session', 'Date', 'Status', 'Remarks', 'Marked at'],
      filteredAttendances.map((record) => [
        playerName,
        record.sportName,
        record.sessionTitle || `Session #${record.sessionId}`,
        record.sessionDate,
        record.status === 'LATE' ? 'Present(I)' : record.status,
        record.remarks,
        record.markedAt,
      ])
    )
  }

  if (isLoading) {
    return <LoadingSkeleton type="table" count={3} />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-semibold text-brand-900 text-sm">Attendance Calendar</h4>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={exportHistory} disabled={total === 0}>
          <Download className="mr-1 h-3 w-3" />CSV
        </Button>
      </div>

      {sports.length > 0 && (
        <Select value={String(sportFilter)} onValueChange={(value) => setSportFilter(value === 'all' ? 'all' : Number(value))}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filter by sport" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sports</SelectItem>
            {sports.map((sport) => <SelectItem key={sport.id} value={String(sport.id)}>{sport.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Present {totals.present}</span>
        <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">Present(I) {totals.late}</span>
        <span className="rounded bg-rose-50 px-2 py-1 text-rose-700">Absent {totals.absent}</span>
        <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">Excused {totals.excused}</span>
        <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">Total {total}</span>
        <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">{attendanceRate}% attendance</span>
      </div>

      {filteredAttendances.length === 0 ? (
        <p className="text-xs text-slate-400">No session attendance recorded yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-2">
            <Calendar
              mode="single"
              selected={parseISOLocal(selectedDate)}
              onSelect={(date?: Date) => date && setSelectedDate(toISOLocal(date))}
              month={parseISOLocal(selectedDate)}
              onMonthChange={(month) => setSelectedDate((current) => {
                const day = parseISOLocal(current).getDate()
                month.setDate(Math.min(day, new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()))
                return toISOLocal(month)
              })}
              components={{ DayButton: DayButtonWithStatus }}
              className="mx-auto"
            />
          </div>
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-brand-900">{parseISOLocal(selectedDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</h5>
            {selectedDayRecords.length === 0 ? (
              <p className="text-xs text-slate-400">No attendance recorded for this date.</p>
            ) : selectedDayRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-2 rounded border border-border px-2.5 py-2">
                <span className="min-w-0 truncate text-xs font-medium text-brand-900">{record.sessionTitle || `Session #${record.sessionId}`}</span>
                <StatusBadge status={record.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function calculateAge(dateOfBirth: string): number | null {
  const birthDate = new Date(`${dateOfBirth}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const beforeBirthday = today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  if (beforeBirthday) age--
  return age >= 0 ? age : null
}