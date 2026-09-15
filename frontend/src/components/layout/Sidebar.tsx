import { Link, useLocation } from 'react-router-dom'
import { ROLES, type Role } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  UserRound,
  Trophy,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  requiredRole?: Role
}

interface SidebarProps {
  onNavigate?: () => void
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Roster', href: '/roster', icon: <Users className="h-4 w-4" /> },
  { label: 'Attendance', href: '/attendance', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'My Profile', href: '/profile', icon: <UserRound className="h-4 w-4" /> },
  { label: 'Admin', href: '/admin', icon: <Settings className="h-4 w-4" />, requiredRole: ROLES.ADMIN },
]

export function Sidebar({ onNavigate }: SidebarProps) {
  const { role, logout, username } = useAuth()
  const location = useLocation()

  const filteredItems = navItems.filter(
    (item) => !item.requiredRole || item.requiredRole === role
  )

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  return (
    <div className="w-full h-full bg-brand-900 text-slate-100 flex flex-col justify-between flex-shrink-0 select-none">
      {/* Upper Branding & Menu Section */}
      <div className="flex flex-col gap-6 p-4">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-2 py-3 border-b border-brand-800">
          <div className="h-9 w-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-serif font-bold text-base tracking-wide text-white leading-none">
              Sports Camp
            </h1>
            <span className="font-mono text-[11px] text-slate-400 mt-1 uppercase tracking-wider">
              Attendance HQ
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-brand-800 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-brand-800/60 hover:text-white'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-500 rounded-r-full" />
                )}
                <span
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Info & Sign Out Footer */}
      <div className="p-4 border-t border-brand-800/80 bg-brand-900/50">
        <div className="px-3 py-2.5 mb-2 rounded-md bg-brand-800/40 border border-brand-800/60 flex flex-col">
          <p className="font-sans text-white text-xs font-semibold truncate">
            {username}
          </p>
          <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            {role === ROLES.ADMIN ? 'Administrator' : 'Captain'}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/30 transition-all border border-transparent hover:border-rose-900/50"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}