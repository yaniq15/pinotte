import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Save, Calculator, CheckCircle2 } from 'lucide-react'
import { listProducts } from '../api/products'
import { getRecipe, putRecipe, applyCost, type RecipeIngredient } from '../api/recipes'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const UNITS = ['g', 'kg', 'ml', 'L', 'unité', 'oz', 'lb']

const fmtCAD = (v: number | null | undefined) => {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)
}
const fmtCADprecise = (v: number | null | undefined) => {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 4 }).format(v)
}

export default function CalculatorPage() {
  const qc = useQueryClient()
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const [productId, setProductId] = useState<string>('')
  const [batchYield, setBatchYield] = useState<string>('')
  const [lines, setLines] = useState<RecipeIngredient[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  const selectedProduct = products.data?.find(p => p.id === Number(productId))
  const unitsPerBox = selectedProduct?.units_per_box ?? 0

  // Fetch recipe when product changes
  const recipe = useQuery({
    queryKey: ['recipe', productId],
    queryFn: () => getRecipe(Number(productId)),
    enabled: !!productId,
  })

  useEffect(() => {
    if (recipe.data) {
      setBatchYield(recipe.data.batch_yield_units?.toString() ?? '')
      setLines(recipe.data.ingredients.length
        ? recipe.data.ingredients.map(i => ({
            name: i.name, unit: i.unit, quantity: i.quantity, unit_price: i.unit_price,
            notes: i.notes, sort_order: i.sort_order,
          }))
        : [emptyLine()])
    }
  }, [recipe.data])

  function emptyLine(): RecipeIngredient {
    return { name: '', unit: 'g', quantity: 0, unit_price: null }
  }

  function updateLine(i: number, patch: Partial<RecipeIngredient>) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function removeLine(i: number) {
    setLines(ls => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls)
  }
  function addLine() { setLines(ls => [...ls, emptyLine()]) }

  // Live computation
  const linesWithCost = lines.map(l => ({
    ...l,
    lineCost: (l.unit_price !== null && l.unit_price !== undefined && !isNaN(Number(l.unit_price)))
      ? Number(l.quantity) * Number(l.unit_price)
      : null,
  }))
  const totalBatch = linesWithCost.reduce((s, l) => s + (l.lineCost ?? 0), 0)
  const yieldNum = Number(batchYield) || 0
  const costPerUnit = yieldNum > 0 ? totalBatch / yieldNum : null
  const costPerBox = costPerUnit !== null ? costPerUnit * unitsPerBox : null

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Produit requis')
      return putRecipe(Number(productId), {
        batch_yield_units: yieldNum > 0 ? yieldNum : null,
        ingredients: lines
          .filter(l => l.name.trim())
          .map((l, i) => ({
            name: l.name.trim(),
            unit: l.unit,
            quantity: Number(l.quantity) || 0,
            unit_price: l.unit_price === null || l.unit_price === undefined || l.unit_price === ('' as unknown as number) ? null : Number(l.unit_price),
            notes: l.notes || null,
            sort_order: i,
          })),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', productId] })
      setSuccess('Recette enregistrée ✓')
      setTimeout(() => setSuccess(null), 2500)
    },
  })

  const applyMut = useMutation({
    mutationFn: async () => applyCost(Number(productId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', productId] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setSuccess('Coût unitaire mis à jour sur le produit ✓')
      setTimeout(() => setSuccess(null), 3000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert(msg || 'Erreur')
    },
  })

  const currentUnitCost = recipe.data?.current_unit_cost ?? null
  const costDiff = (currentUnitCost !== null && costPerUnit !== null)
    ? costPerUnit - Number(currentUnitCost) : null

  return (
    <div className="px-6 lg:px-10 py-8 max-w-7xl">
      <PageHeader
        title="Calculateur de coût"
        description="Saisis la recette d'un produit → coût unitaire calculé automatiquement."
        action={
          productId && (
            <>
              <Button variant="secondary" icon={<Save size={14} />} onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}>
                {saveMut.isPending ? '…' : 'Enregistrer la recette'}
              </Button>
              <Button icon={<CheckCircle2 size={14} />} onClick={() => applyMut.mutate()}
                disabled={applyMut.isPending || costPerUnit === null}>
                {applyMut.isPending ? '…' : 'Appliquer au produit'}
              </Button>
            </>
          )
        }
      />

      {success && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 text-sm">
          {success}
        </div>
      )}

      {/* Product selector */}
      <Card className="mb-4">
        <CardBody>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Produit à calculer</label>
          <select value={productId} onChange={e => setProductId(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 ring-1 ring-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-chika-paprika focus:outline-none">
            <option value="">— choisir un produit —</option>
            {products.data?.map(p => (
              <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>
            ))}
          </select>
          {selectedProduct && (
            <div className="mt-2 text-xs text-stone-500">
              Conditionnement : <strong>{selectedProduct.units_per_box} unités / caisse</strong>
              {' · '}Coût unitaire actuel : <strong className="text-stone-900">{fmtCAD(Number(currentUnitCost))}</strong>
            </div>
          )}
        </CardBody>
      </Card>

      {productId && (
        <>
          {/* Batch yield */}
          <Card className="mb-4">
            <CardHeader title="Rendement d'un batch"
              subtitle="Combien d'unités produit UN batch (UN cycle de production complet) ?" />
            <CardBody>
              <div className="flex items-center gap-3">
                <input type="number" min="1" value={batchYield} onChange={e => setBatchYield(e.target.value)}
                  className="px-3 py-2 ring-1 ring-stone-300 rounded-lg text-sm w-32 text-right tabular-nums"
                  placeholder="ex: 8" />
                <span className="text-sm text-stone-600">
                  {selectedProduct?.name ? `bocaux / sacs de ${selectedProduct.name}` : 'unités par batch'}
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Ingredients */}
          <Card className="mb-4">
            <CardHeader title="Recette — ingrédients par batch"
              subtitle="Quantités pour UN batch. Saisis le prix d'achat dans la MÊME unité que la quantité." />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                    <tr>
                      <th className="text-left px-4 py-3">Ingrédient</th>
                      <th className="text-right px-4 py-3 w-24">Quantité</th>
                      <th className="text-left px-4 py-3 w-24">Unité</th>
                      <th className="text-right px-4 py-3 w-32">Prix / unité</th>
                      <th className="text-right px-4 py-3 w-32">Coût ligne</th>
                      <th className="w-12 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {linesWithCost.map((l, i) => (
                      <tr key={i} className="border-t border-stone-100">
                        <td className="px-4 py-2">
                          <input value={l.name} onChange={e => updateLine(i, { name: e.target.value })}
                            className={inputCls} placeholder="Pâte d'arachide" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" step="0.0001" value={l.quantity}
                            onChange={e => updateLine(i, { quantity: Number(e.target.value) })}
                            className={`${inputCls} text-right tabular-nums`} />
                        </td>
                        <td className="px-4 py-2">
                          <select value={l.unit} onChange={e => updateLine(i, { unit: e.target.value })}
                            className={inputCls}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" step="0.0001"
                            value={l.unit_price ?? ''}
                            onChange={e => updateLine(i, {
                              unit_price: e.target.value === '' ? null : Number(e.target.value),
                            })}
                            className={`${inputCls} text-right tabular-nums`} placeholder="$/unité" />
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-stone-900">
                          {l.lineCost !== null ? fmtCAD(l.lineCost) : <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeLine(i)}
                            className="text-stone-400 hover:text-red-600 p-1"
                            disabled={lines.length === 1}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-200 bg-stone-50">
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-stone-700">
                        Coût total du batch
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-lg text-chika-paprika">
                        {fmtCAD(totalBatch)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="p-3 border-t border-stone-100">
                <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addLine}>
                  Ajouter une ligne
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Result */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Coût par unité</div>
                <div className="text-3xl font-bold text-chika-paprika tabular-nums">{fmtCADprecise(costPerUnit)}</div>
                {costPerUnit !== null && yieldNum > 0 && (
                  <div className="text-[11px] text-stone-500 mt-1">
                    {fmtCAD(totalBatch)} ÷ {yieldNum} unités
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Coût par caisse</div>
                <div className="text-3xl font-bold text-stone-900 tabular-nums">{fmtCAD(costPerBox)}</div>
                {costPerBox !== null && (
                  <div className="text-[11px] text-stone-500 mt-1">
                    × {unitsPerBox} unités / caisse
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className={costDiff !== null && Math.abs(costDiff) > 0.01 ? 'ring-amber-300 bg-amber-50/30' : ''}>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">vs coût actuel</div>
                <div className="text-3xl font-bold text-stone-900 tabular-nums">
                  {currentUnitCost !== null ? fmtCAD(Number(currentUnitCost)) : '—'}
                </div>
                {costDiff !== null && (
                  <Badge tone={costDiff > 0 ? 'warning' : costDiff < 0 ? 'success' : 'neutral'}>
                    {costDiff > 0 ? '+' : ''}{fmtCADprecise(costDiff)}
                  </Badge>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Help */}
          <div className="mt-6 px-4 py-3 rounded-lg bg-blue-50 ring-1 ring-blue-200 text-xs text-blue-900 flex items-start gap-2">
            <Calculator size={14} className="mt-0.5 shrink-0" />
            <div>
              <strong>Astuce</strong> — pour saisir un prix par kg sur une quantité en g, fais le calcul : 1 kg de pâte d'arachide à 8 $/kg = <code>0,008 $/g</code>.
              La calculatrice est unit-agnostic : tu peux mélanger les unités tant que <strong>la quantité et le prix sont dans la même unité</strong>.
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const inputCls = "w-full px-2 py-1.5 ring-1 ring-stone-300 rounded-md focus:ring-2 focus:ring-chika-paprika focus:outline-none text-sm bg-white"
