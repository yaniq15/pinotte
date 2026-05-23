import { NavLink } from 'react-router-dom'
import { Home, Receipt, Warehouse, Wallet, MoreHorizontal } from 'lucide-react'
import { useT } from '../../lib/i18n'

interface BottomNavProps {
  onOpenMore: () => void
  moreOpen: boolean
}

/** Fixed bottom navigation bar — visible only on mobile (< lg).
 * 4 most-frequent destinations + a "More" button that opens the full nav sheet.
 * Includes iOS safe-area padding so the tab bar isn't hidden by the home indicator. */
export default function MobileBottomNav({ onOpenMore, moreOpen }: BottomNavProps) {
  const t = useT()
  const tabs = [
    { to: '/',           label: t('nav.dashboard'), icon: Home,      end: true },
    { to: '/ventes',     label: t('nav.sales'),     icon: Receipt },
    { to: '/inventaire', label: t('nav.inventory'), icon: Warehouse },
    { to: '/depenses',   label: t('nav.expenses'),  icon: Wallet },
  ]

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-stone-200 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <div className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 transition ${
                isActive
                  ? 'text-chika-paprika'
                  : 'text-stone-500 hover:text-stone-700'
              }`
            }
          >
            <Icon size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium tracking-tight">{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onOpenMore}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 transition ${
            moreOpen ? 'text-chika-paprika' : 'text-stone-500 hover:text-stone-700'
          }`}
          aria-label="Plus de pages"
        >
          <MoreHorizontal size={22} strokeWidth={2} />
          <span className="text-[10px] font-medium tracking-tight">Plus</span>
        </button>
      </div>
    </nav>
  )
}
