import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Save, Calculator, CheckCircle2, Link2, Link2Off, X, AlertTriangle } from 'lucide-react'
import { listProducts } from '../api/products'
import { getRecipe, putRecipe, applyCost, type RecipeIngredient } from '../api/recipes'
import { listMaterials, createMaterial, type Material } from '../api/materials'
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
  const materials = useQuery({ queryKey: ['materials'], queryFn: () => listMaterials() })

  const [productId, setProductId] = useState<string>('')
  const [batchYield, setBatchYield] = useState<string>('')
  const [lines, setLines] = useState<RecipeIngredient[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  // Helper "calcul auto du rendement" — masse totale / masse unitaire − pertes
  const [yieldMode, setYieldMode] = useState<'direct' | 'auto'>('direct')
  const [batchMassG, setBatchMassG] = useState<string>('')   // masse totale du batch en grammes
  const [unitMassG, setUnitMassG] = useState<string>('')     // masse d'un sac en grammes
  const [lossPct, setLossPct] = useState<string>('0')        // pertes en %

  // Coûts additionnels par sac (emballage + main d'œuvre) — persistés dans la
  // recette comme des lignes spéciales préfixées [Auto] pour les retirer de
  // l'affichage normal des ingrédients.
  const PACKAGING_TAG = '[Auto] Sac sous vide / emballage'
  const LABOR_TAG = '[Auto] Main d\'œuvre'
  const [packagingPerUnit, setPackagingPerUnit] = useState<string>('0')
  const [laborPerUnit, setLaborPerUnit] = useState<string>('2.50')

  const yieldTheoretical = (Number(batchMassG) > 0 && Number(unitMassG) > 0)
    ? Math.floor(Number(batchMassG) / Number(unitMassG))
    : null
  const yieldEffective = yieldTheoretical !== null
    ? Math.floor(yieldTheoretical * (1 - (Number(lossPct) || 0) / 100))
    : null

  function applyAutoYield() {
    if (yieldEffective !== null && yieldEffective > 0) {
      setBatchYield(String(yieldEffective))
    }
  }

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
      const allIngs = recipe.data.ingredients
      // Détecter les lignes [Auto] et pré-remplir les states correspondants
      const pkgLine = allIngs.find(i => i.name === PACKAGING_TAG)
      const lbrLine = allIngs.find(i => i.name === LABOR_TAG)
      if (pkgLine?.unit_price != null) setPackagingPerUnit(String(pkgLine.unit_price))
      if (lbrLine?.unit_price != null) setLaborPerUnit(String(lbrLine.unit_price))
      // N'afficher dans la liste recette QUE les vrais ingrédients
      const realIngs = allIngs.filter(i => i.name !== PACKAGING_TAG && i.name !== LABOR_TAG)
      setLines(realIngs.length
        ? realIngs.map(i => ({
            name: i.name, unit: i.unit, quantity: i.quantity, unit_price: i.unit_price,
            notes: i.notes, sort_order: i.sort_order,
            material_id: i.material_id ?? null,
            material_name: i.material_name,
            material_unit: i.material_unit,
            material_current_stock: i.material_current_stock,
            material_pmp: i.material_pmp,
          }))
        : [emptyLine()])
    }
  }, [recipe.data])

  function emptyLine(): RecipeIngredient {
    return { name: '', unit: 'g', quantity: 0, unit_price: null, material_id: null }
  }

  // Modal quick-create matière : si non-null, on affiche le modal pour
  // créer une matière depuis la recette + auto-liée à la ligne d'index `idx`.
  const [quickCreate, setQuickCreate] = useState<{ idx: number; initialName: string } | null>(null)

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
  const matPerUnit = yieldNum > 0 ? totalBatch / yieldNum : null
  const pkgPerUnit = Number(packagingPerUnit) || 0
  const lbrPerUnit = Number(laborPerUnit) || 0
  // Coût total par unité = matières/u + emballage/u + main d'œuvre/u
  const costPerUnit = matPerUnit !== null ? matPerUnit + pkgPerUnit + lbrPerUnit : null
  const costPerBox = costPerUnit !== null ? costPerUnit * unitsPerBox : null

  // Construit la liste d'ingrédients à envoyer en BDD = vrais ingrédients +
  // 2 lignes [Auto] pour emballage et main d'œuvre (chacune représentant
  // pkg×yield et lbr×yield, qui divisés par yield redonnent le bon coût/u).
  function buildIngredientsPayload() {
    const real = lines
      .filter(l => l.name.trim())
      .map((l, i) => ({
        name: l.name.trim(),
        unit: l.unit,
        quantity: Number(l.quantity) || 0,
        unit_price: l.unit_price === null || l.unit_price === undefined || l.unit_price === ('' as unknown as number) ? null : Number(l.unit_price),
        notes: l.notes || null,
        sort_order: i,
        material_id: l.material_id ?? null,
      }))
    const autos: typeof real = []
    if (pkgPerUnit > 0 && yieldNum > 0) {
      autos.push({
        name: PACKAGING_TAG, unit: 'u', quantity: yieldNum,
        unit_price: pkgPerUnit, notes: null, sort_order: 1000, material_id: null,
      })
    }
    if (lbrPerUnit > 0 && yieldNum > 0) {
      autos.push({
        name: LABOR_TAG, unit: 'u', quantity: yieldNum,
        unit_price: lbrPerUnit, notes: null, sort_order: 1001, material_id: null,
      })
    }
    return [...real, ...autos]
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Produit requis')
      return putRecipe(Number(productId), {
        batch_yield_units: yieldNum > 0 ? yieldNum : null,
        ingredients: buildIngredientsPayload(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', productId] })
      setSuccess('Recette enregistrée ✓')
      setTimeout(() => setSuccess(null), 2500)
    },
  })

  const applyMut = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Produit requis')
      // Sauve d'abord la recette en BDD pour s'assurer que les modifs locales
      // (rendement + ingrédients + coûts auto) sont prises en compte, PUIS applique le coût.
      await putRecipe(Number(productId), {
        batch_yield_units: yieldNum > 0 ? yieldNum : null,
        ingredients: buildIngredientsPayload(),
      })
      return applyCost(Number(productId))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', productId] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setSuccess('Recette enregistrée et coût unitaire mis à jour ✓')
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
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-7xl">
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
              {/* Toggle mode */}
              <div className="flex gap-1.5 mb-3">
                <button type="button" onClick={() => setYieldMode('direct')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${yieldMode === 'direct' ? 'bg-chika-paprika text-white' : 'bg-stone-100 text-stone-600'}`}>
                  ✏️ Saisie directe
                </button>
                <button type="button" onClick={() => setYieldMode('auto')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${yieldMode === 'auto' ? 'bg-chika-paprika text-white' : 'bg-stone-100 text-stone-600'}`}>
                  🧮 Calcul auto (masse × conditionnement)
                </button>
              </div>

              {yieldMode === 'direct' ? (
                <div className="flex items-center gap-3">
                  <input type="number" min="1" value={batchYield} onChange={e => setBatchYield(e.target.value)}
                    className="px-3 py-2 ring-1 ring-stone-300 rounded-lg text-sm w-32 text-right tabular-nums"
                    placeholder="ex: 23" />
                  <span className="text-sm text-stone-600">
                    {selectedProduct?.name ? `bocaux / sacs de ${selectedProduct.name}` : 'unités par batch'}
                  </span>
                </div>
              ) : (
                <div className="space-y-3 bg-chika-creamSoft/50 ring-1 ring-chika-cream rounded-lg p-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Masse totale du batch</label>
                      <div className="flex items-center gap-1 mt-1">
                        <input type="number" min="0" value={batchMassG} onChange={e => setBatchMassG(e.target.value)}
                          className="px-2 py-1.5 ring-1 ring-stone-300 rounded-lg text-sm w-full text-right tabular-nums"
                          placeholder="ex: 5600" />
                        <span className="text-xs text-stone-500">g</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Masse / sac</label>
                      <div className="flex items-center gap-1 mt-1">
                        <input type="number" min="0" value={unitMassG} onChange={e => setUnitMassG(e.target.value)}
                          className="px-2 py-1.5 ring-1 ring-stone-300 rounded-lg text-sm w-full text-right tabular-nums"
                          placeholder="ex: 200" />
                        <span className="text-xs text-stone-500">g</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Pertes / chutes</label>
                      <div className="flex items-center gap-1 mt-1">
                        <input type="number" min="0" max="100" step="1" value={lossPct} onChange={e => setLossPct(e.target.value)}
                          className="px-2 py-1.5 ring-1 ring-stone-300 rounded-lg text-sm w-full text-right tabular-nums"
                          placeholder="0" />
                        <span className="text-xs text-stone-500">%</span>
                      </div>
                    </div>
                  </div>

                  {yieldTheoretical !== null && (
                    <div className="text-xs text-stone-700 bg-white rounded-lg ring-1 ring-stone-300 p-3">
                      <div className="flex justify-between items-center">
                        <span>Rendement théorique <span className="text-stone-400">({batchMassG} g ÷ {unitMassG} g)</span></span>
                        <strong className="tabular-nums">{yieldTheoretical} sacs</strong>
                      </div>
                      {Number(lossPct) > 0 && (
                        <div className="flex justify-between items-center mt-1">
                          <span>Moins pertes {lossPct} %</span>
                          <span className="tabular-nums text-stone-500">−{yieldTheoretical - (yieldEffective ?? 0)} sacs</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-200">
                        <strong>Rendement effectif</strong>
                        <strong className="tabular-nums text-chika-paprika text-base">{yieldEffective} sacs</strong>
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={applyAutoYield}
                    disabled={!yieldEffective || yieldEffective <= 0}
                    className="w-full py-2 rounded-lg text-sm font-semibold bg-chika-paprika text-white hover:bg-chika-paprika/90 disabled:opacity-40 disabled:cursor-not-allowed">
                    Utiliser {yieldEffective ?? '—'} comme rendement
                  </button>

                  {batchYield && Number(batchYield) > 0 && (
                    <div className="text-[11px] text-stone-500 italic">
                      Rendement actuellement utilisé pour le calcul : <strong>{batchYield} sacs</strong>
                    </div>
                  )}
                </div>
              )}
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
                      <tr key={i} className="border-t border-stone-200">
                        <td className="px-4 py-2 align-top">
                          <IngredientPicker
                            value={l.name}
                            materialId={l.material_id ?? null}
                            materials={materials.data || []}
                            onPick={(m) => updateLine(i, {
                              material_id: m.id,
                              name: m.name,
                              unit: m.unit,
                              unit_price: Number(m.weighted_avg_price),
                            })}
                            onUnlink={() => updateLine(i, { material_id: null })}
                            onLabelChange={(name) => updateLine(i, { name, material_id: null })}
                            onCreateRequest={(name) => setQuickCreate({ idx: i, initialName: name })}
                          />
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
              <div className="p-3 border-t border-stone-200">
                <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addLine}>
                  Ajouter une ligne
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Coûts additionnels par sac (emballage + main d'œuvre) */}
          <Card className="mb-4">
            <CardHeader title="Coûts additionnels par sac"
              subtitle="Coûts hors matières premières, déjà PAR SAC produit. Ajoutés au coût matières/u." />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Sac sous vide / emballage</label>
                  <div className="flex items-center gap-1 mt-1">
                    <input type="number" step="0.01" min="0" value={packagingPerUnit}
                      onChange={e => setPackagingPerUnit(e.target.value)}
                      className="px-2 py-1.5 ring-1 ring-stone-300 rounded-lg text-sm w-full text-right tabular-nums"
                      placeholder="0.00" />
                    <span className="text-xs text-stone-500">$/sac</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Main d'œuvre</label>
                  <div className="flex items-center gap-1 mt-1">
                    <input type="number" step="0.01" min="0" value={laborPerUnit}
                      onChange={e => setLaborPerUnit(e.target.value)}
                      className="px-2 py-1.5 ring-1 ring-stone-300 rounded-lg text-sm w-full text-right tabular-nums"
                      placeholder="2.50" />
                    <span className="text-xs text-stone-500">$/sac</span>
                  </div>
                </div>
              </div>
              {(pkgPerUnit > 0 || lbrPerUnit > 0) && yieldNum > 0 && (
                <div className="mt-3 text-xs text-stone-600 bg-stone-50 rounded-lg p-3 space-y-1">
                  {pkgPerUnit > 0 && (
                    <div className="flex justify-between">
                      <span>Emballage : {pkgPerUnit.toFixed(2)} $/sac × {yieldNum} sacs</span>
                      <strong className="tabular-nums">{fmtCAD(pkgPerUnit * yieldNum)}</strong>
                    </div>
                  )}
                  {lbrPerUnit > 0 && (
                    <div className="flex justify-between">
                      <span>Main d'œuvre : {lbrPerUnit.toFixed(2)} $/sac × {yieldNum} sacs</span>
                      <strong className="tabular-nums">{fmtCAD(lbrPerUnit * yieldNum)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 mt-1 border-t border-stone-200">
                    <strong>Total additionnel pour ce batch</strong>
                    <strong className="tabular-nums text-chika-paprika">{fmtCAD((pkgPerUnit + lbrPerUnit) * yieldNum)}</strong>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Result */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Coût par unité</div>
                <div className="text-3xl font-bold text-chika-paprika tabular-nums">{fmtCADprecise(costPerUnit)}</div>
                {costPerUnit !== null && yieldNum > 0 && (
                  <div className="text-[11px] text-stone-500 mt-1 space-y-0.5">
                    <div>Matières : {fmtCADprecise(matPerUnit)} /u</div>
                    {pkgPerUnit > 0 && <div>+ Emballage : {fmtCADprecise(pkgPerUnit)} /u</div>}
                    {lbrPerUnit > 0 && <div>+ Main d'œuvre : {fmtCADprecise(lbrPerUnit)} /u</div>}
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
                  <span className="text-[11px] font-normal text-stone-400 ml-1">/u</span>
                </div>
                {currentUnitCost !== null && unitsPerBox > 0 && (
                  <div className="text-[11px] text-stone-500 mt-1">
                    = {fmtCAD(Number(currentUnitCost) * unitsPerBox)} / caisse
                  </div>
                )}
                {costDiff !== null && (
                  <Badge tone={costDiff > 0 ? 'warning' : costDiff < 0 ? 'success' : 'neutral'}>
                    {costDiff > 0 ? '+' : ''}{fmtCADprecise(costDiff)} /u
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

      {/* Modal quick-create matière (depuis n'importe quelle ligne de recette) */}
      {quickCreate && (
        <QuickCreateMaterialModal
          initialName={quickCreate.initialName}
          onClose={() => setQuickCreate(null)}
          onCreated={(m) => {
            // Auto-lier la matière fraichement créée à la ligne d'origine
            updateLine(quickCreate.idx, {
              material_id: m.id,
              name: m.name,
              unit: m.unit,
              unit_price: Number(m.weighted_avg_price) || null,
            })
            qc.invalidateQueries({ queryKey: ['materials'] })
            setQuickCreate(null)
          }}
        />
      )}
    </div>
  )
}

const inputCls = "w-full px-2 py-1.5 ring-1 ring-stone-300 rounded-md focus:ring-2 focus:ring-chika-paprika focus:outline-none text-sm bg-white"


// ─────────────────────────────────────────────────────────────────────────
// IngredientPicker : combobox typeahead + état "lié au catalogue" vs "libre".
// Pas de match par nom : le lien est SEULEMENT établi quand l'user clique une
// option du dropdown ou crée une matière via le CTA "+ Créer X".
// ─────────────────────────────────────────────────────────────────────────
function IngredientPicker({
  value, materialId, materials,
  onPick, onUnlink, onLabelChange, onCreateRequest,
}: {
  value: string
  materialId: number | null
  materials: Material[]
  onPick: (m: Material) => void
  onUnlink: () => void
  onLabelChange: (name: string) => void
  onCreateRequest: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  // Sync search local quand le value change depuis le parent (load recette)
  useEffect(() => { setSearch(value) }, [value])

  // Fermer au click extérieur
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const linked = materials.find(m => m.id === materialId) || null
  const q = search.trim().toLowerCase()
  const filtered = q
    ? materials.filter(m => m.name.toLowerCase().includes(q))
    : materials.slice(0, 12) // les 12 premiers si rien tapé
  const exactMatch = q && materials.some(m => m.name.toLowerCase() === q)

  // ── État LIÉ ──
  if (linked) {
    const stock = Number(linked.current_stock)
    const pmp = Number(linked.weighted_avg_price)
    return (
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-50 ring-1 ring-emerald-300/60 text-sm w-full">
          <Link2 size={13} className="text-emerald-600 shrink-0" />
          <span className="font-medium text-emerald-900 truncate flex-1">{linked.name}</span>
          <button
            type="button"
            onClick={onUnlink}
            className="text-emerald-700/60 hover:text-red-600 shrink-0"
            title="Délier du catalogue"
          >
            <Link2Off size={12} />
          </button>
        </div>
        <div className="text-[10px] text-emerald-700/70 pl-1">
          Stock {stock.toFixed(2)} {linked.unit} · PMP {pmp.toFixed(4)} $/{linked.unit}
        </div>
      </div>
    )
  }

  // ── État NON LIÉ ──
  return (
    <div ref={ref} className="relative space-y-1">
      <div className="inline-flex items-center gap-1.5 w-full">
        <AlertTriangle size={13} className="text-amber-500 shrink-0" />
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            onLabelChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Tape pour chercher une matière…"
          className={inputCls}
        />
      </div>
      <div className="text-[10px] text-amber-700/80 pl-5">
        Non lié au catalogue — stock matières ne sera pas décrémenté
      </div>

      {open && (
        <div className="absolute z-30 left-5 right-0 top-full mt-1 bg-white rounded-lg ring-1 ring-stone-300 shadow-xl max-h-72 overflow-y-auto">
          {filtered.length === 0 && !q && (
            <div className="px-3 py-3 text-xs text-stone-500 italic">
              Aucune matière dans ton catalogue. Crée-en une ci-dessous.
            </div>
          )}
          {filtered.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onPick(m); setOpen(false); setSearch(m.name) }}
              className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 text-sm flex items-center justify-between gap-3 border-b border-stone-100 last:border-0"
            >
              <span className="font-medium text-stone-900 truncate">{m.name}</span>
              <span className="text-[10px] text-stone-500 tabular-nums shrink-0">
                {m.unit} · {Number(m.weighted_avg_price).toFixed(2)} $/{m.unit}
              </span>
            </button>
          ))}
          {q && !exactMatch && (
            <button
              type="button"
              onClick={() => { onCreateRequest(search.trim()); setOpen(false) }}
              className="w-full text-left px-3 py-2.5 text-sm font-semibold text-chika-paprika hover:bg-chika-paprika/5 border-t border-stone-200 inline-flex items-center gap-2"
            >
              <Plus size={14} />
              Créer « {search.trim()} » dans le catalogue
            </button>
          )}
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────
// QuickCreateMaterialModal : créer une matière depuis la recette sans naviguer.
// ─────────────────────────────────────────────────────────────────────────
function QuickCreateMaterialModal({
  initialName, onClose, onCreated,
}: {
  initialName: string
  onClose: () => void
  onCreated: (m: Material) => void
}) {
  const [name, setName] = useState(initialName)
  const [unit, setUnit] = useState('kg')
  const [notes, setNotes] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: async () => {
      return createMaterial({
        name: name.trim(),
        unit: unit.trim(),
        notes: notes.trim() || null,
      })
    },
    onSuccess: onCreated,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Erreur création matière')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">Nouvelle matière première</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-stone-500">
          La matière sera ajoutée au catalogue et liée à cette ligne de recette. Le stock initial reste à 0 — tu pourras enregistrer un achat depuis la page Matières.
        </p>

        {serverError && (
          <div className="px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">⚠ {serverError}</div>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Nom</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls}
            placeholder="Ex: Arachides crues" autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Unité de stockage</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} className={inputCls}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-stone-500">
            L'unité dans laquelle tu suivras le stock (ex : kg, L). Tu peux utiliser une autre unité dans la recette si besoin.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Notes (optionnel)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">
            Annuler
          </button>
          <button type="button"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !name.trim()}
            className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {mut.isPending ? '…' : 'Créer et lier'}
          </button>
        </div>
      </div>
    </div>
  )
}

