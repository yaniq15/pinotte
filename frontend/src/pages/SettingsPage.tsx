import { useCurrentUser } from '../hooks/useAuth'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

export default function SettingsPage() {
  const { data: user } = useCurrentUser()
  if (!user) return null
  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl">
      <PageHeader title="Mon profil" description="Informations de compte et configuration." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
