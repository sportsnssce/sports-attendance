import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useMe, useUpdateMyProfile, useChangeMyPassword, useAllPlayers, usePlayerProfile, useUpdatePlayer } from '@/hooks'
import { UserCircle, KeyRound, Crown, Trophy, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { data: me, isLoading: meLoading } = useMe()
  const updateProfile = useUpdateMyProfile()
  const changePassword = useChangeMyPassword()
  const updatePlayerMutation = useUpdatePlayer()
  const { data: allPlayers = [], isLoading: playersLoading } = useAllPlayers()

  // Link the signed-in account to its Player record via the shared email field so both
  // roles can show enrolled sports + captaincy (captain resets stay on the player row).
  const myPlayer = useMemo(
    () =>
      me?.email
        ? allPlayers.find((p) => p.email?.toLowerCase() === me.email!.toLowerCase()) ?? null
        : null,
    [allPlayers, me]
  )
  const { data: myProfile } = usePlayerProfile(myPlayer?.id ?? 0)

  const isAdmin = me?.role === 'ROLE_ADMIN'

  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', phone: '', department: '' })
  const [initialized, setInitialized] = useState(false)

  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Populate the form from the loaded profile once.
  if (!initialized && me) {
    setProfileForm({
      fullName: me.fullName || '',
      email: me.email || '',
      phone: me.phone || '',
      department: myPlayer?.department ?? '',
    })
    setInitialized(true)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.fullName.trim()) {
      toast.error('Full name is required.')
      return
    }
    try {
      await updateProfile.mutateAsync({
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      })
      // Department lives on the linked player record, not the user account.
      if (myPlayer && profileForm.department.trim() !== (myPlayer.department ?? '')) {
        await updatePlayerMutation.mutateAsync({
          id: myPlayer.id,
          data: { department: profileForm.department.trim() || undefined },
        })
      }
      toast.success('Profile updated successfully.')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passForm.currentPassword) {
      toast.error('Enter your current password.')
      return
    }
    if (!passForm.newPassword) {
      toast.error('Enter a new password.')
      return
    }
    if (passForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('New password and confirmation do not match.')
      return
    }
    try {
      await changePassword.mutateAsync({
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      })
      // Refresh the stored Basic-auth token so the session isn't dropped.
      const raw = sessionStorage.getItem('auth')
      if (raw) {
        try {
          const stored = JSON.parse(raw)
          stored.token = `Basic ${btoa(`${me?.username}:${passForm.newPassword}`)}`
          sessionStorage.setItem('auth', JSON.stringify(stored))
        } catch {
          /* ignore corrupted session */
        }
      }
      toast.success('Password changed successfully.')
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password.')
    }
  }

  if (meLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-900">My Profile</h1>
          <p className="text-slate-500 text-sm font-sans mt-1">Your account details and security</p>
        </div>
        <LoadingSkeleton type="table" count={4} />
      </div>
    )
  }

  const sports = myProfile?.sports ?? me?.sports ?? []
  const captainName =
    (myProfile?.captainSports ?? []).map((s) => s.name).join(', ') || me?.sports?.[0]?.name

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-brand-900">My Profile</h1>
        <p className="text-slate-500 text-sm font-sans mt-1">
          <span className="font-medium text-brand-800">{me?.username}</span> ·{' '}
          {me?.role === 'ROLE_ADMIN' ? 'Administrator' : 'Captain'}
        </p>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Account details (editable for admins) */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg font-semibold text-brand-900 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-accent" />
                Account Details
              </CardTitle>
              <CardDescription className="font-sans text-xs text-slate-500">
                Username is your sign-in; update name, email, phone and department below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-sans text-slate-700">Username</Label>
                  <div className="h-8 px-3 py-1.5 rounded-md bg-surface border border-border font-mono text-xs text-slate-500">
                    {me?.username}
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">Used to sign in — not editable.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="profileName" className="text-xs font-sans text-slate-700">Full Name *</Label>
                  <Input
                    id="profileName"
                    placeholder="e.g. Alex Morgan"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="profileEmail" className="text-xs font-sans text-slate-700">Email</Label>
                  <Input
                    id="profileEmail"
                    type="email"
                    placeholder="alex@example.com"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="profilePhone" className="text-xs font-sans text-slate-700">Phone</Label>
                  <Input
                    id="profilePhone"
                    placeholder="07xxxxxxxx"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="profileDepartment" className="text-xs font-sans text-slate-700">Department / Team</Label>
                  <Input
                    id="profileDepartment"
                    placeholder="e.g. U-15, Senior Men"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  />
                  {!myPlayer && (
                    <p className="text-[11px] text-slate-400 font-sans">
                      No athlete record linked to this account — department is stored on the linked player.
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || updatePlayerMutation.isPending}
                  className="bg-accent hover:bg-accent-light text-white font-sans text-xs"
                >
                  {updateProfile.isPending || updatePlayerMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Program enrollments */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg font-semibold text-brand-900 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  My Program Enrollments
                </CardTitle>
                <CardDescription className="font-sans text-xs text-slate-500">
                  Sports linked to your athlete record.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {myProfile?.isCaptain && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium text-amber-800">
                      👑 Captain of {captainName ?? 'a sport'}
                    </span>
                  </div>
                )}
                {sports.length === 0 ? (
                  <p className="text-xs text-slate-400 font-sans">
                    {playersLoading ? 'Loading…' : 'No sports enrolled for this account.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {sports.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20"
                      >
                        <Trophy className="h-3 w-3" />
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Change password */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg font-semibold text-brand-900 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-accent" />
                  Change Password
                </CardTitle>
                <CardDescription className="font-sans text-xs text-slate-500">
                  Verify your current password, then set a new one (min 6 characters).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="currentPassword" className="text-xs font-sans text-slate-700">Current Password *</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="••••••••"
                      value={passForm.currentPassword}
                      onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newPassword" className="text-xs font-sans text-slate-700">New Password *</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Min 6 characters"
                      value={passForm.newPassword}
                      onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-xs font-sans text-slate-700">Confirm New Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat new password"
                      value={passForm.confirmPassword}
                      onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={changePassword.isPending}
                    variant="outline"
                    className="font-sans text-xs"
                  >
                    {changePassword.isPending ? 'Updating…' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* CAPTAIN — read-only view */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg font-semibold text-brand-900 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-accent" />
                Player Details
              </CardTitle>
              <CardDescription className="font-sans text-xs text-slate-500">
                Your athlete record and captaincy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {myProfile?.isCaptain && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-800">
                    👑 Captain of {captainName ?? 'a sport'}
                  </span>
                </div>
              )}
              <dl className="space-y-3 text-sm font-sans">
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-slate-500 text-xs">Full Name</dt>
                  <dd className="text-xs font-medium text-brand-900">{myPlayer?.fullName ?? me?.fullName ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-slate-500 text-xs">Username</dt>
                  <dd className="text-xs font-mono text-brand-900">{me?.username}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-slate-500 text-xs">Email</dt>
                  <dd className="text-xs text-brand-900 break-all">{myPlayer?.email ?? me?.email ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-slate-500 text-xs">Phone</dt>
                  <dd className="text-xs font-mono text-brand-900">{myPlayer?.phone ?? me?.phone ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-slate-500 text-xs">Department / Team</dt>
                  <dd className="text-xs text-brand-900">{myPlayer?.department ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-slate-500 text-xs">Jersey Number</dt>
                  <dd className="text-xs font-mono text-brand-900">{myPlayer?.jerseyNumber ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-slate-500 text-xs">Position</dt>
                  <dd className="text-xs text-brand-900">{myPlayer?.position ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 text-xs">Notes</dt>
                  <dd className="text-xs text-brand-900 whitespace-pre-wrap">{myPlayer?.notes || '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg font-semibold text-brand-900 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" />
                Enrolled Sports
              </CardTitle>
              <CardDescription className="font-sans text-xs text-slate-500">
                The sports you participate in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sports.length === 0 ? (
                <p className="text-xs text-slate-400 font-sans">
                  {playersLoading ? 'Loading…' : 'No sports enrolled yet.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {sports.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20"
                    >
                      <Trophy className="h-3 w-3" />
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}