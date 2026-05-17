import { ReactNode } from 'react'

type Tone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'paprika'
  | 'ocre'

const TONES: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  danger:  'bg-red-50 text-red-700 ring-red-600/20',
  info:    'bg-blue-50 text-blue-700 ring-blue-600/20',
  paprika: 'bg-chika-paprika/10 text-chika-paprika ring-chika-paprika/20',
  ocre:    'bg-chika-ocre/15 text-chika-ocreDeep ring-chika-ocreDeep/20',
}

export function Badge({ tone = 'neutral', children, icon }: {
  tone?: Tone; children: ReactNode; icon?: ReactNode
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {icon}
      {children}
    </span>
  )
}
