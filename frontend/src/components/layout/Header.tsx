import { Menu, ShieldCheck, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/lib/constants'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { username, role } = useAuth()
  const isAdmin = role === ROLES.ADMIN

  return (
    <header className="sticky top-0 z-40 w-full bg-card/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 transition-colors">
<div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 md:hidden text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={onMenuClick}
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src="/nss_logo.png" alt="NSS Sports Camp" className="h-8 w-8 object-contain" />
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse hidden sm:block" />
            <span className="font-display text-foreground text-sm font-semibold tracking-tight">
              {isAdmin ? 'Administration Portal' : 'Captain Portal'}
            </span>
          </div>
        </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <span className="font-sans text-xs font-semibold text-foreground leading-none">
            {username}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground mt-0.5">
            {isAdmin ? 'System Admin' : 'Team Lead'}
          </span>
        </div>

        <div
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-1 rounded-full border transition-all',
            isAdmin
              ? 'bg-brand-900 text-white border-brand-800 shadow-xs'
              : 'bg-muted text-foreground border-border'
          )}
        >
          {isAdmin ? (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <UserCheck className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span>{isAdmin ? 'ADMIN' : 'CAPTAIN'}</span>
        </div>
      </div>
    </header>
  )
}