import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '../hooks/useAuth'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { loadCompanyInfo, saveCompanyInfo, type CompanyInfo } from '../lib/companyInfo'
import { listCashSnapshots, createCashSnapshot } from '../api/pme'
import { useT, useLang } from '../lib/i18n'
import { BRAND } from '../lib/brand'
import { Save, CheckCircle2, Languages } from 'lucide-react'

export default function SettingsPage() {
  const { data: user } = useCurrentUser()
  const t = useT()
  const [lang, setLang] = useLang()
  if (!user) return null
  const locale = lang === 'fr' ? 'fr-CA' : 'en-CA'
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-4xl">
      <PageHeader title={t('settings.title')} description="Informations de compte et configuration." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader title={t('settings.account')} />
          <CardBody className="space-y-3 text-sm">
            <Row label={t('label.name')} value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="Rôle" value={<Badge tone="paprika">{user.role}</Badge>} />
            <Row label={t('label.status')} value={user.active ? <Badge tone="success">Actif</Badge> : <Badge tone="neutral">Inactif</Badge>} />
            <Row label="Inscrit le" value={new Date(user.created_at).toLocaleDateString(locale,
              { day: '2-digit', month: 'long', year: 'numeric' })} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('settings.lang_label')}
            subtitle="Language / Langue"
            action={<Languages size={16} className="text-stone-400" />}
          />
          <CardBody>
            <div className="inline-flex rounded-lg ring-1 ring-stone-300 overflow-hidden w-full">
              <button
                type="button"
                onClick={() => setLang('fr')}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold transition ${
                  lang === 'fr'
                    ? 'bg-chika-paprika text-white'
                    : 'bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                🇫🇷 {t('settings.lang_fr')}
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold border-l border-stone-300 transition ${
                  lang === 'en'
                    ? 'bg-chika-paprika text-white'
                    : 'bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                🇬🇧 {t('settings.lang_en')}
              </button>
            </div>
            <p className="text-xs text-stone-500 mt-3">
              {lang === 'fr'
                ? 'Le choix est sauvegardé localement dans ce navigateur.'
                : 'Your choice is saved locally in this browser.'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`À propos de ${BRAND.name}`} subtitle={BRAND.tagline} />
          <CardBody className="space-y-3 text-sm text-stone-700">
            <p>
              {BRAND.name} gère ton catalogue de produits, lots de production, ventes (courtier + magasin direct),
              dépenses, événements et calcule automatiquement marges, stock courant et rapports mensuels.
            </p>
            <p className="text-xs text-stone-500">
              Stack : FastAPI + PostgreSQL · React + TypeScript + Tailwind · Docker.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Solde bancaire pour cash runway */}
      <CashSnapshotCard />

      {/* Informations entreprise — apparaissent sur les factures PDF */}
      <CompanyInfoCard />
    </div>
  )
}

function CashSnapshotCard() {
  const qc = useQueryClient()
  const { data: snaps = [] } = useQuery({ queryKey: ['cash-snapshots'], queryFn: listCashSnapshots })
  const [showForm, setShowForm] = useState(false)
  const latest = snaps[0]

  return (
    <Card className="mb-6">
      <CardHeader
        title="💰 Solde bancaire — pour calcul du cash runway"
        subtitle="Saisis ton solde bancaire 1×/mois pour que Pinotte calcule combien de mois tu peux survivre au burn rate actuel."
        action={
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
            + Nouveau snapshot
          </Button>
        }
      />
      <CardBody>
        {latest ? (
          <div>
            <div className="text-3xl font-bold text-chika-paprika tabular-nums">
              {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(Number(latest.balance))}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              Au {new Date(latest.snapshot_date).toLocaleDateString('fr-CA')}
            </div>
            <div className="mt-3 text-xs text-stone-600">
              {snaps.length} snapshot(s) enregistré(s) au total.
            </div>
          </div>
        ) : (
          <div className="text-sm text-stone-500 italic">
            Aucun solde enregistré. Clique "+ Nouveau snapshot" pour commencer.
          </div>
        )}
      </CardBody>
      {showForm && <CashSnapshotForm onClose={() => setShowForm(false)} onSaved={() => {
        qc.invalidateQueries({ queryKey: ['cash-snapshots'] })
        qc.invalidateQueries({ queryKey: ['cash-runway'] })
        qc.invalidateQueries({ queryKey: ['alerts'] })
        setShowForm(false)
      }} />}
    </Card>
  )
}

function CashSnapshotForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [balance, setBalance] = useState('')
  const [notes, setNotes] = useState('')
  const mut = useMutation({
    mutationFn: () => createCashSnapshot({ snapshot_date: date, balance: Number(balance), notes: notes || undefined }),
    onSuccess: onSaved,
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-stone-900">Nouveau snapshot bancaire</h3>
        <p className="text-xs text-stone-500">
          Saisis le solde de tous tes comptes business combinés à la date donnée.
        </p>
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 ring-1 ring-stone-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Solde ($CAD)</label>
          <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)}
            className="w-full px-3 py-2 ring-1 ring-stone-300 rounded-lg text-sm" placeholder="Ex: 18500.50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Notes (optionnel)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 ring-1 ring-stone-300 rounded-lg text-sm" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Annuler</button>
          <button onClick={() => mut.mutate()} disabled={!balance || mut.isPending}
            className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {mut.isPending ? '…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CompanyInfoCard() {
  const [info, setInfo] = useState<CompanyInfo>(loadCompanyInfo())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setInfo(loadCompanyInfo())
  }, [])

  function update(field: keyof CompanyInfo, value: string) {
    setInfo(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function save() {
    saveCompanyInfo(info)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Card>
      <CardHeader title="Informations entreprise (factures)"
        subtitle="Ces données apparaîtront sur tous les PDFs de facture générés depuis Ventes." />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Nom de l'entreprise" value={info.name} onChange={v => update('name', v)} placeholder="ALIMENTS CHIKA" />
          <FormField label="Slogan / Tagline" value={info.tagline} onChange={v => update('tagline', v)} placeholder="Mets traditionnels africains" />
          <FormField label="Adresse — ligne 1" value={info.address1} onChange={v => update('address1', v)} placeholder="123 rue Principale" />
          <FormField label="Adresse — ligne 2" value={info.address2} onChange={v => update('address2', v)} placeholder="Brossard, QC J4Z 0A0" />
          <FormField label="Téléphone" value={info.phone} onChange={v => update('phone', v)} placeholder="514-555-0123" />
          <FormField label="Email" value={info.email} onChange={v => update('email', v)} placeholder="contact@alimentschika.qc" />
          <FormField label="N° TPS (obligatoire si CA > 30 k$)" value={info.tpsNumber} onChange={v => update('tpsNumber', v)} placeholder="123456789 RT0001" />
          <FormField label="N° TVQ" value={info.tvqNumber} onChange={v => update('tvqNumber', v)} placeholder="1234567890 TQ0001" />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider font-bold text-stone-500 mb-1 block">
            Conditions de paiement
          </label>
          <textarea
            value={info.paymentTerms}
            onChange={e => update('paymentTerms', e.target.value)}
            rows={2}
            placeholder="Net 30 jours. Paiement par virement bancaire..."
            className="w-full px-3 py-2 ring-1 ring-stone-300 rounded-lg focus:ring-2 focus:ring-chika-paprika focus:outline-none text-sm bg-white resize-y"
          />
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 pt-3">
          <div className="text-xs text-stone-500">
            💾 Sauvegardé dans ce navigateur. Si tu changes de PC, refais cette config.
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-700">
                <CheckCircle2 size={14} /> Enregistré
              </span>
            )}
            <Button onClick={save} icon={<Save size={14} />}>
              Enregistrer
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function FormField({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider font-bold text-stone-500 mb-1 block">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 ring-1 ring-stone-300 rounded-lg focus:ring-2 focus:ring-chika-paprika focus:outline-none text-sm bg-white"
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-2 last:border-0 last:pb-0">
      <span className="text-stone-500 text-xs uppercase tracking-wider">{label}</span>
      <span className="font-medium text-stone-900 text-right">{value}</span>
    </div>
  )
}
