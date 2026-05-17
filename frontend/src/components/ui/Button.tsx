import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-chika-paprika hover:bg-chika-paprikaDeep text-white shadow-sm shadow-chika-paprika/20 disabled:opacity-50',
  secondary: 'bg-white hover:bg-stone-50 text-stone-900 ring-1 ring-stone-200 shadow-sm disabled:opacity-50',
  ghost:     'text-stone-700 hover:bg-stone-100 disabled:opacity-50',
  danger:    'bg-white hover:bg-red-50 text-red-700 ring-1 ring-red-200 shadow-sm disabled:opacity-50',
}

const SIZES: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
}

export function Button({ variant = 'primary', size = 'md', icon, children, className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg transition ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}
