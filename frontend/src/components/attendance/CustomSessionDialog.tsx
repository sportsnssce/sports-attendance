import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateSession } from '@/hooks'
import { CalendarPlus, Sun, Moon } from 'lucide-react'

interface CustomSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sport the session is created under. */
  sportId: number
  /** Sport name for the dialog title (optional). */
  sportName?: string
  /** Currently selected calendar date, prefilled as the session date. */
  date: string
}

interface FormState {
  title: string
  sessionDate: string
  startTime: string
  endTime: string
  notes: string
}

type Slot = 'Morning' | 'Evening'

const PRESETS: Record<Slot, { startTime: string; endTime: string }> = {
  Morning: { startTime: '07:00', endTime: '09:00' },
  Evening: { startTime: '16:30', endTime: '18:30' },
}

function buildInitialForm(date: string): FormState {
  return {
    title: `${date || new Date().toISOString().slice(0, 10)} - Morning Session`,
    sessionDate: date,
    startTime: PRESETS.Morning.startTime,
    endTime: PRESETS.Morning.endTime,
    notes: '',
  }
}

/**
 * Create a custom training session for a selected date. Provides Morning/Evening
 * quick-presets (same slots as the auto-generated defaults) but allows any title,
 * time range, and notes, so coaches can schedule extra or ad-hoc sessions.
 */
export default function CustomSessionDialog({
  open,
  onOpenChange,
  sportId,
  sportName,
  date,
}: CustomSessionDialogProps) {
  const createSession = useCreateSession()
  const [form, setForm] = useState<FormState>(() => buildInitialForm(date))
  const [submitting, setSubmitting] = useState(false)

  // Rebuild the form (fresh title/times for the selected date) whenever the dialog
  // is reopened or a different day is chosen.
  useEffect(() => {
    if (open) setForm(buildInitialForm(date))
  }, [open, date])

  const applyPreset = (slot: Slot) => {
    setForm((prev) => ({
      ...prev,
      title: `${prev.sessionDate} - ${slot} Session`,
      startTime: PRESETS[slot].startTime,
      endTime: PRESETS[slot].endTime,
    }))
  }

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return toast.error('Please enter a session title.')
    if (!form.sessionDate) return toast.error('Please pick a date.')
    if (!form.startTime || !form.endTime) return toast.error('Please set start and end times.')
    if (form.endTime <= form.startTime) return toast.error('End time must be after start time.')

    setSubmitting(true)
    try {
      await createSession.mutateAsync({
        sportId,
        data: {
          title,
          sessionDate: form.sessionDate,
          startTime: form.startTime,
          endTime: form.endTime,
          notes: form.notes.trim() || undefined,
        },
      })
      toast.success(`Session "${title}" scheduled.`)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create session.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-1rem)] max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-accent" />
              Add Custom Session{sportName ? ` · ${sportName}` : ''}
            </DialogTitle>
            <DialogDescription>
              Schedule an extra training session. Start from a Morning/Evening preset or define your own.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {/* 1. Quick presets */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => applyPreset('Morning')}
                className="flex flex-col items-start p-3 rounded-lg border border-border bg-surface hover:bg-surface/80 text-left transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span className="font-serif font-medium text-sm text-brand-900">Morning</span>
                </div>
                <span className="text-xs font-mono text-slate-500">07:00 AM – 09:00 AM</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('Evening')}
                className="flex flex-col items-start p-3 rounded-lg border border-border bg-surface hover:bg-surface/80 text-left transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  <span className="font-serif font-medium text-sm text-brand-900">Evening</span>
                </div>
                <span className="text-xs font-mono text-slate-500">04:30 PM – 06:30 PM</span>
              </button>
            </div>

            {/* 2. Title */}
            <div className="space-y-1.5">
              <Label htmlFor="cs-title" className="text-xs font-sans font-medium text-slate-700">
                Session Title *
              </Label>
              <Input
                id="cs-title"
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Extra Practice — Defence Drills"
                className="font-sans"
              />
            </div>

            {/* 3. Date */}
            <div className="space-y-1.5">
              <Label htmlFor="cs-date" className="text-xs font-sans font-medium text-slate-700">
                Training Date *
              </Label>
              <Input
                id="cs-date"
                type="date"
                value={form.sessionDate}
                onChange={(e) => set({ sessionDate: e.target.value })}
                className="font-sans"
              />
            </div>

            {/* 4. Time range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cs-start" className="text-xs font-sans font-medium text-slate-700">
                  Start Time *
                </Label>
                <Input
                  id="cs-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set({ startTime: e.target.value })}
                  className="font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-end" className="text-xs font-sans font-medium text-slate-700">
                  End Time *
                </Label>
                <Input
                  id="cs-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set({ endTime: e.target.value })}
                  className="font-sans"
                />
              </div>
            </div>

            {/* 5. Optional notes */}
            <div className="space-y-1">
              <Label htmlFor="cs-notes" className="text-xs font-sans text-slate-700">Optional Notes</Label>
              <Input
                id="cs-notes"
                placeholder="e.g. Bring running shoes"
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
                className="font-sans"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-accent hover:bg-accent-light text-white font-sans text-xs"
            >
              {submitting ? 'Scheduling…' : 'Schedule Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}