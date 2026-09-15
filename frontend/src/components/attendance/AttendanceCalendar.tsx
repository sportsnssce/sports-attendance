import { useMemo, useState, useEffect } from 'react'
import { DayButton, type DayButtonProps } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { useSessions } from '@/hooks'
import { cn } from '@/lib/utils'
import { monthRange, parseISOLocal, toISOLocal } from '@/lib/date'
import { CalendarDays, Sparkles } from 'lucide-react'

interface AttendanceCalendarProps {
  sportId: number
  selectedDate: string
  onSelectDate: (iso: string) => void
}

/** Day cell with a glowing dot when sessions exist, plus hover ring. */
function makeSessionDayButton(sessionDates: Set<string>) {
  return function SessionDayButton(props: DayButtonProps) {
    const { day, className, children, ...rest } = props
    const hasSessions = sessionDates.has(day.isoDate)
    return (
      <DayButton
        day={day}
        className={cn(
          'relative h-9 w-9 p-0 font-normal aria-selected:opacity-100',
          hasSessions && 'after:absolute after:bottom-0.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-accent after:shadow-[0_0_6px_theme(colors.accent)]',
          className,
        )}
        {...rest}
      >
        {children}
      </DayButton>
    )
  }
}

export default function AttendanceCalendar({ sportId, selectedDate, onSelectDate }: AttendanceCalendarProps) {
  const [viewMonth, setViewMonth] = useState<Date>(() => parseISOLocal(selectedDate))

  useEffect(() => {
    const selectedMonth = `${parseISOLocal(selectedDate).getFullYear()}-${parseISOLocal(selectedDate).getMonth()}`
    const viewMonthId = `${viewMonth.getFullYear()}-${viewMonth.getMonth()}`
    if (selectedMonth !== viewMonthId) {
      setViewMonth(parseISOLocal(selectedDate))
    }
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const { from, to } = useMemo(() => monthRange(viewMonth), [viewMonth])
  const { data: monthSessions = [] } = useSessions(sportId, { from, to })

  const sessionDates = useMemo(() => new Set(monthSessions.map((s) => s.sessionDate)), [monthSessions])
  const SessionDayButton = useMemo(() => makeSessionDayButton(sessionDates), [sessionDates])

  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(viewMonth)
  const sessionCount = monthSessions.length

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent" />
          <span className="font-display text-sm font-semibold text-brand-900">{monthLabel}</span>
        </div>
        {sessionCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            <Sparkles className="h-3 w-3" />
            {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <Calendar
        mode="single"
        selected={parseISOLocal(selectedDate)}
        onSelect={(d?: Date) => {
          if (d) onSelectDate(toISOLocal(d))
        }}
        month={viewMonth}
        onMonthChange={setViewMonth}
        components={{ DayButton: SessionDayButton }}
      />
    </div>
  )
}