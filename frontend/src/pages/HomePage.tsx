import { useQuery } from '@tanstack/react-query'
import { Package, Boxes, ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useAuth'
import { listProducts } from '../api/products'
import { listBatches } from '../api/batches'
import { PageHeader } from '../components/shared/AppLayout'

const ROADMAP = [
  ['Phase 1', 'Setup + authentification', true],
  ['Phase 2', 'Catalogue produits + lots de production', true],
  ['Phase 3', 'Inventaire + mouvements de stock', false],
  ['Phase 4', 'Clients + ventes', false],
  ['Phase 5', 'Dépenses', false],
  ['Phase 6', 'Dashboard + rapports', false],
  ['Phase 7', 'Polish + déploiement', false],
] as const

export default function HomePage() {
  const { data: user } = useCurrentUser()
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const batches  = useQuery({ queryKey: ['batches'],  queryFn: () => listBatches() })

  const activeProducts = products.data?.filter(p => p.active).length ?? 0
  const batchCount = batches.data?.length ?? 0
  const totalBoxes = batches.data?.reduce((sum, b) => sum + b.quantity_boxes, 0) ?? 0

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl">
      <PageHeader
        title={`Bonjour ${user?.name?.split(' ')[0] || ''}`}
        description="Vue d'ensemble de ton activité Chika."
      />

      {/* Brand stripe — subtle motif accent at the top of the dashboard */}
      <div className="rounded-2xl overflow-hidden bg-white border border-stone-200 mb-6">
        <div className="bg-motif-paprika h-1.5 opacity-60" />
        <div className="p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-chika-paprika font-bold mb-1">
              Mets traditionnels africains
            </div>
            <p className="text-stone-700 text-sm max-w-xl">
              Suivi de la production, des ventes et de la rentabilité pour les 3 produits Chika.
            </p>
          </div>
          <Link to="/produits"
            className="inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            Voir les produits <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Kpi icon={Package} label="Produits actifs" value={activeProducts} accent="paprika" />
        <Kpi icon={Boxes} label="Lots de production" value={batchCount} accent="ocre" />
        <Kpi icon={Boxes} label="Boîtes produites (total)" value={totalBoxes} accent="leaf" />
      </div>

      {/* Roadmap (compact) */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Roadmap</h2>
        <ul className="space-y-1.5 text-sm">
          {ROADMAP.map(([phase, desc, done]) => (
            <li key={phase} className="flex items-center gap-3 py-1">
              {done
                ? <CheckCircle2 size={16} className="text-chika-paprika shrink-0" />
                : <Circle size={16} className="text-stone-300 shrink-0" />}
              <span className={`font-semibold w-20 ${done ? 'text-stone-900' : 'text-stone-400'}`}>{phase}</span>
              <span className={done ? 'text-stone-700' : 'text-stone-400'}>{desc}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: number
  accent: 'paprika' | 'ocre' | 'leaf'
}) {
  const accentClasses = {
    paprika: 'bg-chika-paprika/10 text-chika-paprika',
    ocre:    'bg-chika-ocre/15 text-chika-ocreDeep',
    leaf:    'bg-chika-leaf/15 text-chika-leaf',
  }[accent]
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentClasses}`}>
          <Icon size={18} />
        </span>
        <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">{label}</span>
      </div>
      <div className="text-3xl font-bold text-stone-900 tabular-nums">{value}</div>
    </div>
  )
}
