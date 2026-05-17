import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  LogOut, Home, Package, Boxes, Warehouse, ArrowLeftRight, Users, Receipt, Wallet, Calculator, ChevronRight, ChevronDown,
} from 'lucide-react'
import { ReactNode, useState } from 'react'
import { useCurrentUser, clearToken } from '../../hooks/useAuth'
import { BRAND } from '../../lib/brand'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  section?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',           label: 'Tableau de bord', icon: Home,           section: 'Aperçu' },
  { to: '/produits',   label: 'Produits',        icon: Package,        section: 'Catalogue' },
  { to: '/lots',       label: 'Lots',            icon: Boxes,          section: 'Catalogue' },
  { to: '/calculateur',label: 'Calculateur',     icon: Calculator,     section: 'Catalogue' },
  { to: '/inventaire', label: 'Inventaire',      icon: Warehouse,      section: 'Catalogue' },
  { to: '/mouvements', label: 'Mouvements',      icon: ArrowLeftRight, section: 'Catalogue' },
  { to: '/clients',    label: 'Clients',         icon: Users,          section: 'Ventes' },
  { to: '/ventes',     label: 'Ventes',          icon: Receipt,        section: 'Ventes' },
  { to: '/depenses',   label: 'Dépenses',        icon: Wallet,         section: 'Finance' },
]

export default function AppLayout() {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  function logout() {
    clearToken()
    qc.clear()
    navigate('/login')
  }

  const initials = (user?.name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()

  // Group items by section for the sidebar
  const sections: { name: string; items: NavItem[] }[] = []
  for (const item of NAV_ITEMS) {
    const sec = item.section || 'Autre'
    let group = sections.find(s => s.name === sec)
    if (!group) {
      group = { name: sec, items: [] }
      sections.push(group)
    }
    group.items.push(item)
  }

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* SIDEBAR — desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-stone-200/80 shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-stone-100">
          <img src={BRAND.assets.logoPaprika} alt={BRAND.name} className="h-7" />
          <div className="text-[10px] uppercase tracking-widest text-stone-400 mt-1.5">
            {BRAND.tagline}
          </div>
        </div>

        {/* Nav grouped by sections */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {sections.map(sec => (
            <div key={sec.name}>
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                {sec.name}
              </div>
              <div className="space-y-0.5">
                {sec.items.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition ${
                        isActive
                          ? 'bg-chika-paprika/10 text-chika-paprika'
                          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}>
                    <Icon size={15} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-stone-100 relative">
          <button onClick={() => setUserMenuOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-stone-100 transition">
            <div className="w-8 h-8 rounded-full bg-chika-paprika text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[13px] font-semibold text-stone-900 truncate">{user?.name}</div>
              <div className="text-[11px] text-stone-500 truncate">{user?.email}</div>
            </div>
            <ChevronDown size={14} className={`text-stone-400 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-lg ring-1 ring-stone-200 shadow-lg overflow-hidden">
              <button onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-stone-700 hover:bg-red-50 hover:text-red-700 transition">
                <LogOut size={14} /> Se déconnecter
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* MOBILE TOP BAR */}
        <header className="lg:hidden bg-white border-b border-stone-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <img src={BRAND.assets.logoPaprika} alt={BRAND.name} className="h-7" />
            <button onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50">
              <LogOut size={14} /> Sortir
            </button>
          </div>
          <nav className="px-2 pb-2 flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
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

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
}: {
  title: string
  description?: string
  action?: ReactNode
  breadcrumbs?: { label: string; to?: string }[]
}) {
  const crumbs = breadcrumbs || [{ label: 'Chika' }, { label: title }]
  return (
    <div className="mb-6">
      <nav className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
        {crumbs.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-stone-300" />}
            <span className={i === crumbs.length - 1 ? 'text-stone-700 font-medium' : ''}>
              {c.label}
            </span>
          </div>
        ))}
      </nav>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
          {description && <p className="text-sm text-stone-500 mt-1">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
      </div>
    </div>
  )
}
