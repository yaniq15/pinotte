import { useState, useEffect } from 'react'
import { todayISO } from '../lib/dates'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '../hooks/useAuth'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { loadCompanyInfo, saveCompanyInfo, type CompanyInfo } from '../lib/companyInfo'
import { loadLabelSettings, saveLabelSettings, DEFAULT_LABEL_SETTINGS, type LabelSettings } from '../lib/labelSettings'
import { listCashSnapshots, createCashSnapshot } from '../api/pme'
import { inviteUser, listUsers, type UserInviteResult } from '../api/users'
import { changePassword } from '../api/auth'
import { useT, useLang } from '../lib/i18n'
import { BRAND } from '../lib/brand'
import { Save, CheckCircle2, Languages, UserPlus, Copy, Check, KeyRound, Eye, EyeOff, AlertTriangle, Tag } from 'lucide-react'

export default function SettingsPage() {
  const { data: user } = useCurrentUser()
  const t = useT()
  const [lang, setLang] = useLang()
  if (!user) return null
  const locale = lang === 'fr' ? 'fr-CA' : 'en-CA'
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-4xl">
      <PageHeader title={t('settings.title')} description="Informations de compte et configuration." />

      {user.must_change_password && (
        <div className="mb-6 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Mot de passe temporaire détecté</p>
            <p className="text-sm text-amber-800 mt-0.5">
              Tu utilises encore le mot de passe temporaire reçu par invitation. Change-le ci-dessous avant d'accéder au reste de Pinotte.
            </p>
          </div>
        </div>
      )}

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
          <CardHeader title={`À propos de ${BRAND.name}`} subtitle={lang === 'en' ? BRAND.taglineEn : BRAND.tagline} />
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

      {/* Sécurité du compte — tous les users connectés peuvent changer leur password */}
      <ChangePasswordCard />

      {/* Solde bancaire pour cash runway */}
      <CashSnapshotCard />

      {/* Informations entreprise — apparaissent sur les factures PDF */}
      <CompanyInfoCard />

      {/* Personnalisation des étiquettes de lot */}
      <LabelSettingsCard />

      {/* OWNER uniquement : inviter un nouveau membre */}
      {user.role === 'OWNER' && <InviteUserCard />}
    </div>
  )
}

