import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { PlayerProfileSheet } from '@/components/shared/PlayerProfileSheet'
import { PromoteCaptainModal } from '@/components/shared/PromoteCaptainModal'
import { toast } from 'sonner'
import {
  useSports,
  useCreateSport,
  useUpdateSport,
  useDeleteSport,
  useUpdatePlayer,
  useDemoteCaptain,
  usePlayers,
} from '@/hooks'
import { Plus, Trophy, Activity, Trash2, Pencil, Crown, Users, UserX, UserPlus, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { type Sport, type CaptainLite, type Player } from '@/types'

export default function AdminPage() {
  const [createSportOpen, setCreateSportOpen] = useState(false)
  const [deleteSportDialog, setDeleteSportDialog] = useState<{ open: boolean; sport: Sport | null }>({
    open: false,
    sport: null,
  })
  const [editSportDialog, setEditSportDialog] = useState<{ open: boolean; sport: Sport | null }>({
    open: false,
    sport: null,
  })
  const [editSportForm, setEditSportForm] = useState({ name: '', description: '', active: true })
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; sportId: number | null }>({
    open: false,
    sportId: null,
  })
  const [viewProfile, setViewProfile] = useState<{ player: Player; sportId: number; sportName: string } | null>(null)

  const [editPlayerDialog, setEditPlayerDialog] = useState<{ open: boolean; player: Player | null; sportId: number | null }>({
    open: false,
    player: null,
    sportId: null,
  })
  const [editPlayerForm, setEditPlayerForm] = useState({
    fullName: '',
    dateOfBirth: '',
    jerseyNumber: '',
    position: '',
    phone: '',
    email: '',
    department: '',
    notes: '',
    sportIds: [] as number[],
  })

  const [sportForm, setSportForm] = useState({
    name: '',
    description: '',
  })

  const [sportSearch, setSportSearch] = useState('')
  const [expandedSports, setExpandedSports] = useState<Set<number>>(new Set())

  const { data: sports = [], isLoading: sportsLoading } = useSports()

  const updatePlayer = useUpdatePlayer()
  const createSport = useCreateSport()
  const updateSport = useUpdateSport()
  const deleteSport = useDeleteSport()
  const demoteCaptain = useDemoteCaptain()

  const handleCreateSport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sportForm.name.trim()) {
      toast.error('Please enter sport name.')
      return
    }
    try {
      await createSport.mutateAsync({
        name: sportForm.name.trim(),
        description: sportForm.description.trim(),
        active: true,
      })
      toast.success(`Sport "${sportForm.name}" created successfully.`)
      setCreateSportOpen(false)
      setSportForm({ name: '', description: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create sport.')
    }
  }

  const openEditSport = (sport: Sport) => {
    setEditSportForm({ name: sport.name, description: sport.description ?? '', active: sport.active })
    setEditSportDialog({ open: true, sport })
  }

  const handleUpdateSport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editSportDialog.sport) return
    if (!editSportForm.name.trim()) {
      toast.error('Please enter sport name.')
      return
    }
    try {
      await updateSport.mutateAsync({
        id: editSportDialog.sport.id,
        data: {
          name: editSportForm.name.trim(),
          description: editSportForm.description.trim(),
          active: editSportForm.active,
        },
      })
      toast.success(`Sport "${editSportForm.name}" updated.`)
      setEditSportDialog({ open: false, sport: null })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update sport.')
    }
  }

  const handleDeleteSport = async () => {
    if (!deleteSportDialog.sport) return
    try {
      await deleteSport.mutateAsync(deleteSportDialog.sport.id)
      toast.success(`Sport "${deleteSportDialog.sport.name}" and its roster deleted.`)
      setDeleteSportDialog({ open: false, sport: null })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete sport.')
    }
  }

  const handleToggleActive = (sport: Sport) => {
    updateSport.mutate({ id: sport.id, data: { active: !sport.active } })
  }

  const handleDemotePlayer = async (sportId: number, player: Player) => {
    try {
      await demoteCaptain.mutateAsync({ sportId, playerId: player.id })
      toast.success(`"${player.fullName}" removed as captain.`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to demote player.')
    }
  }

  const openEditPlayer = (player: Player, sportId: number) => {
    setEditPlayerForm({
      fullName: player.fullName,
      dateOfBirth: player.dateOfBirth ?? '',
      jerseyNumber: player.jerseyNumber?.toString() ?? '',
      position: player.position ?? '',
      phone: player.phone ?? '',
      email: player.email ?? '',
      department: player.department ?? '',
      notes: player.notes ?? '',
      sportIds: player.sports?.map((s) => s.id) ?? (player.sportId ? [player.sportId] : []),
    })
    setEditPlayerDialog({ open: true, player, sportId })
  }

  const toggleEditPlayerSport = (sportId: number) => {
    setEditPlayerForm((prev) => ({
      ...prev,
      sportIds: prev.sportIds.includes(sportId)
        ? prev.sportIds.filter((id) => id !== sportId)
        : [...prev.sportIds, sportId],
    }))
  }

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPlayerDialog.player) return
    try {
      await updatePlayer.mutateAsync({
        id: editPlayerDialog.player.id,
        data: {
          fullName: editPlayerForm.fullName.trim(),
          dateOfBirth: editPlayerForm.dateOfBirth || undefined,
          jerseyNumber: editPlayerForm.jerseyNumber ? parseInt(editPlayerForm.jerseyNumber, 10) : undefined,
          position: editPlayerForm.position.trim() || undefined,
          phone: editPlayerForm.phone.trim() || undefined,
          email: editPlayerForm.email.trim() || undefined,
          department: editPlayerForm.department.trim() || undefined,
          notes: editPlayerForm.notes.trim() || undefined,
          sportIds: editPlayerForm.sportIds,
        },
      })
      toast.success(`Updated ${editPlayerDialog.player.fullName}.`)
      setEditPlayerDialog({ open: false, player: null, sportId: null })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update player.')
    }
  }

  const toggleExpandSport = (sportId: number) => {
    setExpandedSports((prev) => {
      const next = new Set(prev)
      if (next.has(sportId)) next.delete(sportId)
      else next.add(sportId)
      return next
    })
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

  const filteredSports = sports.filter(
    (s) =>
      s.name.toLowerCase().includes(sportSearch.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(sportSearch.toLowerCase()))
  )

  const assignSport = sports.find((s) => s.id === assignDialog.sportId) ?? null

  return (
    <div className="space-y-8">
      {/* Top Banner & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl shadow-2xs">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            System Administration
          </h1>
          <p className="text-muted-foreground text-sm font-sans">
            Configure athletic programs, allocate captains, and manage overall campus discipline rosters.
          </p>
        </div>
        <Button
          onClick={() => setCreateSportOpen(true)}
          className="bg-brand-900 hover:bg-brand-800 text-white font-medium text-xs h-10 px-4 gap-2 rounded-lg shadow-2xs transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Sport Program</span>
        </Button>
      </div>

      {/* Program Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sports programs…"
            value={sportSearch}
            onChange={(e) => setSportSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-muted/30 border-border"
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground font-semibold">
          Showing {filteredSports.length} of {sports.length} Programs
        </span>
      </div>

      {/* Sports Grid Workspace */}
      {filteredSports.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center space-y-3">
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-sans text-sm font-medium">
            {sportSearch ? 'No sports match your search filter.' : 'No sports programs configured yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSports.map((sport) => (
            <SportCard
              key={sport.id}
              sport={sport}
              sportCaptains={sport.captains ?? (sport.captain ? [sport.captain] : [])}
              expanded={expandedSports.has(sport.id)}
              onToggle={() => toggleExpandSport(sport.id)}
              onAssignCaptain={() => setAssignDialog({ open: true, sportId: sport.id })}
              onEditSport={() => openEditSport(sport)}
              onToggleActive={() => handleToggleActive(sport)}
              onDeleteSport={() => setDeleteSportDialog({ open: true, sport })}
              onEditPlayer={openEditPlayer}
              onViewProfile={(player) => setViewProfile({ player, sportId: sport.id, sportName: sport.name })}
              onDemote={(player) => handleDemotePlayer(sport.id, player)}
            />
          ))}
        </div>
      )}

      {/* Create Sport Modal */}
      <Dialog open={createSportOpen} onOpenChange={setCreateSportOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-xl border-border bg-card">
          <form onSubmit={handleCreateSport}>
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-serif font-bold text-lg flex items-center gap-2 text-foreground">
                <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Add Sport Program
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Create a new athletic discipline (e.g., Football, Track & Field, Cricket).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4">
              <div className="space-y-1.5">
                <Label htmlFor="sportName" className="text-xs font-semibold text-foreground">Sport Name *</Label>
                <Input
                  id="sportName"
                  placeholder="e.g. Athletics"
                  value={sportForm.name}
                  onChange={(e) => setSportForm({ ...sportForm, name: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sportDescription" className="text-xs font-semibold text-foreground">Description</Label>
                <Input
                  id="sportDescription"
                  placeholder="e.g. Track & field training program"
                  value={sportForm.description}
                  onChange={(e) => setSportForm({ ...sportForm, description: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateSportOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto bg-brand-900 hover:bg-brand-800 text-white font-medium">
                Create Program
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sport Modal */}
      <Dialog open={editSportDialog.open} onOpenChange={(open) => {
        if (!open) setEditSportDialog({ open: false, sport: null })
      }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-xl border-border bg-card">
          <form onSubmit={handleUpdateSport}>
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-serif font-bold text-lg flex items-center gap-2 text-foreground">
                <Pencil className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Edit Sport Program
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Update configuration details for <strong>{editSportDialog.sport?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4">
              <div className="space-y-1.5">
                <Label htmlFor="editSportName" className="text-xs font-semibold text-foreground">Sport Name *</Label>
                <Input
                  id="editSportName"
                  value={editSportForm.name}
                  onChange={(e) => setEditSportForm({ ...editSportForm, name: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editSportDescription" className="text-xs font-semibold text-foreground">Description</Label>
                <Input
                  id="editSportDescription"
                  value={editSportForm.description}
                  onChange={(e) => setEditSportForm({ ...editSportForm, description: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-b border-border">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Active Status</span>
                  <span className="text-[11px] text-muted-foreground">Allow active session scheduling</span>
                </div>
                <Switch
                  id="editSportActive"
                  checked={editSportForm.active}
                  onCheckedChange={(v) => setEditSportForm((prev) => ({ ...prev, active: v }))}
                />
              </div>
            </div>
            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setEditSportDialog({ open: false, sport: null })} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={updateSport.isPending} className="w-full sm:w-auto bg-brand-900 hover:bg-brand-800 text-white font-medium">
                {updateSport.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Sport Confirmation Modal */}
      <Dialog open={deleteSportDialog.open} onOpenChange={(open) => setDeleteSportDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-xl border-border bg-card">
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-serif text-destructive font-bold text-lg flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Sport Program?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Are you sure you want to delete <strong>{deleteSportDialog.sport?.name}</strong>? This action will permanently delete all associated athletes, training sessions, and attendance records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteSportDialog({ open: false, sport: null })} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteSport}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Modal */}
      <Dialog open={editPlayerDialog.open} onOpenChange={(open) => {
        if (!open) setEditPlayerDialog({ open: false, player: null, sportId: null })
      }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-xl border-border bg-card max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleUpdatePlayer}>
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-serif font-bold text-lg flex items-center gap-2 text-foreground">
                <Pencil className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Edit Athlete
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Update credentials for <strong>{editPlayerDialog.player?.fullName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-1.5">
                <Label htmlFor="editPlayerFullName" className="text-xs font-semibold text-foreground">Full Name *</Label>
                <Input
                  id="editPlayerFullName"
                  value={editPlayerForm.fullName}
                  onChange={(e) => setEditPlayerForm({ ...editPlayerForm, fullName: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editPlayerDob" className="text-xs font-semibold text-foreground">Date of Birth</Label>
                  <Input
                    id="editPlayerDob"
                    type="date"
                    value={editPlayerForm.dateOfBirth}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, dateOfBirth: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editPlayerJersey" className="text-xs font-semibold text-foreground">Jersey #</Label>
                  <Input
                    id="editPlayerJersey"
                    type="number"
                    value={editPlayerForm.jerseyNumber}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, jerseyNumber: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editPlayerPosition" className="text-xs font-semibold text-foreground">Position</Label>
                  <Input
                    id="editPlayerPosition"
                    value={editPlayerForm.position}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, position: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editPlayerPhone" className="text-xs font-semibold text-foreground">Phone</Label>
                  <Input
                    id="editPlayerPhone"
                    value={editPlayerForm.phone}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, phone: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editPlayerDepartment" className="text-xs font-semibold text-foreground">Department / Team</Label>
                  <Input
                    id="editPlayerDepartment"
                    value={editPlayerForm.department}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, department: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editPlayerEmail" className="text-xs font-semibold text-foreground">Email</Label>
                  <Input
                    id="editPlayerEmail"
                    type="email"
                    value={editPlayerForm.email}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, email: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Program Assignment(s)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-border rounded-lg bg-muted/20">
                  {sports.map((sport) => {
                    const checked = editPlayerForm.sportIds.includes(sport.id)
                    return (
                      <label
                        key={sport.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer text-xs font-medium transition-colors ${
                          checked ? 'border-emerald-500/50 bg-emerald-500/10 text-foreground' : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEditPlayerSport(sport.id)}
                          className="accent-emerald-600 h-3.5 w-3.5"
                        />
                        <span className="truncate">{sport.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPlayerNotes" className="text-xs font-semibold text-foreground">Notes</Label>
                <Input
                  id="editPlayerNotes"
                  value={editPlayerForm.notes}
                  onChange={(e) => setEditPlayerForm({ ...editPlayerForm, notes: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setEditPlayerDialog({ open: false, player: null, sportId: null })} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={updatePlayer.isPending} className="w-full sm:w-auto bg-brand-900 hover:bg-brand-800 text-white font-medium">
                {updatePlayer.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Captain Modal */}
      <PromoteCaptainModal
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog((prev) => ({ ...prev, open }))}
        sport={assignSport}
        sportCaptains={assignSport?.captains ?? (assignSport?.captain ? [assignSport.captain] : [])}
      />

      {/* Player Profile Sheet */}
      <PlayerProfileSheet
        player={viewProfile?.player ?? null}
        sportId={viewProfile?.sportId ?? null}
        sportName={viewProfile?.sportName}
        open={!!viewProfile}
        onOpenChange={(open) => !open && setViewProfile(null)}
      />
    </div>
  )
}

interface SportCardProps {
  sport: Sport
  sportCaptains: CaptainLite[]
  expanded: boolean
  onToggle: () => void
  onAssignCaptain: () => void
  onEditSport: () => void
  onToggleActive: () => void
  onDeleteSport: () => void
  onEditPlayer: (player: Player, sportId: number) => void
  onViewProfile: (player: Player) => void
  onDemote: (player: Player) => void
}

function SportCard({
  sport,
  sportCaptains,
  expanded,
  onToggle,
  onAssignCaptain,
  onEditSport,
  onToggleActive,
  onDeleteSport,
  onEditPlayer,
  onViewProfile,
  onDemote,
}: SportCardProps) {
  const { data: players = [], isLoading: playersLoading } = usePlayers(sport.id)
  const captainIds = new Set(sportCaptains.map((c) => c.id))
  const full = sportCaptains.length >= 3

  return (
    <Card className="border border-border shadow-2xs overflow-hidden transition-all duration-150">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">{sport.name}</h3>
                <StatusBadge status={sport.active ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              {sport.description && (
                <p className="text-xs font-sans text-muted-foreground line-clamp-1">{sport.description}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Crown className="h-3.5 w-3.5" />
                {sportCaptains.length}/3 Captains
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Users className="h-3.5 w-3.5" />
                {playersLoading ? '…' : players.length} Athletes
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                className="text-xs h-8 bg-brand-900 hover:bg-brand-800 text-white font-medium gap-1.5"
                disabled={full || playersLoading || players.length === 0}
                onClick={onAssignCaptain}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{full ? 'Captains Full' : 'Assign Captain'}</span>
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8 font-medium gap-1.5" onClick={onEditSport}>
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Program</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 font-medium text-muted-foreground hover:text-foreground"
                onClick={onToggleActive}
              >
                {sport.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 text-destructive hover:bg-destructive/10 p-2"
                onClick={onDeleteSport}
                title="Delete Sport"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 font-medium gap-1 border-border ml-auto"
              onClick={onToggle}
            >
              <span>{expanded ? 'Collapse Details' : 'View Roster'}</span>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Collapsible Roster & Captain Details */}
        {expanded && (
          <div className="mt-5 space-y-6 border-t border-border pt-5">
            {/* Captains Sub-Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  Program Captains ({sportCaptains.length}/3)
                </span>
                {!full && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2.5 font-medium"
                    onClick={onAssignCaptain}
                    disabled={playersLoading || players.length === 0}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Assign Captain
                  </Button>
                )}
              </div>

              {sportCaptains.length === 0 ? (
                <p className="text-xs text-muted-foreground font-sans italic py-2">No captains assigned yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {sportCaptains.map((cap) => (
                    <div
                      key={cap.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">{cap.fullName}</div>
                          {cap.email && <div className="text-[11px] font-mono text-muted-foreground truncate">{cap.email}</div>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 text-destructive hover:bg-destructive/10 p-1.5"
                        onClick={() => onDemote({ id: cap.id, fullName: cap.fullName, email: cap.email } as Player)}
                        title="Demote Captain"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrolled Athletes Sub-Section */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider block">
                Enrolled Roster ({players.length})
              </span>

              {playersLoading ? (
                <p className="text-xs text-muted-foreground font-sans">Loading athletes…</p>
              ) : players.length === 0 ? (
                <p className="text-xs text-muted-foreground font-sans italic py-2">No athletes enrolled yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {players.map((player) => {
                    const isCap = captainIds.has(player.id)
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isCap && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{player.fullName}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {player.jerseyNumber != null && <span className="mr-2">#{player.jerseyNumber}</span>}
                              {player.position ? player.position : 'Athlete'}
                              {player.department ? ` · ${player.department}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2 font-medium"
                            onClick={() => onViewProfile(player)}
                          >
                            Profile
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onEditPlayer(player, sport.id)}
                            title="Edit athlete details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}