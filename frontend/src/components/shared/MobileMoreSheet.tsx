import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  X, Package, Boxes, Calculator, Sprout, ClipboardCheck, ArrowLeftRight,
  Users, PartyPopper, Wallet, RefreshCcw, Factory, LineChart, Settings, LogOut,
} from 'lucide-react'
import { useT } from '../../lib/i18n'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
  onLogout: () => void
}

interface MoreItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

/** Bottom sheet opened from the "Plus" tab on mobile. Lists all destinations
 * not present in the bottom nav, grouped by section. Closes when the user
 * navigates or taps the backdrop. */
export default function MobileMoreSheet({ open, onClose, onLogout }: MoreSheetProps) {
  const t = useT()
  const location = useLocation()

  // Close on route change (user tapped an item inside the sheet)
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Prevent body scroll behind the sheet
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const sections: { title: string; items: MoreItem[] }[] = [
    {
      title: t('nav.section.catalog'),
      items: [
        { to: '/produits',            label: t('nav.products'),         icon: Package },
        { to: '/lots',                label: t('nav.batches'),          icon: Boxes },
        { to: '/calculateur',         label: t('nav.calculator'),       icon: Calculator },
        { to: '/matieres',            label: t('nav.materials'),        icon: Sprout },
        { to: '/inventaire-physique', label: t('nav.inventory_count'),  icon: ClipboardCheck },
        { to: '/mouvements',          label: t('nav.movements'),        icon: ArrowLeftRight },
      ],
    },
    {
      title: t('nav.section.sales'),
      items: [
        { to: '/clients',             label: t('nav.clients'),          icon: Users },
        { to: '/evenements',          label: t('nav.events'),           icon: PartyPopper },
        { to: '/comptes-a-recevoir',  label: t('nav.ar_aging'),         icon: Wallet },
      ],
    },
    {
      title: t('nav.section.finance'),
      items: [
        { to: '/abonnements',         label: t('nav.subscriptions'),    icon: RefreshCcw },
        { to: '/immobilisations',     label: t('nav.fixed_assets'),     icon: Factory },
        { to: '/simulateur',          label: t('nav.simulator'),        icon: LineChart },
      ],
    },
    {
      title: t('nav.section.account'),
      items: [
        { to: '/profil',              label: t('nav.profile'),          icon: Settings },
      ],
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto transition-transform duration-200 pb-[env(safe-area-inset-bottom)] ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-stone-100">
          <h2 className="text-base font-bold text-stone-900">Plus de pages</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sections */}
        <div className="px-3 py-3 space-y-4">
          {sections.map((sec) => (
            <div key={sec.title}>
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                {sec.title}
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                {sec.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? 'bg-chika-paprika/10 text-chika-paprika'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`
                    }
                  >
                    <Icon size={18} className="shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Logout */}
          <button
            type="button"
            onClick={() => { onClose(); onLogout() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            <LogOut size={18} className="shrink-0" />
            Déconnexion
          </button>
        </div>
      </div>
    </>
  )
}
