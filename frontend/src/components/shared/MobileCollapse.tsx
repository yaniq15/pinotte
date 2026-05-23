import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface MobileCollapseProps {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
}

/** Section collapsible UNIQUEMENT sur mobile (< lg).
 * Sur desktop : toujours dépliée, le header de toggle est masqué.
 * Sur mobile : fermée par défaut (sauf si defaultOpen=true), tap pour basculer.
 *
 * Permet de raccourcir les pages denses (dashboard) sur petit écran sans
 * dupliquer la mise en page côté desktop. */
export default function MobileCollapse({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: MobileCollapseProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="lg:contents">
      {/* Toggle header — mobile only */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="lg:hidden w-full mb-2 px-4 py-3 flex items-center justify-between gap-3 bg-white border border-stone-200 rounded-xl shadow-sm hover:bg-stone-50 transition"
        aria-expanded={open}
      >
        <div className="text-left min-w-0">
          <div className="text-sm font-semibold text-stone-900 truncate">{title}</div>
          {subtitle && (
            <div className="text-xs text-stone-500 truncate">{subtitle}</div>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-stone-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content : visible on desktop always, on mobile only when open */}
      <div className={`${open ? 'block' : 'hidden'} lg:block`}>
        {children}
      </div>
    </div>
  )
}
