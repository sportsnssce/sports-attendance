import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatCard } from '@/components/shared/StatCard'
import { useSports, useMySports, useCaptains, useAllSessions } from '@/hooks'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, ShieldCheck, Calendar, Activity, Sparkles, Inbox } from 'lucide-react'

export default function DashboardPage() {
  const { username, role } = useAuth()
  const isCaptain = role === 'ROLE_CAPTAIN'

  const { data: allSports = [], isLoading: allSportsLoading } = useSports(!isCaptain)
  const { data: mySports = [], isLoading: mySportsLoading } = useMySports()
  const { data: captains = [], isLoading: captainsLoading } = useCaptains(!isCaptain)
  const { data: sessions = [], isLoading: sessionsLoading } = useAllSessions()

  const sports = isCaptain ? mySports : allSports
  const sportsLoading = isCaptain ? mySportsLoading : allSportsLoading

  const mySportIds = useMemo(() => new Set(sports.map((s) => s.id)), [sports])

  const upcomingSessions = useMemo(() => {
    return [...sessions]
      .filter((s) => {
        const isMySport = isCaptain ? (s.sportId ? mySportIds.has(s.sportId) : false) : true
        return isMySport && (s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS')
      })
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
  }, [sessions, isCaptain, mySportIds])

  const totalSports = sports.length
  const totalCaptains = captains.length
  const activeSports = sports.filter((s) => s.active).length

  if (sportsLoading || captainsLoading || sessionsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded-md" />
          <div className="h-4 w-96 bg-muted/60 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <LoadingSkeleton key={i} type="stat" />
          ))}
        </div>
        <LoadingSkeleton type="table" count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl shadow-2xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Active Season</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Executive Overview
          </h1>
          <p className="text-muted-foreground text-sm font-sans">
            Welcome back, <span className="font-semibold text-foreground">{username}</span> — managing{' '}
            {isCaptain ? 'team performance' : 'campus athletic programs'}.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={isCaptain ? 'My Disciplines' : 'Sports Programs'}
          value={totalSports}
          sublabel={`${activeSports} active in roster`}
          icon={<Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        />
        <StatCard
          label="Team Captains"
          value={isCaptain ? 1 : totalCaptains}
          sublabel={isCaptain ? 'Assigned captain role' : 'Registered program leads'}
          icon={<ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        />
        <StatCard
          label="Upcoming Sessions"
          value={upcomingSessions.length}
          sublabel="Scheduled on calendar"
          icon={<Calendar className="h-5 w-5 text-amber-500" />}
        />
        <StatCard
          label="Active Disciplines"
          value={activeSports}
          sublabel="Ready for training"
          icon={<Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        />
      </div>

      {/* Upcoming Sessions Data Table */}
      <div className="bg-card border border-border rounded-xl shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-foreground tracking-tight">
              {isCaptain ? 'Your Scheduled Training Sessions' : 'Upcoming Training Sessions'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live updates of upcoming team practices and custom sessions
            </p>
          </div>
          <span className="font-mono text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md font-semibold border border-border">
            {upcomingSessions.length} Total
          </span>
        </div>

        <div className="p-0 sm:overflow-x-auto">
          {upcomingSessions.length === 0 ? (
            <div className="px-6 py-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Inbox className="h-6 w-6" />
              </div>
              <p className="text-muted-foreground font-sans text-sm font-medium">
                No upcoming training sessions scheduled.
              </p>
            </div>
          ) : (
            <Table className="ledger-table w-full card-table">
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-border">
                  <TableHead className="font-serif text-foreground font-semibold min-w-[200px]">Session Title</TableHead>
                  <TableHead className="font-serif text-foreground font-semibold min-w-[140px]">Sport Discipline</TableHead>
                  <TableHead className="font-serif text-foreground font-semibold min-w-[120px]">Date</TableHead>
                  <TableHead className="font-serif text-foreground font-semibold min-w-[140px]">Time</TableHead>
                  <TableHead className="font-serif text-foreground font-semibold min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingSessions.map((session) => (
                  <TableRow key={session.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell data-label="Session" className="font-serif font-semibold text-foreground">
                      {session.title}
                    </TableCell>
                    <TableCell data-label="Sport">
                      <span className="font-sans text-sm text-muted-foreground font-medium">
                        {session.sport?.name || 'General Sport'}
                      </span>
                    </TableCell>
                    <TableCell data-label="Date">
                      <span className="font-mono text-sm text-foreground">{session.sessionDate}</span>
                    </TableCell>
                    <TableCell data-label="Time">
                      <span className="font-mono text-sm text-muted-foreground">
                        {session.startTime || '—'} {session.endTime ? `– ${session.endTime}` : ''}
                      </span>
                    </TableCell>
                    <TableCell data-label="Status">
                      <StatusBadge status={session.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}