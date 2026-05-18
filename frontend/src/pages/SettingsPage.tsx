import { useState, useEffect } from 'react'
import { useCurrentUser } from '../hooks/useAuth'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { loadCompanyInfo, saveCompanyInfo, type CompanyInfo } from '../lib/companyInfo'
import { Save, CheckCircle2 } from 'lucide-react'

export default function SettingsPage() {
  const { data: user } = useCurrentUser()
  if (!user) return null
  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl">
      <PageHeader title="Mon profil" description="Informations de compte et configuration." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader title="Compte" />
          <CardBody className="space-y-3 text-sm">
            <Row label="Nom" value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="Rôle" value={<Badge tone="paprika">{user.role}</Badge>} />
            <Row label="Statut" value={user.active ? <Badge tone="success">Actif</Badge> : <Badge tone="neutral">Inactif</Badge>} />
            <Row label="Inscrit le" value={new Date(user.created_at).toLocaleDateString('fr-CA',
              { day: '2-digit', month: 'long', year: 'numeric' })} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="À propos de Chika" subtitle="Application de gestion d'inventaire et opérations" />
          <CardBody className="space-y-3 text-sm text-stone-700">
            <p>
              Chika gère ton catalogue de produits, lots de production, ventes (courtier + magasin direct),
              dépenses, et calcule automatiquement marges, stock courant et rapports mensuels.
            </p>
            <p className="text-xs text-stone-500">
              Stack : FastAPI + PostgreSQL · React + TypeScript + Tailwind · Docker.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Informations entreprise — apparaissent sur les factures PDF */}
      <CompanyInfoCard />
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

        <div className="flex items-center justify-between border-t border-stone-100 pt-3">
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
    <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-2 last:border-0 last:pb-0">
      <span className="text-stone-500 text-xs uppercase tracking-wider">{label}</span>
      <span className="font-medium text-stone-900 text-right">{value}</span>
    </div>
  )
}
