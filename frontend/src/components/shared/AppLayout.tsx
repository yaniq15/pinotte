import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, Home, Package, Boxes, Warehouse, ArrowLeftRight, Users, Receipt, ChevronRight } from 'lucide-react'
import { useCurrentUser, clearToken } from '../../hooks/useAuth'
import { BRAND } from '../../lib/brand'

const NAV_ITEMS = [
  { to: '/',           label: 'Tableau de bord', icon: Home },
  { to: '/produits',   label: 'Produits',        icon: Package },
  { to: '/lots',       label: 'Lots',            icon: Boxes },
  { to: '/inventaire', label: 'Inventaire',      icon: Warehouse },
  { to: '/mouvements', label: 'Mouvements',      icon: ArrowLeftRight },
  { to: '/clients',    label: 'Clients',         icon: Users },
  { to: '/ventes',     label: 'Ventes',          icon: Receipt },
]

export default function AppLayout() {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()
  const qc = useQueryClient()

  function logout() {
    clearToken()
    qc.clear()
    navigate('/login')
  }

  const initials = (user?.name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* SIDEBAR — desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-stone-200">
        <div className="px-5 py-5 border-b border-stone-100">
          <img src={BRAND.assets.logoPaprika} alt={BRAND.name} className="h-8" />
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-chika-paprika/10 text-chika-paprika'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User card + logout */}
        <div className="p-3 border-t border-stone-100">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-chika-paprika text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-stone-900 truncate">{user?.name}</div>
              <div className="text-[11px] text-stone-500 truncate">{user?.email}</div>
            </div>
          </div>
          <button onClick={logout}
            className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:text-red-700 hover:bg-red-50 transition">
            <LogOut size={14} /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* MOBILE TOP BAR */}
        <header className="lg:hidden bg-white border-b border-stone-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <img src={BRAND.assets.logoPaprika} alt={BRAND.name} className="h-8" />
            <button onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50">
              <LogOut size={14} /> Sortir
            </button>
          </div>
          <nav className="px-2 pb-2 flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    isActive
                      ? 'bg-chika-paprika text-white'
                      : 'text-stone-600 bg-stone-100'
                  }`}>
                <Icon size={14} /> {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, action }: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-stone-400 mb-1">
          <span>Chika</span>
          <ChevronRight size={12} />
          <span className="text-stone-600">{title}</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
        {description && <p className="text-sm text-stone-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}
