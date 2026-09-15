import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePlayers, usePlayerProfile, usePromotePlayerToCaptain } from '@/hooks'
import { Crown, Search, ChevronRight, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { type Sport, type CaptainLite, type Player } from '@/types'

const MAX_CAPTAINS_PER_SPORT = 3

interface PromoteCaptainModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sport: Sport | null
  sportCaptains: CaptainLite[]
  /** Roster context: the player is already known — skip the picker and go to credentials. */
  preselectedPlayer?: Player | null
}

/**
 * The single credentialed promotion flow. Admin (or a sport's captain, scoped server-side)
 * picks an enrolled athlete, then provides explicit username + password that instantiate the
 * athlete's login account via POST /api/sports/{sportId}/players/{playerId}/promote-captain.
 */
export function PromoteCaptainModal({
  open,
  onOpenChange,
  sport,
  sportCaptains,
  preselectedPlayer,
}: PromoteCaptainModalProps) {
  const { data: players = [], isLoading: playersLoading } = usePlayers(sport?.id ?? 0)
  const promote = usePromotePlayerToCaptain()

  const [search, setSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Fresh session each open.
  const activePlayer = preselectedPlayer ?? selectedPlayer

  // Whether the chosen athlete already has a captain login account — drives
  // mandatory (new captain) vs optional (update existing) credential handling.
  const { data: profile, isLoading: profileLoading } = usePlayerProfile(activePlayer?.id ?? 0)
  const isExistingCaptain = !!activePlayer && profile?.hasCaptainLogin === true
  const isCheckingAccount = !!activePlayer && profileLoading
  const captainIds = useMemo(() => new Set(sportCaptains.map((c) => c.id)), [sportCaptains])
  const remaining = Math.max(0, MAX_CAPTAINS_PER_SPORT - sportCaptains.length)

  // Prefill the credentials section when a player is selected / profile finishes loading.
  useEffect(() => {
    if (!open) return
    if (!activePlayer) { setUsername(''); setPassword(''); return }
    if (profileLoading) return
    if (profile?.hasCaptainLogin && profile.captainUsername) {
      setUsername(profile.captainUsername)
    } else {
      setUsername('')
    }
    setPassword('')
  }, [open, activePlayer?.id, profile?.hasCaptainLogin, profile?.captainUsername, profileLoading])

  const filtered = players.filter((p) => {
    if (captainIds.has(p.id)) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.position && p.position.toLowerCase().includes(q))
    )
  })

  const handleClose = () => {
    setSelectedPlayer(null)
    setUsername('')
    setPassword('')
    setSearch('')
    onOpenChange(false)
  }

  const handlePromote = async () => {
    if (!sport || !activePlayer) {
      toast.error('Select an athlete to promote.')
      return
    }
    if (isCheckingAccount) {
      toast.error('Checking the athlete\'s account status… please wait.')
      return
    }
    if (!isExistingCaptain && !username.trim()) {
      toast.error('A username is required for a new captain account.')
      return
    }
    if (!isExistingCaptain && !password.trim()) {
      toast.error('A password is required for a new captain account.')
      return
    }
    try {
      await promote.mutateAsync({
        sportId: sport.id,
        playerId: activePlayer.id,
        username: username.trim() || undefined,
        password: password.trim() || undefined,
      })
      toast.success(
        isExistingCaptain
          ? `"${activePlayer.fullName}" captain account updated for ${sport.name}.`
          : `"${activePlayer.fullName}" promoted to captain of ${sport.name} with the username and password you set.`
      )
      handleClose()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to promote player.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-1rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Crown className="h-5 w-5 text-accent" />
            {activePlayer && !preselectedPlayer ? 'Assign Captain' : 'Promote to Captain'}
          </DialogTitle>
          <DialogDescription>
            Choose an enrolled athlete to captain {sport?.name || 'the sport'}. A login account is
            created from the credentials you provide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* Slots + current captains */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-sans text-slate-700">
              Captains for {sport?.name}
            </Label>
            <span className={`text-[11px] font-medium ${remaining > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {sportCaptains.length} / {MAX_CAPTAINS_PER_SPORT} · {remaining} slot{remaining !== 1 ? 's' : ''} left
            </span>
          </div>
          {sportCaptains.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sportCaptains.map((cap) => (
                <span
                  key={cap.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <Crown className="h-3 w-3 text-emerald-600" />
                  {cap.fullName}
                </span>
              ))}
            </div>
          )}

          {/* Picker — only when no preselected player */}
          {!preselectedPlayer && (
            <>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search enrolled athletes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-xs font-sans pl-8"
                />
              </div>
              {playersLoading ? (
                <p className="text-xs text-slate-400 font-sans">Loading players…</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  {players.length === 0
                    ? 'No athletes enrolled in this sport yet. Register athletes from the roster first.'
                    : 'No athletes match your search.'}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlayer(p)}
                      className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-sans transition-colors ${
                        selectedPlayer?.id === p.id
                          ? 'border-accent bg-accent/5'
                          : 'border-border bg-surface hover:bg-surface/60'
                      }`}
                    >
                      {p.jerseyNumber != null && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-accent text-white text-[10px] font-bold flex-shrink-0">
                          {p.jerseyNumber}
                        </span>
                      )}
                      <span className="flex-1 truncate text-slate-800 font-medium">{p.fullName}</span>
                      {p.position && <span className="text-[10px] text-slate-400">{p.position}</span>}
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Credentials step */}
          <div className="space-y-3 pt-1 border-t border-border">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm font-display font-semibold text-brand-900 truncate">
                  {activePlayer ? `Captain login for ${activePlayer.fullName}` : 'Captain credentials'}
                </span>
              </div>
              {activePlayer &&
                (isCheckingAccount ? (
                  <span className="text-[10px] text-slate-400 font-sans animate-pulse shrink-0">Checking account…</span>
                ) : isExistingCaptain ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    <UserCheck className="h-3 w-3" /> Account exists
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    New captain
                  </span>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label htmlFor="promoteUsername" className="text-xs font-sans text-slate-700">
                  {isExistingCaptain ? 'Username (optional)' : 'Username *'}
                </Label>
                <Input
                  id="promoteUsername"
                  placeholder={isExistingCaptain ? 'Leave blank to keep current' : 'e.g. captain_david'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-8 text-xs font-sans"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="promotePassword" className="text-xs font-sans text-slate-700">
                  {isExistingCaptain ? 'New Password (optional)' : 'New Captain Password *'}
                </Label>
                <Input
                  id="promotePassword"
                  type="password"
                  placeholder={isExistingCaptain ? 'Leave blank to keep current' : 'e.g. Captain@1234'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8 text-xs font-sans"
                />
                <p className="text-[11px] text-slate-400 font-sans">
                  {isExistingCaptain
                    ? 'Fields are optional — only entered values are applied.'
                    : 'Use a password the new captain can remember — their sign-in for this account.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePromote}
            disabled={!activePlayer || promote.isPending || isCheckingAccount || (!isExistingCaptain && (!username.trim() || !password.trim()))}
            className="bg-accent hover:bg-accent-light text-white font-sans text-xs"
          >
            {promote.isPending ? 'Saving…' : isExistingCaptain ? 'Update & Promote' : 'Promote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}