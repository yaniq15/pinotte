import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { listProducts } from '../api/products'
import { getRecipe } from '../api/recipes'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'

const fmtCAD = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)

export default function SimulatorPage() {
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [productId, setProductId] = useState('')
  const [costShockPct, setCostShockPct] = useState(0)
  const [priceShockPct, setPriceShockPct] = useState(0)

  const recipe = useQuery({
    queryKey: ['recipe', productId],
    queryFn: () => getRecipe(Number(productId)),
    enabled: !!productId,
  })

  const selectedProduct = products.data?.find(p => p.id === Number(productId))

  const sim = useMemo(() => {
    if (!recipe.data || !selectedProduct) return null
    const baseCostPerUnit = recipe.data.cost_per_unit || Number(selectedProduct.unit_cost) || 0
    const basePrice = Number(selectedProduct.consumer_price || selectedProduct.price_direct || selectedProduct.price_broker || 0)
    const baseMargin = basePrice - baseCostPerUnit
    const baseMarginPct = basePrice > 0 ? (baseMargin / basePrice) * 100 : 0

    const newCost = baseCostPerUnit * (1 + costShockPct / 100)
    const newPrice = basePrice * (1 + priceShockPct / 100)
    const newMargin = newPrice - newCost
    const newMarginPct = newPrice > 0 ? (newMargin / newPrice) * 100 : 0

    // Prix qu'il faudrait fixer pour garder la marge actuelle
    const priceToKeepMargin = baseMarginPct > 0 ? newCost / (1 - baseMarginPct / 100) : newCost

    return {
      baseCostPerUnit, basePrice, baseMargin, baseMarginPct,
      newCost, newPrice, newMargin, newMarginPct,
      priceToKeepMargin,
      diffMarginPct: newMarginPct - baseMarginPct,
    }
  }, [recipe.data, selectedProduct, costShockPct, priceShockPct])

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl">
      <PageHeader
        title="Simulateur prix-coût"
        description="Joue avec des hausses de coût matières ou de prix de vente pour voir l'impact instantané sur ta marge."
      />

      <Card className="mb-4">
        <CardBody>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Produit à simuler</label>
          <select value={productId} onChange={e => setProductId(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 ring-1 ring-stone-300 rounded-lg text-sm bg-white">
            <option value="">— choisir un produit —</option>
            {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </CardBody>
      </Card>

      {productId && sim && (
        <>
          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader title="Variation du coût matières" subtitle={`Coût actuel : ${fmtCAD(sim.baseCostPerUnit)}/unité`} />
              <CardBody>
                <input type="range" min="-30" max="50" step="1" value={costShockPct}
                  onChange={e => setCostShockPct(Number(e.target.value))}
                  className="w-full accent-chika-paprika" />
                <div className="flex justify-between text-xs text-stone-500 mt-1">
                  <span>−30%</span>
                  <strong className={`${costShockPct > 0 ? 'text-red-700' : costShockPct < 0 ? 'text-emerald-700' : 'text-stone-700'} text-lg`}>
                    {costShockPct > 0 ? '+' : ''}{costShockPct}%
                  </strong>
                  <span>+50%</span>
                </div>
                <div className="text-xs text-stone-600 mt-2">
                  → nouveau coût : <strong>{fmtCAD(sim.newCost)}/unité</strong>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Variation du prix de vente" subtitle={`Prix actuel : ${fmtCAD(sim.basePrice)}/unité`} />
              <CardBody>
                <input type="range" min="-30" max="50" step="1" value={priceShockPct}
                  onChange={e => setPriceShockPct(Number(e.target.value))}
                  className="w-full accent-chika-paprika" />
                <div className="flex justify-between text-xs text-stone-500 mt-1">
                  <span>−30%</span>
                  <strong className={`${priceShockPct > 0 ? 'text-emerald-700' : priceShockPct < 0 ? 'text-red-700' : 'text-stone-700'} text-lg`}>
                    {priceShockPct > 0 ? '+' : ''}{priceShockPct}%
                  </strong>
                  <span>+50%</span>
                </div>
                <div className="text-xs text-stone-600 mt-2">
                  → nouveau prix : <strong>{fmtCAD(sim.newPrice)}/unité</strong>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Comparaison */}
          <Card className="mb-4">
            <CardHeader title="Comparaison avant / après" />
            <CardBody>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Marge actuelle</div>
                  <div className="text-2xl font-bold tabular-nums text-stone-900 mt-1">{sim.baseMarginPct.toFixed(1)}%</div>
                  <div className="text-xs text-stone-500">{fmtCAD(sim.baseMargin)}/unité</div>
                </div>
                <div className="border-x border-stone-200">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Marge simulée</div>
                  <div className={`text-2xl font-bold tabular-nums mt-1 ${
                    sim.diffMarginPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>{sim.newMarginPct.toFixed(1)}%</div>
                  <div className="text-xs text-stone-500">{fmtCAD(sim.newMargin)}/unité</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Variation</div>
                  <div className={`text-2xl font-bold tabular-nums mt-1 inline-flex items-center gap-1 ${
                    sim.diffMarginPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {sim.diffMarginPct >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    {sim.diffMarginPct >= 0 ? '+' : ''}{sim.diffMarginPct.toFixed(1)} pts
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Reco */}
          <Card className="ring-amber-200 bg-amber-50/30">
            <CardBody>
              <div className="text-sm text-amber-900">
                <strong>💡 Pour garder une marge de {sim.baseMarginPct.toFixed(1)}%</strong> avec le nouveau coût de matières,
                il faudrait fixer ton prix de vente à <strong className="text-chika-paprika">{fmtCAD(sim.priceToKeepMargin)}/unité</strong>
                (soit {(((sim.priceToKeepMargin - sim.basePrice) / sim.basePrice) * 100).toFixed(1)}% vs prix actuel).
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
