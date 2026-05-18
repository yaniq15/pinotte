import type { ReactNode } from 'react'

/** Shopify-style card: white bg, visible ring + medium shadow for clear separation. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl ring-1 ring-stone-300 shadow-md ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, children, className = '' }: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={`px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {title && <h3 className="text-sm font-semibold text-stone-900">{title}</h3>}
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
        {children}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}
