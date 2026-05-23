import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  LogOut, Home, Package, Boxes, Warehouse, ArrowLeftRight, Users, Receipt, Wallet, Calculator, Settings, ChevronRight, ChevronDown, Sprout, PartyPopper,
  ClipboardCheck, RefreshCcw, Factory, LineChart, Plus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useCurrentUser, clearToken } from '../../hooks/useAuth'
import { BRAND } from '../../lib/brand'
import { useLang, useT } from '../../lib/i18n'
import { PinotteWordmark } from '../../pages/LoginPage'
import MobileBottomNav from './MobileBottomNav'
import MobileMoreSheet from './MobileMoreSheet'

interface NavItem {
  to: string
  labelKey: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  sectionKey: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',           labelKey: 'nav.dashboard',  icon: Home,           sectionKey: 'nav.section.overview' },
  { to: '/produits',   labelKey: 'nav.products',   icon: Package,        sectionKey: 'nav.section.catalog' },
  { to: '/lots',       labelKey: 'nav.batches',    icon: Boxes,          sectionKey: 'nav.section.catalog' },
  { to: '/calculateur',labelKey: 'nav.calculator', icon: Calculator,     sectionKey: 'nav.section.catalog' },
  { to: '/matieres',   labelKey: 'nav.materials',  icon: Sprout,         sectionKey: 'nav.section.catalog' },
  { to: '/inventaire', labelKey: 'nav.inventory',  icon: Warehouse,      sectionKey: 'nav.section.catalog' },
  { to: '/inventaire-physique', labelKey: 'nav.inventory_count', icon: ClipboardCheck, sectionKey: 'nav.section.catalog' },
  { to: '/mouvements', labelKey: 'nav.movements',  icon: ArrowLeftRight, sectionKey: 'nav.section.catalog' },
  { to: '/clients',    labelKey: 'nav.clients',    icon: Users,          sectionKey: 'nav.section.sales' },
  { to: '/ventes',     labelKey: 'nav.sales',      icon: Receipt,        sectionKey: 'nav.section.sales' },
  { to: '/evenements', labelKey: 'nav.events',     icon: PartyPopper,    sectionKey: 'nav.section.sales' },
  { to: '/comptes-a-recevoir', labelKey: 'nav.ar_aging', icon: Wallet,    sectionKey: 'nav.section.sales' },
  { to: '/depenses',   labelKey: 'nav.expenses',   icon: Wallet,         sectionKey: 'nav.section.finance' },
  { to: '/abonnements', labelKey: 'nav.subscriptions', icon: RefreshCcw, sectionKey: 'nav.section.finance' },
  { to: '/immobilisations', labelKey: 'nav.fixed_assets', icon: Factory, sectionKey: 'nav.section.finance' },
  { to: '/simulateur', labelKey: 'nav.simulator',  icon: LineChart,      sectionKey: 'nav.section.finance' },
  { to: '/profil',     labelKey: 'nav.profile',    icon: Settings,       sectionKey: 'nav.section.account' },
]

export default function AppLayout() {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const t = useT()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  // Lock invited users to /profil until they change their temp password
  useEffect(() => {
    if (user?.must_change_password && location.pathname !== '/profil') {
      navigate('/profil', { replace: true })
    }
  }, [user?.must_change_password, location.pathname, navigate])

  function logout() {
    clearToken()
    qc.clear()
    navigate('/login')
  }

  const initials = (user?.name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()

  // Group items by section for the sidebar
  const sections: { key: string; items: NavItem[] }[] = []
  for (const item of NAV_ITEMS) {
    let group = sections.find(s => s.key === item.sectionKey)
    if (!group) {
      group = { key: item.sectionKey, items: [] }
      sections.push(group)
    }
    group.items.push(item)
  }

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* SIDEBAR — desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-stone-200/80 shrink-0">
        {/* Brand — wordmark texte Pinotte (la plateforme), pas le logo Chika (tenant) */}
        <div className="px-5 py-5 border-b border-stone-200">
          <PinotteWordmark size="md" />
          <div className="text-[10px] uppercase tracking-widest text-stone-400 mt-1.5">
            {BRAND.tagline}
          </div>
        </div>

        {/* Nav grouped by sections */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {sections.map(sec => (
            <div key={sec.key}>
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                {t(sec.key)}
              </div>
              <div className="space-y-0.5">
                {sec.items.map(({ to, labelKey, icon: Icon }) => (
                  <NavLink key={to} to={to} end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition ${
                        isActive
                          ? 'bg-chika-paprika/10 text-chika-paprika'
                          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}>
                    <Icon size={15} />
                    {t(labelKey)}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-stone-200 relative">
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
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-lg ring-1 ring-stone-300 shadow-lg overflow-hidden">
              <LangToggle />
              <button onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-stone-700 hover:bg-red-50 hover:text-red-700 transition border-t border-stone-200">
                <LogOut size={14} /> {t('action.logout')}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* MOBILE TOP BAR — wordmark only, navigation handled by bottom tab bar */}
        <header className="lg:hidden bg-white/95 backdrop-blur border-b border-stone-200 sticky top-0 z-30">
          <div className="px-4 py-3 flex items-center justify-between">
            <PinotteWordmark size="sm" />
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-chika-paprika text-white flex items-center justify-center text-[11px] font-bold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content with bottom padding on mobile to clear the fixed bottom nav */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <Outlet />
        </main>

        {/* MOBILE FAB — Nouvelle vente quick action (hidden when not relevant) */}
        {!user?.must_change_password && (
          <button
            type="button"
            onClick={() => navigate('/ventes?new=1')}
            className="lg:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #E89B27 0%, #C5532E 100%)',
              boxShadow: '0 10px 24px -6px rgba(197,83,46,0.55), 0 2px 6px rgba(0,0,0,0.1)',
            }}
            aria-label="Nouvelle vente"
          >
            <Plus size={26} strokeWidth={2.5} className="text-white" />
          </button>
        )}

        {/* MOBILE BOTTOM NAVIGATION */}
        <MobileBottomNav onOpenMore={() => setMoreOpen(true)} moreOpen={moreOpen} />
        <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onLogout={logout} />
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
  const crumbs = breadcrumbs || [{ label: BRAND.name }, { label: title }]
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

function LangToggle() {
  const [lang, setLang] = useLang()
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-stone-600">
      <span className="font-medium">Langue / Language</span>
      <div className="inline-flex rounded-md ring-1 ring-stone-300 overflow-hidden">
        <button onClick={() => setLang('fr')}
          className={`px-2 py-0.5 text-[11px] font-semibold ${lang === 'fr' ? 'bg-chika-paprika text-white' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>FR</button>
        <button onClick={() => setLang('en')}
          className={`px-2 py-0.5 text-[11px] font-semibold ${lang === 'en' ? 'bg-chika-paprika text-white' : 'bg-white text-stone-600 hover:bg-stone-50'}`}>EN</button>
      </div>
    </div>
  )
}

