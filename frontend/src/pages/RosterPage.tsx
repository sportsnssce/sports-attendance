import { useMemo, useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { PlayerProfileSheet } from '@/components/shared/PlayerProfileSheet'
import { PromoteCaptainModal } from '@/components/shared/PromoteCaptainModal'
import { useSports, useMySports, usePlayers, useAllPlayers, useAddPlayer, useDeletePlayer, useUpdatePlayer, useAuth } from '@/hooks'
import { UserPlus, Trophy, Shield, Trash2, Pencil, Users, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { type Player } from '@/types'

export default function RosterPage() {
  const { role } = useAuth()
  const isCaptain = role === 'ROLE_CAPTAIN'

  const { data: allSports = [], isLoading: allSportsLoading } = useSports(!isCaptain)
  const { data: mySports = [], isLoading: mySportsLoading } = useMySports()

  const sports = isCaptain ? mySports : allSports
  const sportsLoading = isCaptain ? mySportsLoading : allSportsLoading

  const mySportIds = useMemo(() => new Set(mySports.map((s) => s.id)), [mySports])

  const [selectedSportId, setSelectedSportId] = useState<number | 'all' | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)
  const [deletePlayerDialog, setDeletePlayerDialog] = useState<{ open: boolean; player: Player | null }>({
    open: false,
    player: null,
  })
  const [editPlayerDialog, setEditPlayerDialog] = useState<{ open: boolean; player: Player | null }>({
    open: false,
    player: null,
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

  const [playerForm, setPlayerForm] = useState({
    fullName: '',
    jerseyNumber: '',
    position: '',
    phone: '',
    email: '',
    department: '',
    notes: '',
    sportIds: [] as number[],
  })

  useEffect(() => {
    if (selectedSportId === 'all') return
    if (sports.length > 0) {
      if (selectedSportId === null || !sports.some(s => s.id === selectedSportId)) {
        setSelectedSportId(sports[0].id)
      }
    }
  }, [sports, selectedSportId])

  const showAll = selectedSportId === 'all'
  const currentSport = showAll ? undefined : sports.find((s) => s.id === selectedSportId)
  const { data: sportPlayers = [], isLoading: sportPlayersLoading } = usePlayers(
    typeof selectedSportId === 'number' ? selectedSportId : 0
  )
  const { data: allPlayers = [], isLoading: allPlayersLoading } = useAllPlayers(showAll)
  const players = showAll ? allPlayers : sportPlayers
  const playersLoading = showAll ? allPlayersLoading : sportPlayersLoading
  const addPlayerMutation = useAddPlayer()
  const deletePlayerMutation = useDeletePlayer()
  const updatePlayerMutation = useUpdatePlayer()

  const [promoteOpen, setPromoteOpen] = useState(false)

  const canDeletePlayer = (player: Player) =>
    !isCaptain || (player.sports?.some((s) => mySportIds.has(s.id)) ?? false)

  const openAddPlayer = () => {
    setPlayerForm((prev) => ({
      ...prev,
      sportIds: typeof selectedSportId === 'number' ? [selectedSportId] : [],
    }))
    setAddPlayerOpen(true)
  }

  const togglePlayerSport = (sportId: number) => {
    setPlayerForm((prev) => ({
      ...prev,
      sportIds: prev.sportIds.includes(sportId)
        ? prev.sportIds.filter((id) => id !== sportId)
        : [...prev.sportIds, sportId],
    }))
  }

  const toggleEditPlayerSport = (sportId: number) => {
    setEditPlayerForm((prev) => ({
      ...prev,
      sportIds: prev.sportIds.includes(sportId)
        ? prev.sportIds.filter((id) => id !== sportId)
        : [...prev.sportIds, sportId],
    }))
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerForm.fullName.trim()) {
      toast.error('Please enter player full name.')
      return
    }
    if (playerForm.sportIds.length === 0) {
      toast.error('Select at least one sport program for the athlete.')
      return
    }
    try {
      await addPlayerMutation.mutateAsync({
        sportId: typeof selectedSportId === 'number' ? selectedSportId : null,
        data: {
          fullName: playerForm.fullName.trim(),
          jerseyNumber: playerForm.jerseyNumber ? Number(playerForm.jerseyNumber) : undefined,
          position: playerForm.position.trim(),
          phone: playerForm.phone.trim(),
          email: playerForm.email.trim(),
          department: playerForm.department.trim() || undefined,
          notes: playerForm.notes.trim(),
          active: true,
          sportIds: playerForm.sportIds,
        },
      })
      const sportNames = playerForm.sportIds
        .map((id) => sports.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      toast.success(
        sportNames
          ? `Player ${playerForm.fullName} registered for ${sportNames}.`
          : `Player ${playerForm.fullName} registered.`
      )
      setAddPlayerOpen(false)
      setPlayerForm({
        fullName: '',
        jerseyNumber: '',
        position: '',
        phone: '',
        email: '',
        department: '',
        notes: '',
        sportIds: [],
      })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add player.')
    }
  }

  const openEditPlayer = (player: Player) => {
    setEditPlayerDialog({ open: true, player })
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
  }

  const handleUpdatePlayer = async () => {
    const player = editPlayerDialog.player
    if (!player) return
    if (!editPlayerForm.fullName.trim()) {
      toast.error('Full name is required.')
      return
    }
    try {
      await updatePlayerMutation.mutateAsync({
        id: player.id,
        data: {
          fullName: editPlayerForm.fullName.trim(),
          dateOfBirth: editPlayerForm.dateOfBirth || undefined,
          jerseyNumber: editPlayerForm.jerseyNumber ? parseInt(editPlayerForm.jerseyNumber, 10) : undefined,
          position: editPlayerForm.position || undefined,
          phone: editPlayerForm.phone || undefined,
          email: editPlayerForm.email || undefined,
          department: editPlayerForm.department || undefined,
          notes: editPlayerForm.notes || undefined,
          sportIds: editPlayerForm.sportIds,
        },
      })
      toast.success(`Athlete ${editPlayerForm.fullName} updated.`)
      setEditPlayerDialog({ open: false, player: null })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update player.')
    }
  }

  const openPromoteModal = () => {
    if (!selectedPlayer || !currentSport) return
    setPromoteOpen(true)
  }

  const handleDeletePlayer = async () => {
    if (!deletePlayerDialog.player) return
    try {
      await deletePlayerMutation.mutateAsync(deletePlayerDialog.player.id)
      toast.success(`Athlete ${deletePlayerDialog.player.fullName} removed from roster.`)
      if (selectedPlayer?.id === deletePlayerDialog.player.id) {
        setSelectedPlayer(null)
      }
      setDeletePlayerDialog({ open: false, player: null })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove athlete.')
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
      {/* Top Banner & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl shadow-2xs">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Athletes & Roster Management
          </h1>
          <p className="text-muted-foreground text-sm font-sans">
            {isCaptain
              ? showAll
                ? 'Browse every athlete and add players from other programs to yours.'
                : `Manage roster details for ${currentSport?.name || 'your sport'}`
              : 'Browse, register, and update active athlete rosters across all disciplines.'}
          </p>
        </div>
        {selectedSportId && (
          <Button
            onClick={openAddPlayer}
            className="bg-brand-900 hover:bg-brand-800 text-white font-medium text-xs h-10 px-4 gap-2 rounded-lg shadow-2xs self-start sm:self-auto transition-all"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register Athlete</span>
          </Button>
        )}
      </div>

      {/* Program Selector & Quick Overview Bar */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-display text-sm font-bold text-foreground">
              {isCaptain ? 'Assigned Program:' : 'Select Program:'}
            </span>
          </div>

          <Select
            value={selectedSportId?.toString() ?? ''}
            onValueChange={(v) => {
              setSelectedSportId(v === 'all' ? 'all' : Number(v))
              setSelectedPlayer(null)
            }}
          >
            <SelectTrigger className="w-full sm:w-64 font-sans font-medium bg-card text-foreground border-border shadow-2xs">
              <SelectValue placeholder={sports.length === 0 ? 'No sports assigned' : 'Choose a sport…'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-medium">
                All Players
              </SelectItem>
              {sports.map((sport) => (
                <SelectItem key={sport.id} value={sport.id.toString()} className="font-medium">
                  {sport.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showAll ? (
          <div className="flex flex-wrap items-center gap-4 text-xs font-sans border-t md:border-t-0 pt-3 md:pt-0 border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>All Programs</span>
            </div>
            <span className="text-border hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4 text-amber-500" />
              <span>
                Total Athletes: <strong className="text-foreground">{players.length}</strong>
              </span>
            </div>
          </div>
        ) : currentSport && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-sans border-t md:border-t-0 pt-3 md:pt-0 border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Captains:{' '}
                <strong className="text-foreground">
                  {(currentSport.captains?.length ?? 0) > 0
                    ? currentSport.captains!.map((c) => c.fullName).join(', ')
                    : 'Unassigned'}
                </strong>
              </span>
            </div>
            <span className="text-border hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4 text-amber-500" />
              <span>
                Enrolled Athletes: <strong className="text-foreground">{players.length}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Players Data Surface */}
      <div className="bg-card border border-border rounded-xl shadow-2xs overflow-hidden">
        {playersLoading ? (
          <div className="p-6">
            <LoadingSkeleton type="table" count={5} />
          </div>
        ) : sports.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-sans text-sm font-medium">
              No sports currently assigned to your account.
            </p>
          </div>
        ) : players.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <Users className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-sans text-sm font-medium">
              No athletes registered for {currentSport?.name || 'any program'} yet.
            </p>
            <Button
              onClick={openAddPlayer}
              className="bg-brand-900 hover:bg-brand-800 text-white font-medium text-xs px-4"
            >
              Register First Athlete
            </Button>
          </div>
        ) : (
          <div className="p-0 sm:overflow-x-auto">
            <Table className="ledger-table w-full card-table">
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-border">
                  <TableHead className="w-16 font-display text-foreground font-semibold min-w-[50px]">#</TableHead>
                  <TableHead className="font-display text-foreground font-semibold min-w-[160px]">Athlete Name</TableHead>
                  <TableHead className="font-display text-foreground font-semibold min-w-[120px]">Position / Role</TableHead>
                  <TableHead className="font-display text-foreground font-semibold min-w-[140px]">Contact</TableHead>
                  <TableHead className="font-display text-foreground font-semibold min-w-[90px]">Status</TableHead>
                  <TableHead className="font-display text-foreground font-semibold text-right min-w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow
                    key={player.id}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <TableCell data-label="#" className="font-mono text-xs font-semibold text-foreground">
                      {player.jerseyNumber ? `#${player.jerseyNumber}` : '—'}
                    </TableCell>
                    <TableCell data-label="Athlete Name">
                      <div className="font-display font-bold text-foreground text-sm">{player.fullName}</div>
                      {player.notes && <div className="text-xs text-muted-foreground truncate max-w-xs">{player.notes}</div>}
                    </TableCell>
                    <TableCell data-label="Position" className="font-sans text-xs text-muted-foreground font-medium">
                      {player.position || '—'}
                    </TableCell>
                    <TableCell data-label="Contact" className="font-sans text-xs text-muted-foreground">
                      <div>{player.email || '—'}</div>
                      <div className="font-mono text-[11px] text-muted-foreground/80">{player.phone || '—'}</div>
                    </TableCell>
                    <TableCell data-label="Status">
                      <StatusBadge status={player.active !== false ? 'ACTIVE' : 'INACTIVE'} />
                    </TableCell>
                    <TableCell data-label="Actions">
                      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-8 text-foreground hover:bg-muted font-medium w-full sm:w-auto"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPlayer(player)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 sm:mr-1" />
                          <span>View Profile</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-8 text-muted-foreground hover:text-foreground hover:bg-muted p-2 w-full sm:w-auto"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditPlayer(player)
                          }}
                          title="Edit Athlete"
                        >
                          <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="sm:hidden">Edit</span>
                        </Button>
                        {canDeletePlayer(player) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-8 text-destructive hover:bg-destructive/10 p-2 w-full sm:w-auto"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletePlayerDialog({ open: true, player })
                            }}
                            title="Delete Athlete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Register Player Modal */}
      <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-xl border-border bg-card max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleAddPlayer}>
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-display font-bold text-lg flex items-center gap-2 text-foreground">
                <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Register Athlete
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Add athlete details to the roster. Discipline assignments can be configured now or edited later.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-1.5">
                <Label htmlFor="playerName" className="text-xs font-semibold text-foreground">Full Name *</Label>
                <Input
                  id="playerName"
                  placeholder="e.g. Alex Morgan"
                  value={playerForm.fullName}
                  onChange={(e) => setPlayerForm({ ...playerForm, fullName: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="jersey" className="text-xs font-semibold text-foreground">Jersey #</Label>
                  <Input
                    id="jersey"
                    type="number"
                    placeholder="e.g. 10"
                    value={playerForm.jerseyNumber}
                    onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="position" className="text-xs font-semibold text-foreground">Position / Role</Label>
                  <Input
                    id="position"
                    placeholder="e.g. Forward"
                    value={playerForm.position}
                    onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="playerDepartment" className="text-xs font-semibold text-foreground">Department / Squad</Label>
                  <Input
                    id="playerDepartment"
                    placeholder="e.g. Senior Men"
                    value={playerForm.department}
                    onChange={(e) => setPlayerForm({ ...playerForm, department: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="playerEmail" className="text-xs font-semibold text-foreground">Email</Label>
                  <Input
                    id="playerEmail"
                    type="email"
                    placeholder="alex@example.com"
                    value={playerForm.email}
                    onChange={(e) => setPlayerForm({ ...playerForm, email: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="playerPhone" className="text-xs font-semibold text-foreground">Phone</Label>
                  <Input
                    id="playerPhone"
                    placeholder="07xxxxxxxx"
                    value={playerForm.phone}
                    onChange={(e) => setPlayerForm({ ...playerForm, phone: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="playerNotes" className="text-xs font-semibold text-foreground">Notes / Medical</Label>
                  <Input
                    id="playerNotes"
                    placeholder="e.g. Left-footed"
                    value={playerForm.notes}
                    onChange={(e) => setPlayerForm({ ...playerForm, notes: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Program Assignment(s) *</Label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-border rounded-lg bg-muted/20">
                  {sports.map((sport) => {
                    const checked = playerForm.sportIds.includes(sport.id)
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
                          onChange={() => togglePlayerSport(sport.id)}
                          className="accent-emerald-600 h-3.5 w-3.5"
                        />
                        <span className="truncate">{sport.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setAddPlayerOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto bg-brand-900 hover:bg-brand-800 text-white font-medium">
                Register Athlete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Player Modal */}
      <Dialog open={editPlayerDialog.open} onOpenChange={(open) => {
        if (!open) setEditPlayerDialog({ open: false, player: null })
      }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-xl border-border bg-card max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleUpdatePlayer}>
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-display font-bold text-lg flex items-center gap-2 text-foreground">
                <Pencil className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Edit Athlete Roster
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Update credentials for <strong>{editPlayerDialog.player?.fullName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-1.5">
                <Label htmlFor="editRosterFullName" className="text-xs font-semibold text-foreground">Full Name *</Label>
                <Input
                  id="editRosterFullName"
                  value={editPlayerForm.fullName}
                  onChange={(e) => setEditPlayerForm({ ...editPlayerForm, fullName: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editRosterDob" className="text-xs font-semibold text-foreground">Date of Birth</Label>
                  <Input
                    id="editRosterDob"
                    type="date"
                    value={editPlayerForm.dateOfBirth}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, dateOfBirth: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editRosterJersey" className="text-xs font-semibold text-foreground">Jersey #</Label>
                  <Input
                    id="editRosterJersey"
                    value={editPlayerForm.jerseyNumber}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, jerseyNumber: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editRosterPosition" className="text-xs font-semibold text-foreground">Position</Label>
                  <Input
                    id="editRosterPosition"
                    value={editPlayerForm.position}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, position: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editRosterPhone" className="text-xs font-semibold text-foreground">Phone</Label>
                  <Input
                    id="editRosterPhone"
                    value={editPlayerForm.phone}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, phone: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editRosterDepartment" className="text-xs font-semibold text-foreground">Department / Team</Label>
                  <Input
                    id="editRosterDepartment"
                    value={editPlayerForm.department}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, department: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editRosterEmail" className="text-xs font-semibold text-foreground">Email</Label>
                  <Input
                    id="editRosterEmail"
                    type="email"
                    value={editPlayerForm.email}
                    onChange={(e) => setEditPlayerForm({ ...editPlayerForm, email: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Enrolled Program(s)</Label>
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
                <Label htmlFor="editRosterNotes" className="text-xs font-semibold text-foreground">Notes</Label>
                <Input
                  id="editRosterNotes"
                  value={editPlayerForm.notes}
                  onChange={(e) => setEditPlayerForm({ ...editPlayerForm, notes: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setEditPlayerDialog({ open: false, player: null })} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={updatePlayerMutation.isPending} className="w-full sm:w-auto bg-brand-900 hover:bg-brand-800 text-white font-medium">
                {updatePlayerMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deletePlayerDialog.open} onOpenChange={(open) => setDeletePlayerDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-xl border-border bg-card">
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-display text-destructive font-bold text-lg flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Remove Athlete from Roster?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Are you sure you want to delete <strong>{deletePlayerDialog.player?.fullName}</strong>? This action will permanently remove their attendance and roster record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setDeletePlayerDialog({ open: false, player: null })} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeletePlayer}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium"
            >
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Player Details Sheet */}
      <PlayerProfileSheet
        player={selectedPlayer}
        sportId={currentSport?.id ?? null}
        sportName={currentSport?.name}
        open={!!selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        showPromote={!showAll}
        canPromote={(currentSport?.captains?.length ?? 0) < 3}
        onPromote={openPromoteModal}
        onDeletePlayer={
          selectedPlayer && canDeletePlayer(selectedPlayer)
            ? () => setDeletePlayerDialog({ open: true, player: selectedPlayer })
            : undefined
        }
      />

      {/* Promote Captain Modal */}
      <PromoteCaptainModal
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        sport={currentSport ?? null}
        sportCaptains={currentSport?.captains ?? (currentSport?.captain ? [currentSport.captain] : [])}
        preselectedPlayer={selectedPlayer}
      />
    </div>
  )
}