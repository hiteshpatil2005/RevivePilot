# RevivePilot — Backend (FastAPI + PostgreSQL + Redis)

Autonomous AI Revenue Recovery Platform Backend built for the **Razorpay Buildathon — Track 03: AI Revenue Recovery**.

---

## Tech Stack
- **Framework**: FastAPI (Async)
- **Python**: 3.12+ (Tested on Python 3.13.5)
- **Database**: PostgreSQL 16+ via SQLAlchemy 2.0 Async + asyncpg
- **Migrations**: Alembic
- **Event Bus & Caching**: Redis 7+
- **Auth**: JWT (HS256) + Passlib (bcrypt)
- **Containerization**: Docker & Docker Compose

---

## Quick Start (Docker Compose)

The easiest way to start the complete stack (Database, Redis, FastAPI Backend, and React Client):

```bash
docker compose up --build
```

Access points:
- **FastAPI API**: [http://localhost:8000](http://localhost:8000)
- **Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **PostgreSQL**: `localhost:5432` (User: `postgres`, Password: `postgrespassword`)
- **Redis**: `localhost:6379`
- **React Frontend**: [http://localhost:5173](http://localhost:5173)

---

## Local Development Setup (Direct Python)

### 1. Environment & Virtualenv
```bash
cd server
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

### 2. Database Migrations
```bash
alembic upgrade head
```

### 3. Seed Development Data
Populates demo merchant (`admin@acme.com` / `demo123`), customers, transactions, recovery cases, policies, and audit logs:
```bash
python scripts/seed.py
```

### 4. Run Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Running Tests
```bash
cd server
pytest
```

---

## API Endpoints Overview

| Domain | Route | Method | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `/api/health` | GET | Status of API, DB, and Redis |
| **Auth** | `/api/auth/register` | POST | Register merchant and owner |
| | `/api/auth/login` | POST | Login and receive JWT bearer token |
| | `/api/auth/me` | GET | Current merchant user profile |
| | `/api/auth/logout` | POST | Invalidate current session |
| **Dashboard** | `/api/dashboard/metrics` | GET | Live revenue at risk and recovery rate |
| | `/api/dashboard/live-activity` | GET | Recent recovery stream |
| **Transactions** | `/api/transactions` | GET | Merchant-scoped transactions list |
| | `/api/transactions/{id}` | GET | Single transaction detail |
| **Recovery** | `/api/recovery/cases` | GET | Filterable recovery cases |
| | `/api/recovery/cases/{id}` | GET | Case diagnosis, timeline, and checks |
| | `/api/recovery/cases/{id}/retry` | POST | Trigger retry intervention |
| | `/api/recovery/cases/{id}/stop` | POST | Halt autonomous actions |
| | `/api/recovery/cases/{id}/escalate` | POST | Move case to manual review |
| **Policies** | `/api/policies` | GET | Merchant bounded autonomy rules |
| | `/api/policies/{id}` | PUT | Update policy configuration |
| | `/api/policies/evaluate` | POST | Dry-run policy simulation |
| **Analytics** | `/api/analytics/overview` | GET | Aggregated revenue summary |
| **Audit** | `/api/audit-logs` | GET | Immutable audit trail |
| **WebSocket** | `/ws` | WS | Real-time event gateway |
