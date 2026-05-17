import type { ReactNode } from 'react'

export function EmptyState({ icon = '📭', title, description, action }: {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-4xl mb-3 opacity-60">{icon}</div>
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      {description && <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
