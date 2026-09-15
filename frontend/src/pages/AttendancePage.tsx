import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar'
import SessionCard from '@/components/attendance/SessionCard'
import AttendanceRegisterSheet from '@/components/attendance/AttendanceRegisterSheet'
import CustomSessionDialog from '@/components/attendance/CustomSessionDialog'
import {
  useSports,
  useMySports,
  useSessions,
  usePlayers,
  useDeleteSession,
  useAuth,
} from '@/hooks'
import { type Session } from '@/types'
import { CalendarDays, Plus, Trash2, Trophy, AlertTriangle } from 'lucide-react'
import { parseISOLocal, todayISOLocal } from '@/lib/date'

export default function AttendancePage() {
  const { role } = useAuth()
  const isCaptain = role === 'ROLE_CAPTAIN'

  const { data: allSports = [], isLoading: allSportsLoading } = useSports(!isCaptain)
  const { data: mySports = [], isLoading: mySportsLoading } = useMySports()

  const sports = isCaptain ? mySports : allSports
  const sportsLoading = isCaptain ? mySportsLoading : allSportsLoading

  const [selectedSportId, setSelectedSportId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(() => todayISOLocal())

  const [registerSession, setRegisterSession] = useState<Session | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; session: Session | null }>({
    open: false,
    session: null,
  })

  const lastAutoSportIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (sports.length > 0) {
      if (isCaptain) {
        // For captains, use the first sport from mySports as default
        if (selectedSportId !== mySports[0]?.id) {
          setSelectedSportId(mySports[0].id)
        }
        return
      }
      if (selectedSportId === null || !sports.some((s) => s.id === selectedSportId)) {
        const newId = sports[0].id
        if (newId !== lastAutoSportIdRef.current) {
          lastAutoSportIdRef.current = newId
          setSelectedSportId(newId)
        }
      }
    }
  }, [sports, mySports, isCaptain, selectedSportId]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentSport = sports.find((s) => s.id === selectedSportId)

  const { data: daySessions = [], isLoading: daySessionsLoading } = useSessions(selectedSportId ?? 0, {
    date: selectedDate,
  })
  const { data: players = [] } = usePlayers(selectedSportId ?? 0)

  const deleteSession = useDeleteSession()

  const changeSport = (id: number) => {
    setSelectedSportId(id)
    setRegisterSession(null)
  }

  const orderedSessions = useMemo(
    () =>
      [...daySessions].sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')),
    [daySessions]
  )

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parseISOLocal(selectedDate))

  const handleDelete = async () => {
    if (!deleteDialog.session) return
    try {
      await deleteSession.mutateAsync(deleteDialog.session.id)
      toast.success(`Session "${deleteDialog.session.title}" deleted.`)
      setDeleteDialog({ open: false, session: null })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete session.')
    }
  }

  if (sportsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded-md" />
          <div className="h-4 w-96 bg-muted/60 rounded-md" />
        </div>
        <LoadingSkeleton type="table" count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Heading & Program Selector Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card border border-border p-6 rounded-xl shadow-2xs">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Attendance Register
          </h1>
          <p className="text-muted-foreground text-sm font-sans">
            {isCaptain
              ? `Manage sessions & track roster attendance for ${currentSport?.name || 'your sport'}`
              : 'Select a program and date to manage athlete attendance records.'}
          </p>
        </div>

        {/* Sport Selection Surface */}
        <div className="min-w-[260px] max-w-sm space-y-1.5 bg-muted/30 p-3 rounded-lg border border-border">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Trophy className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            {isCaptain ? 'Assigned Discipline' : 'Active Discipline'}
          </Label>
          {isCaptain ? (
            <div className="font-display font-bold text-sm text-foreground bg-card px-3 py-2 rounded-md border border-border shadow-2xs">
              {currentSport?.name || 'Loading discipline…'}
            </div>
          ) : (
            <Select
              value={selectedSportId?.toString() ?? ''}
              onValueChange={(v) => changeSport(Number(v))}
            >
              <SelectTrigger className="font-sans font-medium bg-card text-foreground border-border shadow-2xs">
                <SelectValue placeholder={sports.length === 0 ? 'No sports assigned' : 'Choose a sport…'} />
              </SelectTrigger>
              <SelectContent>
                {sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id.toString()} className="font-medium">
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Main Grid: Calendar Column & Session Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Sticky Calendar Surface */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-2xs lg:sticky lg:top-20">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display font-bold text-base text-foreground">Program Calendar</h2>
          </div>
          {selectedSportId ? (
            <AttendanceCalendar
              sportId={selectedSportId}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          ) : (
            <p className="text-sm text-muted-foreground font-sans py-6 text-center">
              Select a sport to load the interactive calendar.
            </p>
          )}
        </div>

        {/* Selected Date Session List */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider block">
                Selected Schedule
              </span>
              <h2 className="font-display text-xl font-bold text-foreground mt-0.5">{dateLabel}</h2>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">
                {daySessionsLoading
                  ? 'Fetching daily roster sessions…'
                  : daySessions.length === 0
                    ? 'No training sessions configured for this date.'
                    : `${daySessions.length} session${daySessions.length === 1 ? '' : 's'} scheduled`}
              </p>
            </div>
            <Button
              onClick={() => setCustomOpen(true)}
              disabled={!selectedSportId}
              className="bg-brand-900 hover:bg-brand-800 text-white font-medium text-xs h-10 px-4 gap-2 rounded-lg shadow-2xs transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom Session</span>
            </Button>
          </div>

          {!selectedSportId ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
              <p className="text-muted-foreground font-sans text-sm font-medium">
                {isCaptain && sports.length === 0
                  ? 'No sports are currently assigned to your captain account.'
                  : 'Please select a sport program to inspect training schedules.'}
              </p>
            </div>
          ) : daySessionsLoading ? (
            <div className="bg-card border border-border rounded-xl p-6">
              <LoadingSkeleton type="table" count={3} />
            </div>
          ) : (
            <div className="space-y-3">
              {orderedSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  totalPlayers={players.length}
                  canDelete
                  onOpen={() => setRegisterSession(s)}
                  onDelete={() => setDeleteDialog({ open: true, session: s })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendance Register Sheet Container */}
      <AttendanceRegisterSheet
        session={registerSession}
        sportId={currentSport?.id ?? 0}
        onOpenChange={(open) => {
          if (!open) setRegisterSession(null)
        }}
      />

      {/* Custom Session Creation Dialog */}
      <CustomSessionDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        sportId={selectedSportId ?? 0}
        sportName={currentSport?.name}
        date={selectedDate}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-xl border-border bg-card">
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-display text-destructive font-bold text-lg flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Training Session?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Are you sure you want to remove <strong>{deleteDialog.session?.title}</strong>? All registered
              attendance logs and player check-ins for this session will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, session: null })}
              className="w-full sm:w-auto font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}