function LabelSettingsCard() {
  const [s, setS] = useState<LabelSettings>(loadLabelSettings())
  const [saved, setSaved] = useState(false)

  useEffect(() => { setS(loadLabelSettings()) }, [])

  function set<K extends keyof LabelSettings>(key: K, value: LabelSettings[K]) {
    setS(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }
  function save() {
    saveLabelSettings(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Card className="mb-6">
      <CardHeader
        title="🏷️ Étiquettes de lot"
        subtitle="Personnalise l'apparence de tes étiquettes imprimées. Réglages appliqués à toutes les étiquettes."
      />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Colonne réglages */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Format par défaut</label>
              <div className="inline-flex rounded-lg ring-1 ring-stone-300 overflow-hidden w-full">
                <button type="button" onClick={() => set('defaultFormat', 'small')}
                  className={`flex-1 px-3 py-2 text-sm font-medium ${s.defaultFormat === 'small' ? 'bg-chika-paprika text-white' : 'bg-white text-stone-700'}`}>
                  Petite · 24/page
                </button>
                <button type="button" onClick={() => set('defaultFormat', 'large')}
                  className={`flex-1 px-3 py-2 text-sm font-medium border-l border-stone-300 ${s.defaultFormat === 'large' ? 'bg-chika-paprika text-white' : 'bg-white text-stone-700'}`}>
                  Grande · 2/page
                </button>
              </div>
            </div>

            <Toggle label="Afficher la marque" checked={s.showBrand} onChange={v => set('showBrand', v)} />
            {s.showBrand && (
              <div className="pl-6 space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 mb-1">Texte de marque</label>
                  <input value={s.brandText} onChange={e => set('brandText', e.target.value)}
                    className="w-full px-3 py-1.5 ring-1 ring-stone-300 rounded-lg text-sm" placeholder="CHIKA" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 mb-1">Couleur de la marque</label>
                  <input type="color" value={s.accentColor} onChange={e => set('accentColor', e.target.value)}
                    className="h-8 w-16 rounded ring-1 ring-stone-300 cursor-pointer" />
                </div>
              </div>
            )}
            <Toggle label="Afficher le nom du produit" checked={s.showProductName} onChange={v => set('showProductName', v)} />
            <Toggle label="Afficher le numéro de lot" checked={s.showLotNumber} onChange={v => set('showLotNumber', v)} />
            <Toggle label="Afficher la date de production" checked={s.showProductionDate} onChange={v => set('showProductionDate', v)} />
            <Toggle label="Afficher la date d'expiration" checked={s.showExpiryDate} onChange={v => set('showExpiryDate', v)} />
            <Toggle label="Afficher le code-barres GS1" checked={s.showBarcode} onChange={v => set('showBarcode', v)} />
          </div>

          {/* Colonne aperçu */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1">
              <Tag size={12} /> Aperçu
            </div>
            <div className="bg-stone-100 rounded-lg p-4 flex items-center justify-center min-h-[140px]">
              <div className="bg-white ring-1 ring-stone-300 rounded-md p-3 w-56 shadow-sm">
                {s.showBrand && (
                  <div className="text-sm font-black tracking-widest" style={{ color: s.accentColor }}>
                    {s.brandText || 'MARQUE'}
                  </div>
                )}
                {s.showProductName && (
                  <div className="text-sm font-bold text-stone-900 mt-0.5">Chikanda à l'arachide</div>
                )}
                {s.showLotNumber && (
                  <div className="text-xs mt-1">
                    <span className="text-stone-400 uppercase text-[9px] tracking-wider">Lot </span>
                    <span className="font-bold tabular-nums">L-2026-05</span>
                  </div>
                )}
                {(s.showProductionDate || s.showExpiryDate) && (
                  <div className="flex justify-between mt-1.5 text-[10px]">
                    {s.showProductionDate && (
                      <div>
                        <div className="text-stone-400 uppercase tracking-wider">Production</div>
                        <div className="font-semibold">21 mai 2026</div>
                      </div>
                    )}
                    {s.showExpiryDate && (
                      <div>
                        <div className="text-stone-400 uppercase tracking-wider">Expiration</div>
                        <div className="font-semibold">21 juil. 2026</div>
                      </div>
                    )}
                  </div>
                )}
                {s.showBarcode && (
                  <div className="mt-2 flex justify-center">
                    <div className="font-mono text-[8px] text-stone-500 tracking-tight">▌▎▌▌▎▌▎▎▌▌▎▌▎ 0627843…</div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-stone-500 mt-2 italic">
              Le code-barres réel se définit par produit (champ GTIN dans la fiche produit).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 pt-3">
          <button type="button" onClick={() => setS(DEFAULT_LABEL_SETTINGS)}
            className="text-xs text-stone-500 hover:text-chika-paprika">
            Réinitialiser aux valeurs par défaut
          </button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-700">
                <CheckCircle2 size={14} /> Enregistré
              </span>
            )}
            <Button onClick={save} icon={<Save size={14} />}>Enregistrer</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="accent-chika-paprika w-4 h-4" />
      <span className="text-stone-700">{label}</span>
    </label>
  )
}

function ChangePasswordCard() {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function clientValidate(): string | null {
    if (newPw.length < 8) return 'Le nouveau mot de passe doit faire au moins 8 caractères'
    if (!/\d/.test(newPw)) return 'Le nouveau mot de passe doit contenir au moins 1 chiffre'
    if (newPw !== confirmPw) return 'La confirmation ne correspond pas au nouveau mot de passe'
    if (newPw === currentPw) return 'Le nouveau mot de passe doit être différent de l\'actuel'
    return null
  }

  const mut = useMutation({
    mutationFn: () => changePassword(currentPw, newPw),
    onSuccess: () => {
      setSuccess(true)
      setError(null)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => setSuccess(false), 4000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Erreur lors du changement de mot de passe')
    },
  })

  function handleSubmit() {
    const localErr = clientValidate()
    if (localErr) {
      setError(localErr)
      return
    }
    setError(null)
    mut.mutate()
  }

  return (
    <Card className="mb-6">
      <CardHeader
        title="Sécurité du compte"
        subtitle="Change ton mot de passe"
        action={<KeyRound size={18} className="text-stone-400" />}
      />
      <CardBody className="space-y-4 max-w-md">
        <PasswordField
          label="Mot de passe actuel"
          value={currentPw}
          onChange={setCurrentPw}
          show={showCurrent}
          onToggle={() => setShowCurrent(s => !s)}
          placeholder="Ton password actuel (ou temp password reçu)"
        />
        <PasswordField
          label="Nouveau mot de passe"
          value={newPw}
          onChange={setNewPw}
          show={showNew}
          onToggle={() => setShowNew(s => !s)}
          placeholder="Min 8 caractères + 1 chiffre"
        />
        <PasswordField
          label="Confirmer le nouveau"
          value={confirmPw}
          onChange={setConfirmPw}
          show={showNew}
          onToggle={() => setShowNew(s => !s)}
          placeholder="Re-saisis le nouveau mot de passe"
        />
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠ {error}</p>
        )}
        {success && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 flex items-center gap-2">
            <CheckCircle2 size={16} /> Mot de passe changé avec succès.
          </p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={mut.isPending || !currentPw || !newPw || !confirmPw}
          className="inline-flex items-center gap-2"
        >
          <KeyRound size={16} />
          {mut.isPending ? 'Mise à jour...' : 'Changer le mot de passe'}
        </Button>
      </CardBody>
    </Card>
  )
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-stone-500 mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 text-sm rounded-md ring-1 ring-stone-300 focus:ring-2 focus:ring-chika-paprika focus:outline-none"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 transition"
          aria-label={show ? 'Masquer' : 'Afficher'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

function InviteUserCard() {
  const qc = useQueryClient()
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'OWNER' | 'USER'>('USER')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UserInviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const mut = useMutation({
    mutationFn: () => inviteUser({ name: name.trim(), email: email.trim(), role }),
    onSuccess: (data) => {
      setResult(data)
      setError(null)
      setName('')
      setEmail('')
      setRole('USER')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Erreur lors de la création du compte')
    },
  })

  async function handleCopyPassword() {
    if (!result) return
    await navigator.clipboard.writeText(result.temp_password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader
        title="Inviter un membre"
        subtitle="Créer un compte pour un partenaire ou employé"
        action={<UserPlus size={18} className="text-stone-400" />}
      />
      <CardBody className="space-y-4">
        {result && (
          <div className="rounded-lg border-2 border-chika-paprika/40 bg-chika-creamSoft/60 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-stone-800">
                  Compte créé pour {result.user.name} ({result.user.email})
                </p>
                <p className="text-xs text-stone-600 mt-1">
                  Rôle : <Badge tone={result.user.role === 'OWNER' ? 'paprika' : 'neutral'}>{result.user.role}</Badge>
                </p>
              </div>
            </div>
            <div className="rounded-md bg-white ring-1 ring-stone-300 p-3">
              <p className="text-xs uppercase tracking-wider text-stone-500 mb-1.5">
                Mot de passe temporaire — à partager UNE FOIS avec l'invité
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm bg-stone-50 px-3 py-2 rounded select-all">
                  {result.temp_password}
                </code>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-stone-800 text-white hover:bg-stone-700 transition"
                >
                  {copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-2">
                ⚠ Ce mot de passe ne sera plus jamais affiché. Partage-le maintenant via Signal, mail perso, ou en personne.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="text-xs text-stone-600 underline hover:text-stone-800"
            >
              Fermer et inviter un autre membre
            </button>
          </div>
        )}

        {!result && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Nom" value={name} onChange={setName} placeholder="Prénom Nom" />
              <FormField label="Email" value={email} onChange={setEmail} placeholder="partenaire@exemple.com" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-500 mb-1.5 block">Rôle</label>
              <div className="inline-flex rounded-lg ring-1 ring-stone-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRole('USER')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    role === 'USER' ? 'bg-stone-800 text-white' : 'bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  USER (accès limité)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('OWNER')}
                  className={`px-4 py-2 text-sm font-medium border-l border-stone-300 transition ${
                    role === 'OWNER' ? 'bg-chika-paprika text-white' : 'bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  OWNER (accès complet)
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠ {error}</p>}
            <Button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !name.trim() || !email.trim()}
              className="inline-flex items-center gap-2"
            >
              <UserPlus size={16} />
              {mut.isPending ? 'Création...' : 'Créer le compte'}
            </Button>
          </>
        )}

        {usersQuery.data && usersQuery.data.length > 0 && (
          <div className="pt-4 border-t border-stone-200">
            <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">
              Membres actuels ({usersQuery.data.length})
            </p>
            <ul className="space-y-1.5 text-sm">
              {usersQuery.data.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-1">
                  <span>
                    <span className="font-medium">{u.name}</span>
                    <span className="text-stone-500"> · {u.email}</span>
                  </span>
                  <Badge tone={u.role === 'OWNER' ? 'paprika' : 'neutral'}>{u.role}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
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
  const [date, setDate] = useState(todayISO())
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
