import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { listProducts } from '../api/products'
import { getRecipe } from '../api/recipes'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { useT } from '../lib/i18n'

const fmtCAD = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)

type Channel = 'consumer' | 'direct' | 'broker'

export default function SimulatorPage() {
  const t = useT()
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [productId, setProductId] = useState('')
  const [costShockPct, setCostShockPct] = useState(0)
  const [priceShockPct, setPriceShockPct] = useState(0)
  // Canal de vente : c'est ce prix-là qui sert de base à la marge
  const [channel, setChannel] = useState<Channel>('direct')

  const recipe = useQuery({
    queryKey: ['recipe', productId],
    queryFn: () => getRecipe(Number(productId)),
    enabled: !!productId,
  })

  const selectedProduct = products.data?.find(p => p.id === Number(productId))

  // Prix selon le canal choisi
  function priceForChannel(p: NonNullable<typeof selectedProduct>, ch: Channel): number {
    if (ch === 'consumer') return Number(p.consumer_price || 0)
    if (ch === 'broker') return Number(p.price_broker || 0)
    return Number(p.price_direct || 0)
  }

  const sim = useMemo(() => {
    if (!recipe.data || !selectedProduct) return null
    const baseCostPerUnit = recipe.data.cost_per_unit || Number(selectedProduct.unit_cost) || 0
    const basePrice = priceForChannel(selectedProduct, channel)
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
  }, [recipe.data, selectedProduct, costShockPct, priceShockPct, channel])

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl">
      <PageHeader
        title={t('simulator.title')}
        description={t('simulator.description')}
      />

      <Card className="mb-4">
        <CardBody className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">{t('simulator.product_label')}</label>
            <select value={productId} onChange={e => setProductId(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 ring-1 ring-stone-300 rounded-lg text-sm bg-white">
              <option value="">{t('simulator.choose_product')}</option>
              {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {selectedProduct && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                {t('simulator.channel_label')} <span className="font-normal text-stone-400">{t('simulator.channel_sub')}</span>
              </label>
              <div className="inline-flex rounded-lg ring-1 ring-stone-300 overflow-hidden flex-wrap">
                <ChannelBtn active={channel === 'consumer'} onClick={() => setChannel('consumer')}
                  label={t('simulator.channel.consumer')} price={Number(selectedProduct.consumer_price || 0)} notSetLabel={t('simulator.not_set')} />
                <ChannelBtn active={channel === 'direct'} onClick={() => setChannel('direct')}
                  label={t('simulator.channel.direct')} price={Number(selectedProduct.price_direct || 0)} borderLeft notSetLabel={t('simulator.not_set')} />
                <ChannelBtn active={channel === 'broker'} onClick={() => setChannel('broker')}
                  label={t('simulator.channel.broker')} price={Number(selectedProduct.price_broker || 0)} borderLeft notSetLabel={t('simulator.not_set')} />
              </div>
              <p className="text-[11px] text-stone-500 mt-1.5">
                {channel === 'consumer' && t('simulator.channel_hint.consumer')}
                {channel === 'direct' && t('simulator.channel_hint.direct')}
                {channel === 'broker' && t('simulator.channel_hint.broker')}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {productId && sim && (
        <>
          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader title={t('simulator.cost_variation_title')} subtitle={`${t('simulator.cost_variation_subtitle_prefix')} ${fmtCAD(sim.baseCostPerUnit)}${t('simulator.cost_variation_subtitle_suffix')}`} />
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
                  {t('simulator.new_cost_prefix')} <strong>{fmtCAD(sim.newCost)}{t('simulator.cost_variation_subtitle_suffix')}</strong>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t('simulator.price_variation_title')} subtitle={`${t('simulator.price_variation_subtitle_prefix')} ${fmtCAD(sim.basePrice)}${t('simulator.cost_variation_subtitle_suffix')}`} />
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
                  {t('simulator.new_price_prefix')} <strong>{fmtCAD(sim.newPrice)}{t('simulator.cost_variation_subtitle_suffix')}</strong>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Comparaison */}
          <Card className="mb-4">
            <CardHeader title={t('simulator.comparison_title')} />
            <CardBody>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">{t('simulator.current_margin')}</div>
                  <div className="text-2xl font-bold tabular-nums text-stone-900 mt-1">{sim.baseMarginPct.toFixed(1)}%</div>
                  <div className="text-xs text-stone-500">{fmtCAD(sim.baseMargin)}{t('simulator.cost_variation_subtitle_suffix')}</div>
                </div>
                <div className="border-x border-stone-200">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">{t('simulator.simulated_margin')}</div>
                  <div className={`text-2xl font-bold tabular-nums mt-1 ${
                    sim.diffMarginPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>{sim.newMarginPct.toFixed(1)}%</div>
                  <div className="text-xs text-stone-500">{fmtCAD(sim.newMargin)}{t('simulator.cost_variation_subtitle_suffix')}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">{t('simulator.variation')}</div>
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
                <strong>{t('simulator.reco_prefix')} {sim.baseMarginPct.toFixed(1)}%</strong> {t('simulator.reco_mid')}{' '}
                <strong className="text-chika-paprika">{fmtCAD(sim.priceToKeepMargin)}{t('simulator.cost_variation_subtitle_suffix')}</strong>
                {' '}(soit {(((sim.priceToKeepMargin - sim.basePrice) / sim.basePrice) * 100).toFixed(1)}% {t('simulator.reco_suffix')}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}

function ChannelBtn({ active, onClick, label, price, borderLeft, notSetLabel }: {
  active: boolean
  onClick: () => void
  label: string
  price: number
  borderLeft?: boolean
  notSetLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium transition ${borderLeft ? 'border-l border-stone-300' : ''} ${
        active ? 'bg-chika-paprika text-white' : 'bg-white text-stone-700 hover:bg-stone-50'
      }`}
    >
      {label}
      <span className={`block text-[11px] tabular-nums ${active ? 'text-white/80' : 'text-stone-400'}`}>
        {price > 0 ? fmtCAD(price) : notSetLabel}
      </span>
    </button>
  )
}
