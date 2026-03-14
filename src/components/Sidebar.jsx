import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/',              label: 'Dashboard',    icon: 'dashboard' },
  { to: '/players',       label: 'Spieler',      icon: 'group' },
  { to: '/training',      label: 'Training',     icon: 'fitness_center' },
  { to: '/matches',       label: 'Spieltage',    icon: 'sports_soccer' },
  { to: '/lineup',        label: 'Aufstellung',  icon: 'view_kanban' },
  { to: '/availability',  label: 'Verfügbarkeit',icon: 'event_available' },
  { to: '/injuries',      label: 'Verletzungen', icon: 'healing' },
  { to: '/stats',         label: 'Statistiken',  icon: 'bar_chart' },
  { to: '/admin',         label: 'Admin',        icon: 'admin_panel_settings', adminOnly: true },
]

// Bottom nav shows first 5 items (most used)
const bottomNavItems = navItems.filter(i => !i.adminOnly).slice(0, 5)

function NavItem({ to, label, icon, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ripple ${
          isActive
            ? 'bg-md-secondary-container text-md-on-primary-container'
            : 'text-md-on-surface-variant hover:bg-md-on-surface/4'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`material-symbols-outlined icon-sm ${isActive ? 'icon-filled' : ''}`}>{icon}</span>
          {label}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, role, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const visibleNav = navItems.filter(item => !item.adminOnly || role === 'head_coach')

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 min-h-screen bg-white border-r border-md-outline-variant flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-md-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--md-primary)' }}>
              <span className="material-symbols-outlined icon-filled text-white" style={{ fontSize: 18 }}>sports_soccer</span>
            </div>
            <div>
              <p className="text-sm font-medium text-md-on-surface leading-tight">Coach App</p>
              <p className="text-xs text-md-on-surface-variant capitalize">{role?.replace('_', ' ') ?? 'Trainer'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-md-outline-variant">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--md-secondary-container)' }}>
              <span className="text-xs font-medium uppercase" style={{ color: 'var(--md-on-primary-container)' }}>
                {user?.email?.charAt(0)}
              </span>
            </div>
            <p className="text-xs text-md-on-surface-variant truncate flex-1">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="btn-text w-full justify-start text-md-on-surface-variant py-1.5 px-2"
            style={{ fontSize: 13 }}
          >
            <span className="material-symbols-outlined icon-sm">logout</span>
            Abmelden
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-md-outline-variant flex items-center px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--md-primary)' }}>
            <span className="material-symbols-outlined icon-filled text-white" style={{ fontSize: 18 }}>sports_soccer</span>
          </div>
          <span className="text-base font-medium text-md-on-surface">Coach App</span>
        </div>
        <button onClick={() => setMenuOpen(o => !o)} className="btn-icon" aria-label="Menü">
          <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* ── Mobile dropdown menu ── */}
      {menuOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setMenuOpen(false)} />
          <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-white shadow-el3 border-b border-md-outline-variant max-h-[80vh] overflow-y-auto">
            <nav className="px-3 py-2 space-y-0.5">
              {visibleNav.map(item => (
                <NavItem key={item.to} {...item} onClick={() => setMenuOpen(false)} />
              ))}
            </nav>
            <div className="px-4 py-3 border-t border-md-outline-variant flex items-center justify-between">
              <p className="text-xs text-md-on-surface-variant truncate">{user?.email}</p>
              <button onClick={signOut} className="btn-text text-xs py-1">
                <span className="material-symbols-outlined icon-sm">logout</span>Abmelden
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-md-outline-variant flex">
        {bottomNavItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                isActive ? 'text-md-primary' : 'text-md-on-surface-variant'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`px-2 py-1 rounded-xl ${isActive ? 'bg-md-secondary-container' : ''}`}>
                  <span className={`material-symbols-outlined icon-sm ${isActive ? 'icon-filled' : ''}`}>{icon}</span>
                </div>
                <span className="text-xs font-medium leading-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
