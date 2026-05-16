# Chika

Application de gestion d'inventaire et opérations pour entreprise alimentaire (Québec).
Produits, lots de production, ventes (courtier/magasin), dépenses, dashboard mensuel.

## Stack

- **Backend** : FastAPI + SQLAlchemy 2 + Alembic + Postgres 15 + JWT + bcrypt + pytest
- **Frontend** : React 18 + Vite + TypeScript strict + Tailwind + TanStack Query + React Router + RHF/Zod + Recharts + axios + lucide-react
- **DB** : Postgres via Docker Compose

## Quickstart local

### 1. Postgres
```bash
docker compose up -d
```
Postgres écoute sur `localhost:5433` (user/pwd/db : `chika` / `chika_dev_pwd` / `chika`).

### 2. Backend
```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Édite .env si besoin (en particulier JWT_SECRET_KEY)
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
API sur http://localhost:8000 — health : `GET /health`. Docs OpenAPI : http://localhost:8000/docs.

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
UI sur http://localhost:5173.

## Décisions techniques

- **bcrypt direct** au lieu de `passlib[bcrypt]` (incompatibilité passlib 1.7 ↔ bcrypt 5+, et on n'a pas besoin de la flexibilité multi-algo de passlib).
- **Postgres exposé sur 5433** (pas 5432) pour éviter les conflits avec un Postgres natif éventuellement installé sur le port standard.
- **JWT en `sub: str(user_id)`** — la spec JWT exige `sub` string, on cast lors de l'encodage et reconvertit en int au décodage.
- **TimestampMixin** sur tous les modèles (created_at + updated_at, `TIMESTAMP WITH TIME ZONE`).

## Phases livrées

- ✅ **Phase 1** : setup + auth (users, JWT, login, register, me)
- ⏳ Phase 2 : catalogue produits + lots
- ⏳ Phase 3 : inventaire + mouvements
- ⏳ Phase 4 : clients + ventes
- ⏳ Phase 5 : dépenses
- ⏳ Phase 6 : dashboard + rapports
- ⏳ Phase 7 : polish + déploiement

## Tests

```bash
cd backend
source .venv/bin/activate
pytest -v
```

## Structure

```
chika-app/
├── backend/
│   ├── app/
│   │   ├── core/        # config, security, database
│   │   ├── models/      # SQLAlchemy
│   │   ├── schemas/     # Pydantic
│   │   ├── crud/        # toute logique DB
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── routes/  # auth, products, ...
│   │   └── main.py
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/         # clients axios
│   │   ├── components/  # ui + shared
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/         # axios config, utils
│   │   └── types/
│   ├── package.json
│   └── tailwind.config.js
├── docker-compose.yml
└── README.md
```
