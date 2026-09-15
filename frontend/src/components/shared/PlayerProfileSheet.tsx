import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { usePlayerProfile, usePlayerAttendance, usePlayerAttendanceSummary } from '@/hooks'
import { Crown, Trash2, Mail, Phone, FileText, User, Building2, Trophy } from 'lucide-react'
import { type Player } from '@/types'

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
 * GET /api/players/{id}/profile; contact/jersey/position/notes come from the player prop.
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
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <SheetContent className="w-[85vw] sm:w-[400px]">
        <div className="space-y-6 pt-6">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-surface border border-border flex items-center justify-center font-mono font-bold text-lg text-brand-900">
                  {player.jerseyNumber || <User className="h-5 w-5 text-slate-400" />}
                </div>
                <div>
                  <SheetTitle className="font-serif text-xl font-bold text-brand-900">
                    {player.fullName}
                  </SheetTitle>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    {player.position || 'Athlete'} · {sportName}
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

            <PlayerAttendanceHistory playerId={player.id} />
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

function PlayerAttendanceHistory({ playerId }: { playerId: number }) {
  const { data: attendances = [], isLoading } = usePlayerAttendance(playerId)
  const { data: summary } = usePlayerAttendanceSummary(playerId)

  if (isLoading) {
    return <LoadingSkeleton type="table" count={3} />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-serif font-semibold text-brand-900 text-sm">Attendance History</h4>
        <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {summary?.presentCount ?? 0} Sessions Present
        </span>
      </div>

      {attendances.length === 0 ? (
        <p className="text-xs text-slate-400">No session attendance recorded yet.</p>
      ) : (
        <div className="border border-border rounded overflow-hidden max-h-60 overflow-y-auto sm:overflow-x-auto">
          <Table className="ledger-table text-xs card-table">
            <TableHeader>
              <TableRow className="bg-surface">
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances.map((a) => (
                <TableRow key={a.id}>
                  <TableCell data-label="Session" className="font-medium text-brand-900">{`Session #${a.sessionId}`}</TableCell>
                  <TableCell data-label="Status"><StatusBadge status={a.status} /></TableCell>
                  <TableCell data-label="Date" className="font-mono text-slate-400">{a.markedAt ? new Date(a.markedAt).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}