# RevivePilot — Autonomous AI Revenue Recovery Platform

> **Don't just retry. Recover intelligently.**

RevivePilot is a real-time, multi-agent AI platform that transforms failed payment events into intelligent, adaptive recovery actions. Instead of blindly retrying declined transactions, it reasons through failure cause, customer context, payment history, merchant policy, and recovery probability — then executes with auditable, bounded autonomy.

---

## Table of Contents

1. [What Is RevivePilot?](#what-is-revivepilot)
2. [The Problem With Simple Retries](#the-problem-with-simple-retries)
3. [Architecture Overview](#architecture-overview)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Frontend Applications](#frontend-applications)
7. [Backend](#backend)
8. [Database Schema](#database-schema)
9. [Authentication & Authorization](#authentication--authorization)
10. [Realtime System (Socket.IO)](#realtime-system-socketio)
11. [Payment Simulation Engine](#payment-simulation-engine)
12. [Failure Taxonomy (25 Types)](#failure-taxonomy-25-types)
13. [Multi-Agent Pipeline](#multi-agent-pipeline)
14. [AI / Google Gemini Integration](#ai--google-gemini-integration)
15. [Policy Engine & Guardrails](#policy-engine--guardrails)
16. [Recovery Case Lifecycle](#recovery-case-lifecycle)
17. [Smart Recovery Links](#smart-recovery-links)
18. [Email Service](#email-service)
19. [Customer Experience](#customer-experience)
20. [Merchant Cockpit](#merchant-cockpit)
21. [API Reference](#api-reference)
22. [Realtime Events](#realtime-events)
23. [Environment Variables](#environment-variables)
24. [Docker Setup](#docker-setup)
25. [Installation & Running Locally](#installation--running-locally)
26. [Database Initialization](#database-initialization)
27. [Testing](#testing)
28. [Scripts & Utilities](#scripts--utilities)
29. [Audit Trail](#audit-trail)
30. [Security](#security)
31. [Troubleshooting](#troubleshooting)
32. [Project Limitations](#project-limitations)
33. [Production Hardening](#production-hardening)
34. [Future Enhancements](#future-enhancements)
35. [Developer Notes](#developer-notes)

---

## What Is RevivePilot?

RevivePilot sits between a **Merchant (Business A)** and their **Customers**, intercepting payment failures as they happen and orchestrating a reasoned, multi-step recovery strategy before revenue is permanently lost.

```
┌──────────────────────────────────────────────┐
│              BUSINESS A — MERCHANT           │
│         Cockpit: localhost:3000              │
└───────────────────┬──────────────────────────┘
                    │  HTTP + Socket.IO
                    ▼
┌──────────────────────────────────────────────┐
│             REVIVEPILOT ENGINE               │
│    FastAPI · PostgreSQL · Redis · Socket.IO  │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Detection │→│Root Cause│→│ Strategy │→...  │
│  │  Agent   │ │  Agent   │ │  Agent   │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│        Google Gemini 2.5 Flash + Heuristic   │
└───────────────────┬──────────────────────────┘
                    │  HTTP + Socket.IO
                    ▼
┌──────────────────────────────────────────────┐
│         CUSTOMER / END-USER PORTAL           │
│         Portal: localhost:3001               │
└──────────────────────────────────────────────┘
```

---

## The Problem With Simple Retries

The naive approach: `Payment Failed → Retry`. RevivePilot reasons across all of:

| Factor | Why It Matters |
|--------|---------------|
| **Failure Reason** | A network timeout is retryable; a fraud decline is not |
| **Customer Context** | A VIP enterprise client requires escalation, not automation |
| **Payment History** | 5+ consecutive failures should halt recovery |
| **Previous Attempts** | Past the limit risks payment processor bans |
| **Amount** | High-value payments require merchant approval |
| **Recoverability** | Mandate-revoked: 45%; network errors: 92% |
| **Timing** | Bank downtime → wait; wrong card details → immediate customer action |
| **Merchant Policies** | Max retry caps, VIP escalation, stopping conditions |
| **Customer Response** | "I'll pay tomorrow" changes the entire strategy |
| **Current State** | An active recovery link means no new one should be generated |

---

## Architecture Overview

### System Architecture

```mermaid
graph TB
    subgraph Frontends
        M["Merchant Cockpit (React+Vite :3000)"]
        C["Customer Portal (React+Vite :3001/5174)"]
    end
    subgraph Backend ["FastAPI Backend (:8000)"]
        API[REST API /api/]
        SIO[Socket.IO /socket.io]
        SUBS[Redis Subscriber Background]
    end
    subgraph Agents ["Multi-Agent Pipeline"]
        DA[Detection Agent]
        RCA[Root Cause Agent]
        SA[Strategy Agent]
        AA[Action Agent]
        LLM["LLM Adapter (Gemini 2.5 Flash + Heuristic Fallback)"]
    end
    subgraph Infra
        PG[(PostgreSQL 16)]
        RD[(Redis 7)]
        SMTP[SMTP Mailer Gmail/TLS]
    end
    M -->|axios HTTP + JWT| API
    M -->|Socket.IO auth token| SIO
    C -->|axios HTTP + JWT| API
    C -->|Socket.IO auth token| SIO
    API --> PG
    API --> DA
    DA --> RCA --> SA --> AA
    DA & RCA & SA & AA --> LLM
    SIO --> RD
    SUBS --> RD
    SUBS -->|emit_to_merchant/customer| SIO
    API --> SMTP
```

### Data Flow: Payment Failure → Recovery

```
1. Customer triggers payment in Customer Portal
2. POST /api/customer/payments/simulate → Backend
3. Transaction persisted: status=FAILED
4. RecoveryCase persisted: status=DETECTED
5. AgentCoordinator.analyze_case():
   ├── DetectionAgent  → risk/urgency classification
   ├── RootCauseAgent  → operational root cause
   ├── StrategyAgent   → multi-step plan + ERV
   └── ActionAgent     → policy validation + action enum
6. RecoveryCase updated: strategy, next_action, smart_link_required
7. AuditLog + AgentExecution persisted
8. If GENERATE_RECOVERY_LINK:
   ├── secrets.token_urlsafe(32) → stored in DB
   ├── Recovery email dispatched via SMTP
   └── Socket.IO events emitted to customer and merchant rooms
9. Customer sees agent-conditional button
10. Merchant sees live case in cockpit
```

---

## Tech Stack

### Backend

| Technology | Version | Role |
|-----------|---------|------|
| Python | 3.12 | Runtime |
| FastAPI | ≥0.115 | Web framework + REST API |
| SQLAlchemy (async) | ≥2.0 | ORM |
| asyncpg | ≥0.29 | Async PostgreSQL driver |
| Alembic | ≥1.13 | Database migrations |
| redis-py | ≥5.0 | Event bus + OTP cache |
| python-socketio | ≥5.16 | Socket.IO ASGI server |
| python-jose | ≥3.3 | JWT HS256 signing |
| passlib + bcrypt | ≥1.7 | Password hashing |
| google-generativeai | ≥0.8 | Gemini AI reasoning |
| smtplib / aiosmtplib | ≥3.0 | SMTP email |
| pydantic v2 | ≥2.9 | Schema validation |
| uvicorn | ≥0.30 | ASGI server |
| pytest + pytest-asyncio | ≥8.3 | Tests |

### Frontend — Merchant Cockpit (`client/`)

| Technology | Version | Role |
|-----------|---------|------|
| React | 19 | UI |
| Vite | 8 | Build |
| TailwindCSS | v4 | Styling |
| React Router | v7 | Routing |
| Recharts | v3 | Analytics charts |
| Axios | ≥1.20 | HTTP |
| Socket.IO Client | v4 | Realtime |
| Lucide React | ≥1.37 | Icons |

### Frontend — Customer Portal (`client-user/`)

| Technology | Version | Role |
|-----------|---------|------|
| React | 19 | UI |
| Vite | 8 | Build |
| TailwindCSS | v4 | Styling |
| React Router | v7 | Routing |
| Axios | ≥1.20 | HTTP |
| Socket.IO Client | v4 | Realtime |
| Lucide React | ≥1.37 | Icons |

### Infrastructure

| Technology | Version | Role |
|-----------|---------|------|
| PostgreSQL | 16-alpine | Primary database |
| Redis | 7-alpine | Event bus + OTP cache |
| Docker + Compose | — | Container orchestration |
| Node.js | 20-alpine | Frontend runtime |

---

## Project Structure

```
RevivePilot/
├── .env.example
├── docker-compose.yml
├── server/                    # FastAPI backend
│   ├── Dockerfile             # python:3.12-slim
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/versions/
│   │   ├── 0001_initial_schema.py
│   │   ├── 0002_payment_events.py
│   │   └── 0003_agentic_recovery_upgrade.py
│   ├── scripts/
│   │   ├── seed.py, clean_and_seed_merchant.py
│   │   ├── run_all_scenarios_live.py
│   │   ├── test_user_scenarios.py, test_live_gemini.py
│   ├── tests/
│   │   ├── conftest.py, test_auth.py, test_health.py
│   │   ├── test_customer_isolation.py, test_gemini_agents.py
│   │   └── test_phase2.py ... test_phase5.py
│   └── app/
│       ├── main.py                     # Entrypoint + Socket.IO mount
│       ├── agents/
│       │   ├── coordinator.py          # AgentCoordinator
│       │   ├── detection_agent.py
│       │   ├── root_cause_agent.py
│       │   ├── strategy_agent.py
│       │   ├── action_agent.py         # Policy enforcement
│       │   ├── llm.py                  # Gemini + deterministic fallback
│       │   ├── base.py                 # BaseAgent ABC
│       │   └── schemas.py              # Agent Pydantic types
│       ├── api/
│       │   ├── router.py               # Master router (/api prefix)
│       │   ├── deps.py                 # get_current_user, get_current_customer
│       │   └── routes/                 # 15 route modules
│       ├── core/
│       │   ├── config.py               # Pydantic Settings
│       │   ├── security.py             # JWT + bcrypt
│       │   └── logging.py
│       ├── database/session.py
│       ├── models/                     # 11 SQLAlchemy models
│       ├── payments/
│       │   ├── failure_taxonomy.py     # 25 failure definitions
│       │   ├── simulator.py, event_service.py
│       │   ├── gateway.py, state_machine.py, schemas.py
│       ├── recovery/risk_engine.py
│       ├── services/                   # 12 service classes
│       ├── events/
│       │   ├── publisher.py            # Redis pub/sub
│       │   └── subscriber.py           # Background consumer
│       └── websocket/
│           ├── socketio_server.py      # Isolated rooms + event dispatch
│           └── manager.py
├── client/                    # Merchant Cockpit
│   └── src/
│       ├── pages/             # Login, Dashboard, Transactions, Recovery, Analytics, Agents, Audit, Policies
│       └── services/          # 13 Axios API wrappers + Socket.IO client
└── client-user/               # Customer Portal
    └── src/
        ├── pages/             # Store, Orders, RecoveryPay, CustomerProfile
        └── services/          # api.js, socket.js, websocket.js
```

---

## Frontend Applications

### Merchant Cockpit (`client/` — Port 3000 Docker, 5173 Dev)

| Page | Purpose |
|------|---------|
| **Login** | JWT authentication |
| **Dashboard** | Revenue metrics, recovery rate, active cases |
| **Transactions** | Paginated payment history with failure breakdown |
| **Recovery Cases** | Active/resolved cases with agent decisions |
| **Case Detail** | Full intelligence: root cause, agent traces, future plan, timeline |
| **Analytics** | Revenue trends, recovery success rates (Recharts) |
| **AI Agents** | Live agent status, activity feed, pipeline executions |
| **Audit Logs** | Complete immutable event trail |
| **Policies** | Recovery policy CRUD |

**Realtime:** Socket.IO joins `merchant:{merchant_id}` room.

### Customer Portal (`client-user/` — Port 3001 Docker, 5174 Dev)

| Page | Purpose |
|------|---------|
| **Store** | Azure-themed product catalog (simulated cloud compute services) |
| **Orders** | Transaction history with agent-conditional buttons |
| **RecoveryPay** | Token-validated recovery payment page |
| **CustomerProfile** | Account details + simulated payment instruments |

**Orders page behavior:**
- `has_recovery_link === true` → **"Pay Recovery Link"** button shown
- `has_recovery_link === false` → **"Agent Analyzing"** animated badge
- Agent strategy shown inline (SMART LINK, HOLD, RETRY, etc.)

**Auth:** Email OTP via SMTP → verified JWT → customer-scoped session

---

## Backend

### Application Startup (`app/main.py`)

1. Lifespan: checks PostgreSQL + Redis connectivity
2. Redis background subscriber starts
3. CORS middleware: explicit origin allowlist
4. All 15 API route groups registered under `/api`
5. Socket.IO ASGI app mounted at `/socket.io`
6. Native WebSocket at `/ws` and `/api/ws`

### API Route Groups

| Prefix | Description |
|--------|-------------|
| `/health` | Health check |
| `/auth` | Merchant JWT + Customer OTP auth |
| `/merchants` | Merchant profile |
| `/customers` | Customer management |
| `/dashboard` | Dashboard metrics |
| `/transactions` | Transaction history |
| `/payments` | Payment events + simulator |
| `/recovery` | Recovery case CRUD + agent actions |
| `/policies` | Merchant policy management |
| `/analytics` | Revenue analytics |
| `/audit` | Audit log retrieval |
| `/notifications` | In-app notifications |
| `/agents` | Agent status + activity |
| `/webhooks` | Razorpay webhook handler |
| `/customer` | Customer-facing APIs |

---

## Database Schema

### Technology
- **PostgreSQL 16** (production) / **SQLite** (test fallback)
- **SQLAlchemy 2.0** async ORM + `asyncpg`
- **Alembic** migrations (3 files)

### Tables and Relationships

```
merchants (id UUID PK, name, email unique, business_name, currency, timezone, status)
  │
  ├──< users (id, name, email, password_hash bcrypt, role, status)
  │
  ├──< customers (id, name, email, phone, is_verified)
  │     card_number, card_network, card_expiry, card_cvv
  │     upi_vpa, bank_account_number, bank_name, bank_ifsc
  │     balance NUMERIC(18,2) default 150000.00
  │     │
  │     ├──< transactions (id, external_payment_id, amount NUMERIC(18,2),
  │     │     currency, status, payment_method, failure_reason)
  │     │     │
  │     │     └──< recovery_cases
  │     │           status (24 states), risk_score, recovery_probability
  │     │           root_cause, recommended_strategy
  │     │           expected_recovery_amount, actual_recovered_amount
  │     │           attempt_count, max_attempts default 3
  │     │           current_strategy, strategy_version, strategy_reason
  │     │           next_action, next_evaluation_at
  │     │           customer_context JSONB
  │     │           merchant_approval_required, merchant_approval_status
  │     │           smart_link_token unique, smart_link_expires_at
  │     │           smart_link_status, smart_link_required
  │     │           stop_conditions, escalation_conditions JSONB[]
  │     │           replan_conditions, future_plan JSONB
  │     │           replan_count, last_agent_decision
  │     │           │
  │     │           ├──< agent_executions
  │     │           │     agent_name, agent_type, decision
  │     │           │     confidence 0-100, latency_ms, tokens_used
  │     │           │     model, input_summary, output_data JSONB
  │     │           │
  │     │           ├──< recovery_conversations
  │     │           │     channel, sender_type, sender_name, message
  │     │           │
  │     │           └──< audit_logs (recovery_case_id FK)
  │
  ├──< policies (name, type, enabled, configuration JSONB)
  ├──< audit_logs (event_type, actor_type, description, metadata JSONB)
  └──< notifications (title, message, type, is_read, metadata JSONB)
```

### Migrations

| Migration | Key Tables |
|-----------|-----------|
| `0001_initial_schema` | merchants, users, customers, transactions, recovery_cases, policies, audit_logs |
| `0002_payment_events` | payment_events |
| `0003_agentic_recovery_upgrade` | agent_executions, recovery_conversations; extends recovery_cases |

---

## Authentication & Authorization

### Merchant Authentication

- **`POST /api/auth/login`** — email + bcrypt verify → HS256 JWT
- JWT: `sub` (user ID), `merchant_id`, `role`, `exp` (60 min)
- `Authorization: Bearer <token>` on all protected routes
- Registration **disabled** by default (`ALLOW_MERCHANT_REGISTRATION=False`)

### Customer Authentication (Email OTP)

1. `POST /api/auth/customer/send-otp` → `secrets.randbelow()` OTP
2. OTP hashed SHA-256 (salt=`JWT_SECRET_KEY[:16]`) → Redis TTL=5min
3. Cooldown: 60s between resends; max 5 attempts
4. `POST /api/auth/customer/verify-otp` → validates hash → issues customer JWT
5. Customer JWT: `customer_id`, `merchant_id`, `email`, `session_id`, `role=customer`

### Authorization

| Layer | Mechanism |
|-------|-----------|
| Merchant isolation | All queries scoped by `merchant_id == current_user.merchant_id` |
| Customer isolation | `customer_id + merchant_id` double-check on every API |
| Case ownership | `case.customer_id == current_customer.id` verified on every access |
| Socket.IO rooms | `customer:{id}` for customers, `merchant:{id}` for merchants |
| Smart link tokens | DB-unique + expiry check on every validation |

---

## Realtime System (Socket.IO)

### Architecture

```
python-socketio AsyncServer → mounted at /socket.io (ASGI)
├── merchant room: merchant:{merchant_id}
├── customer room: customer:{customer_id}
└── case room:     recovery:{case_id}

Redis EventPublisher → channels
RedisSubscriber (background) → sio.emit(room=...)
```

### Server → Customer Room (`customer:{id}`)

| Event | Key Payload |
|-------|------------|
| `payment.captured` | payment_id, amount, remaining_balance |
| `payment.failed` | payment_id, case_id, amount, failure_reason, error_code |
| `recovery.waiting_for_customer` | case_id, status, conversation_starter |
| `recovery.smart_link.generated` | case_id, recovery_url, status, email_sent |
| `customer.balance.updated` | balance, deducted |

### Server → Merchant Room (`merchant:{id}`)

| Event | Key Payload |
|-------|------------|
| `payment.captured` | payment_id, amount, customer_id |
| `payment.failed` | payment_id, case_id, amount, customer_id |
| `recovery.smart_link.generated` | case_id, recovery_url, email_sent |

### Client → Server

| Event | Purpose |
|-------|---------|
| `authenticate` | Post-connect JWT auth + room join |
| `subscribe_case` | Subscribe to `recovery:{case_id}` room |

---

## Payment Simulation Engine

> ⚠️ **RevivePilot uses a simulated payment engine.** No real banking transactions occur. No real funds move. All payment instruments are generated test data.

### Simulation Endpoint

**`POST /api/customer/payments/simulate`**

```json
{
  "amount": 5000.00,
  "method": "UPI",
  "scenario": "BANK_TIMEOUT",
  "item_name": "Azure Compute Node Premium"
}
```

Scenarios: any of 25 `FAILURE_TAXONOMY` keys, or `SUCCESS`/`NORMAL`.

### What Happens on Failure

1. `Transaction` saved: `status=FAILED`
2. `RecoveryCase` saved: `status=DETECTED`
3. Gateway error payload from taxonomy (Razorpay-style codes)
4. AuditLog: `PAYMENT_FAILED`
5. Socket.IO `payment.failed` emitted
6. 4-agent pipeline triggered
7. If `GENERATE_RECOVERY_LINK`: token generated → email → Socket.IO event

### Simulated Customer Instruments (generated at first login)

- Card number, network, expiry, CVV (simulated)
- UPI VPA handle (simulated)
- Bank account number + IFSC (simulated)
- Starting balance: **₹1,50,000** (tracked in DB)

---

## Failure Taxonomy (25 Types)

`payments/failure_taxonomy.py` defines 25 profiles: category, source, payment step, Razorpay-style error code, base risk (0-100), base recovery probability (0-1), default strategy, retry delay, agent diagnosis text.

| Failure ID | Category | Risk | Recovery Prob |
|-----------|---------|------|--------------|
| `BANK_TIMEOUT` | TECHNICAL_INFRASTRUCTURE | 75 | 90% |
| `CARD_DECLINED` | FINANCIAL_AUTH | 85 | 65% |
| `NETWORK_ERROR` | TECHNICAL_NETWORK | 60 | 90% |
| `INSUFFICIENT_FUNDS` | FINANCIAL_LIQUIDITY | 65 | 75% |
| `BANK_DECLINED` | Bank | 82 | 62% |
| `CARD_EXPIRED` | Card | 78 | 85% |
| `CARD_BLOCKED` | Card/Bank | 88 | 55% |
| `INCORRECT_CARD_DETAILS` | Customer | 60 | 88% |
| `INVALID_UPI_ID` | UPI | 58 | 90% |
| `UPI_PAYMENT_DECLINED` | UPI/Bank | 70 | 72% |
| `UPI_TIMEOUT` | UPI/Network | 74 | 85% |
| `UPI_COLLECT_REQUEST_EXPIRED` | UPI | 68 | 76% |
| `CUSTOMER_CANCELLED` | Customer | 72 | 65% |
| `PAYMENT_TIMEOUT` | Network/Gateway | 75 | 90% |
| `BANK_DOWNTIME` | Bank | 84 | 88% |
| `GATEWAY_ERROR` | Gateway | 70 | 94% |
| `NETWORK_FAILURE` | Network | 60 | 92% |
| `TECHNICAL_ERROR` | System | 65 | 88% |
| `PAYMENT_METHOD_UNAVAILABLE` | Payment Method | 62 | 82% |
| `LIMIT_EXCEEDED` | Bank/Customer | 80 | 60% |
| `AUTHENTICATION_FAILED` | Customer/Bank | 70 | 74% |
| `MANDATE_FAILED` | RECURRING_MANDATE | 75 | 70% |
| `MANDATE_REVOKED` | Subscription | 90 | 45% |
| `RECURRING_PAYMENT_FAILED` | Subscription | 76 | 68% |
| `RISK_FRAUD_DECLINE` | Fraud/Risk | ~95 | ~15% |

> Recovery probabilities are **simulation baselines**, not real payment provider statistics.

---

## Multi-Agent Pipeline

### Overview

`AgentCoordinator.analyze_case()` runs a sequential 4-agent pipeline:

```
[1] DetectionAgent.process()
    Input:  failure_reason, amount, attempt_count, customer_ltv,
            customer_failure_history, payment_method, metadata
    Output: revenue_risk (6 levels), urgency, customer_tier,
            is_uncertain, risk_score, decision

[2] RootCauseAgent.process()
    Input:  failure_reason, amount, payment_method, attempt_count
    Output: root_cause, category, confidence, evidence[],
            recoverability, uncertainty[], recommended_next_stage

[3] StrategyAgent.process()
    Input:  failure_reason, amount, customer_ltv, payment_method,
            attempt_count, customer_context, replan_trigger
    Output: strategy_name, current_state, next_action,
            smart_link_required, recovery_probability, ERV,
            stop_conditions, escalation_conditions, future_plan[]

[4] ActionAgent.process() — Policy Enforcement
    Input:  strategy, proposed next_action, amount, violations
    Checks: 4 policy guardrails
    Output: policy_passed, violations[], action_enum, action_taken
```

Each `AgentExecution` persisted: agent_name, agent_type, decision, confidence, latency_ms, tokens_used, model, output_data JSONB.

### Detection Agent

**Revenue Risk:** `NOT_REVENUE_RISK`, `LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK`, `CRITICAL`, `UNCERTAIN`

**Customer Tier:** LTV >₹1.5L → ENTERPRISE; >₹30K → PRO; else STANDARD

**Conservative:** Timeouts → `UNCERTAIN` to prevent premature recovery triggers.

### Root Cause Agent

**Output:** root_cause, evidence[], recoverability (`HIGH/MEDIUM/LOW/NONE/UNCERTAIN`), uncertainty factors.

**Guardrail:** Forbidden from fabricating bank balance data.

### Strategy Agent

**Does NOT do:** `if failure == X: action = Y`

**Reasons across:** failure type, amount, customer LTV, payment method, attempt count, customer context, replan trigger, previous outcomes.

**Special hardcoded rules:**
- `amount > ₹1,00,000` → VIP Escalation + merchant approval
- `BANK_TIMEOUT` → Smart Delayed Retry, 90% probability override

**ERV = amount × (recovery_probability / 100)** (simulation baselines)

**Future Plan steps:** NOW → NEXT → THEN → IF_SUCCESS → IF_FAILS → IF_MAX_ATTEMPTS

### Action Agent — Policy Enforcement

**ActionEnum whitelist (11 actions):**
```
ASK_CUSTOMER, HOLD, WAIT, RECHECK, CUSTOMER_RETRY,
ALTERNATIVE_PAYMENT_METHOD, GENERATE_RECOVERY_LINK,
REQUEST_MERCHANT_APPROVAL, ESCALATE, STOP, VERIFY_PAYMENT
```

**4 Policy Checks:**

| Check | Rule |
|-------|------|
| Action Enum Whitelist | Action must be in ActionEnum |
| Maximum Retries | `attempt_count < max_attempts` (unless STOP/ESCALATE/VERIFY) |
| Autonomous Value Threshold | Amount ≤ ₹1,50,000 for auto-execution |
| Customer Cooldown | `customer_failure_history < 5` |

If blocked → `BLOCKED_BY_POLICY` → STOP or ESCALATE → logged in audit.

### Agent Failure Handling

| Scenario | Behavior |
|---------|---------|
| Gemini quota exceeded (429) | Deterministic heuristic fallback |
| Gemini timeout (>8s) | Same fallback |
| Agent exception | Case kept at DETECTED; error logged |
| Policy blocks | `next_action = STOP` or `ESCALATE`; audit logged |

---

## AI / Google Gemini Integration

**SDK:** `google-generativeai`  
**Default model:** `gemini-2.5-flash` (env: `GEMINI_MODEL`)

### Generation Config

```python
generation_config = {
    "response_mime_type": "application/json",
    "temperature": 0.15,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1500,
}
```

### Prompt Types

| prompt_type | Key Output Fields |
|------------|------------------|
| `"detection"` | risk_score, revenue_risk, urgency, decision, confidence |
| `"root_cause"` | root_cause, category, evidence, recoverability, confidence |
| `"strategy"` | strategy, next_action, recovery_probability, future_plan |
| `"action"` | confidence, action validation |

### Deterministic Fallback

When Gemini unavailable: `_deterministic_heuristic_reasoning()` uses `FAILURE_TAXONOMY` dict → identical JSON schema → `_ai_model: "heuristic-taxonomy-engine"`. Zero degradation in recovery logic.

### AI Safety

- Cannot mark a case `RECOVERED` (only verified payment triggers this)
- Cannot read real bank balances
- All output bounded to 11 ActionEnum values
- Timeout: 8 seconds per call

---

## Policy Engine & Guardrails

### Recovery Policies (seeded)

| Policy | Type | Key Config |
|--------|------|-----------|
| Default Auto-Retry | `retry_policy` | maxRetryAttempts=3, cooldownMinutes=30, maxRetryAmountINR=50000 |
| High Value Limit | `amount_limit` | threshold=₹50K; action=require_approval |
| Fraud Risk Stop | `stopping_rule` | risk_score>90; halt_immediately |
| VIP Escalation | `escalation_rule` | LTV>₹1L; escalate after 2 failures |

---

## Recovery Case Lifecycle

### 24 States

```
DETECTED → INVESTIGATING → ANALYZING → ROOT_CAUSE_IDENTIFIED
  → STRATEGY_PLANNED → STRATEGY_SELECTED
  → WAITING_FOR_CONTEXT / WAITING_FOR_CUSTOMER → ON_HOLD
  → READY_FOR_APPROVAL → POLICY_REVIEW → APPROVED → BLOCKED
  → ACTION_PENDING → ACTION_EXECUTING → EXECUTING → ACTION_REQUIRED
  → VERIFYING
  → RECOVERED ✓
  → FAILED / ESCALATED / STOPPED / EXPIRED / UNRECOVERABLE
```

> **Critical:** `RECOVERED` is only set when `RecoveryService.verify_and_settle_recovery()` completes with verified payment — not when a link is sent or action triggered.

---

## Smart Recovery Links

When agent decides `GENERATE_RECOVERY_LINK`:

1. `secrets.token_urlsafe(32)` → prefixed `rec_<token>`
2. Stored in `recovery_cases.smart_link_token` (DB-unique)
3. Expiry: 24 hours
4. Recovery URL: `/pay/recover?token=<token>`
5. Validate: `GET /api/customer/recovery/link/{token}` — checks expiry + not already RECOVERED
6. Pay: `POST /api/customer/recovery/link/{token}/pay` → `verify_and_settle_recovery()`

---

## Email Service

**Technology:** `smtplib` in thread pool (never blocks async event loop)

| Email Type | Trigger | Content |
|-----------|---------|---------|
| OTP Verification | Customer requests OTP | HTML: 6-digit code, 5-min expiry, security notice |
| Recovery Link | Agent generates link | HTML: payment button, amount, 24h expiry |

**Gmail setup:** Enable 2FA → Generate App Password (16 chars) → Set `SMTP_USER` + `SMTP_APP_PASSWORD` in `server/.env`

---

## Customer Experience

1. **Login:** Email → OTP → JWT session
2. **Browse:** Azure-themed product catalog
3. **Checkout:** Select product → choose payment method → simulate failure scenario
4. **Failure toast:** Real-time Socket.IO notification
5. **Orders:** Failed payments with agent-conditional state
6. **Recovery:** Click link → RecoveryPay → confirm → case RECOVERED

**Customer actions that affect recovery:**
- Chat response → may trigger agent **replanning**
- "I'll pay tomorrow" → case moves to `WAITING_FOR_CUSTOMER`

---

## Merchant Cockpit

### Dashboard

- Total payment volume, failed amount, recovered amount
- Active recovery case count, recovery rate %

### Recovery Case Detail

- Root cause + evidence array
- 4 agent traces (decision, confidence, latency_ms, tokens_used, model)
- Strategy + future plan steps
- Policy check results (passed/blocked + violation reasons)
- Full state transition timeline
- Audit events for this case

### Merchant Actions

- Approve/reject high-value cases
- Manage recovery policies (CRUD)
- Real-time agent activity feed
- Complete audit trail

---

## API Reference

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Merchant login → JWT |
| GET | `/api/auth/me` | Bearer | Current user profile |
| POST | `/api/auth/logout` | Bearer | Session invalidation |
| POST | `/api/auth/customer/send-otp` | — | Send 6-digit OTP |
| POST | `/api/auth/customer/verify-otp` | — | Verify OTP → customer JWT |
| GET | `/api/auth/customer/me` | Customer JWT | Customer profile |

### Customer Portal

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/customer/payments/simulate` | Customer JWT | Trigger payment simulation |
| GET | `/api/customer/orders` | Customer JWT | Transaction history (agent fields) |
| GET | `/api/customer/recovery/{case_id}` | Customer JWT | Recovery case detail |
| POST | `/api/customer/recovery/{case_id}/chat` | Customer JWT | Send context/message |
| GET | `/api/customer/recovery/{case_id}/conversation` | Customer JWT | Chat history |
| POST | `/api/customer/recovery/{case_id}/retry` | Customer JWT | Confirm retry |
| GET | `/api/customer/recovery/link/{token}` | — | Validate recovery token |
| POST | `/api/customer/recovery/link/{token}/pay` | — | Pay via recovery link |

### Recovery Cases (Merchant)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/recovery/cases` | Bearer | List cases (paginated, filterable) |
| GET | `/api/recovery/cases/{case_id}` | Bearer | Full case + agent traces |
| POST | `/api/recovery/cases/{case_id}/retry` | Bearer | Trigger re-analysis |
| POST | `/api/recovery/cases/{case_id}/approve` | Bearer | Approve high-value case |
| GET | `/api/recovery/cases/{case_id}/analysis` | Bearer | Multi-agent analysis |

### Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payments/events` | Bearer | Ingest payment event |
| GET | `/api/payments/events` | Bearer | List payment events |
| GET | `/api/analytics/summary` | Bearer | Revenue + recovery metrics |
| GET | `/api/analytics/trends` | Bearer | Time-series payment trends |
| GET | `/api/agents/status` | Bearer | All 4 agents' live status |
| GET | `/api/agents/activity` | Bearer | Recent agent activity |
| GET | `/api/audit/logs` | Bearer | Paginated audit logs |
| GET | `/api/dashboard/summary` | Bearer | Dashboard metrics |
| GET | `/api/notifications` | Bearer | In-app notifications |
| GET | `/api/health` | — | Service health |
| GET | `/docs` | — | Swagger UI |
| GET | `/redoc` | — | ReDoc |

---

## Realtime Events

All events delivered via Socket.IO `"event"` wrapper envelope AND as named events.

```json
// payment.failed (customer room)
{
  "event": "payment.failed",
  "customer_id": "...",
  "data": {
    "payment_id": "pay_xxx", "case_id": "uuid",
    "amount": 5000.00, "failure_reason": "BANK_TIMEOUT",
    "error_code": "GATEWAY_ERROR"
  }
}

// recovery.smart_link.generated (customer + merchant rooms)
{
  "event": "recovery.smart_link.generated",
  "data": {
    "case_id": "uuid",
    "recovery_url": "/pay/recover?token=...",
    "status": "ACTIVE", "email_sent": true
  }
}
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Default | Description |
|---------|---------|---------|-------------|
| `DATABASE_URL` | ✅ | — | `postgresql+asyncpg://user:pass@host:port/db` |
| `REDIS_URL` | ✅ | — | `redis://localhost:6379/0` |
| `JWT_SECRET_KEY` | ✅ | dev default | Min 32-char random string |
| `JWT_ALGORITHM` | | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | `60` | |
| `CORS_ORIGINS` | | comma list | Allowed frontend origins |
| `GEMINI_API_KEY` | | — | Google AI Studio API key |
| `GEMINI_MODEL` | | `gemini-2.5-flash` | |
| `SMTP_HOST` | | `smtp.gmail.com` | |
| `SMTP_PORT` | | `587` | |
| `SMTP_USER` | | — | Gmail address |
| `SMTP_APP_PASSWORD` | | — | 16-char Gmail App Password |
| `SMTP_FROM` | | — | Sender email |
| `SMTP_FROM_NAME` | | `RevivePilot Revenue Recovery` | |
| `SMTP_TLS` | | `true` | |
| `RAZORPAY_KEY_ID` | | `rzp_test_mock` | Sandbox only |
| `RAZORPAY_KEY_SECRET` | | `mock_secret` | |
| `APP_ENV` | | `development` | |
| `DEBUG` | | `true` | |
| `ALLOW_MERCHANT_REGISTRATION` | | `false` | |
| `OTP_EXPIRE_SECONDS` | | `300` | |
| `OTP_MAX_ATTEMPTS` | | `5` | |
| `OTP_COOLDOWN_SECONDS` | | `60` | |

---

## Docker Setup

### Services

| Container | Image | External Port |
|-----------|-------|--------------|
| `revivepilot-postgres` | postgres:16-alpine | 15432 |
| `revivepilot-redis` | redis:7-alpine | 6379 |
| `revivepilot-server` | python:3.12-slim | 8000 |
| `revivepilot-client` | node:20-alpine | 3000 |
| `revivepilot-client-user` | node:20-alpine | 3001 |

**Volumes:** `postgres_data`, `redis_data`

**Startup order:** postgres + redis → server (alembic → seed → uvicorn) → client + client-user

### Docker Commands

```bash
docker compose up -d
docker compose logs -f server
docker compose build server && docker compose up -d --force-recreate server
docker compose down -v    # Fresh start (deletes all data)
docker exec -it revivepilot-postgres psql -U postgres -d revivepilot
docker exec -it revivepilot-redis redis-cli
```

---

## Installation & Running Locally

### Option A: Full Docker Stack (Recommended)

```bash
git clone https://github.com/hiteshpatil2005/RevivePilot.git
cd RevivePilot
cp .env.example .env
cp server/.env.example server/.env
# Edit server/.env: add GEMINI_API_KEY and SMTP credentials
docker compose up -d
docker compose logs -f server    # Watch for "Application startup complete"
```

### Option B: Manual Local Development

```bash
# Start infrastructure
docker compose up -d postgres redis

# Backend
cd server
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env: DATABASE_URL=postgresql+asyncpg://postgres:postgrespassword@localhost:15432/revivepilot
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Merchant Cockpit (new terminal)
cd client && npm install && npm run dev    # → http://localhost:5173

# Customer Portal (new terminal)
cd client-user && npm install && npm run dev    # → http://localhost:5174
```

### Ports and URLs

| Service | Docker | Dev |
|---------|--------|-----|
| Backend API | http://localhost:8000 | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs | — |
| Merchant Cockpit | http://localhost:3000 | http://localhost:5173 |
| Customer Portal | http://localhost:3001 | http://localhost:5174 |
| PostgreSQL | localhost:15432 | localhost:15432 |
| Redis | localhost:6379 | localhost:6379 |

---

## Database Initialization

### Automatic (Docker)

Server container runs: `alembic upgrade head && python scripts/seed.py && uvicorn ...`

### Manual

```bash
cd server
alembic upgrade head     # Run all 3 migrations
python scripts/seed.py   # Create merchant + policies (idempotent)
```

### Default Demo Account

| Field | Value |
|-------|-------|
| Email | `hiteshpatil0205@gmail.com` |
| Password | `Hitesh@12345` |
| Business | RevivePilot Revenue Recovery |

No dummy transactions or customers seeded. All data generated through real platform interactions.

---

## Testing

```bash
cd server
.venv\Scripts\activate
pytest tests/ -v
pytest tests/test_auth.py -v
pytest tests/ -v -s --tb=short
```

| File | Coverage |
|------|---------|
| `test_health.py` | Health endpoint |
| `test_auth.py` | Merchant login, JWT |
| `test_customer_isolation.py` | Multi-tenant isolation |
| `test_gemini_agents.py` | Agent pipeline (Gemini + fallback) |
| `test_phase2.py` | Payment event processing |
| `test_phase3.py` | Recovery case creation |
| `test_phase4.py` | Agent pipeline execution |
| `test_phase5.py` | Recovery settlement |

---

## Scripts & Utilities

| Script | Purpose |
|--------|---------|
| `scripts/seed.py` | Idempotent merchant + policies creation |
| `scripts/clean_and_seed_merchant.py` | Force-reseed with clean state |
| `scripts/run_all_scenarios_live.py` | Run all 25 failure scenarios vs live server |
| `scripts/test_user_scenarios.py` | Automated E2E user-side scenario tests |
| `scripts/test_live_gemini.py` | Validate Gemini API connectivity + agent output |

---

## Audit Trail

Every event in `audit_logs`: `merchant_id`, `event_type`, `actor_type`, `description`, `metadata JSONB`.

| Event Type | Actor | When |
|-----------|-------|------|
| `PAYMENT_SUCCESS` | CUSTOMER | Payment captured |
| `PAYMENT_FAILED` | CUSTOMER | Payment failure |
| `AGENT_PIPELINE_STARTED` | AI_AGENT | Coordinator begins |
| `AGENT_DETECTION_COMPLETE` | AI_AGENT | Detection result |
| `AGENT_ROOT_CAUSE_COMPLETE` | AI_AGENT | Root cause diagnosis |
| `AGENT_STRATEGY_PLANNED` | AI_AGENT | Strategy formulated |
| `AGENT_ACTION_BLOCKED` | AI_AGENT | Policy rejected action |
| `AGENT_RECOVERY_LINK_GENERATED` | AI_AGENT | Smart link created + emailed |
| `RECOVERY_VERIFIED` | SYSTEM | Payment confirmed, case RECOVERED |
| `CUSTOMER_LOGIN` | CUSTOMER | OTP verification success |

---

## Security

### Implemented

| Control | Implementation |
|---------|---------------|
| Password hashing | bcrypt (passlib) |
| JWT tokens | HS256, `exp` claim (python-jose) |
| CORS | Explicit origin allowlist |
| Merchant isolation | All queries scoped by `merchant_id` |
| Customer isolation | `customer_id + merchant_id` double-check |
| OTP security | SHA-256 hash, 5-min TTL, 60s cooldown, 5-attempt limit |
| Smart link tokens | 32-byte URL-safe random, DB-unique, 24h expiry |
| Action allowlisting | AI bounded to 11 ActionEnum values |
| Input validation | Pydantic v2 strict types |
| SQL injection | SQLAlchemy ORM parameterized queries |
| AI guardrails | Cannot mark RECOVERED without verified payment |

### Not Implemented (Dev Mode)

- HTTPS/TLS termination
- Rate limiting on API endpoints
- Refresh token rotation
- Secret management (credentials in `.env`)

---

## Troubleshooting

### Database connection failure
```bash
docker exec revivepilot-postgres pg_isready -U postgres -d revivepilot
# Docker internal URL: postgresql+asyncpg://postgres:postgrespassword@postgres:5432/revivepilot
# Local dev URL:       postgresql+asyncpg://postgres:postgrespassword@localhost:15432/revivepilot
```

### Redis connection failure
```bash
docker exec revivepilot-redis redis-cli ping  # Expected: PONG
```

### Socket.IO connection errors
- Verify `CORS_ORIGINS` includes the frontend origin
- Ensure Socket.IO mounted at `/socket.io` (not `/socket.io/`)
- Check JWT token presence in connection auth

### Gemini quota exceeded
System automatically falls back to deterministic heuristic engine. Logs show `_ai_model: "heuristic-taxonomy-engine"`.

### Migration failure
```bash
cd server && alembic current && alembic history
alembic downgrade -1 && alembic upgrade head
```

### OTP email not received
- Verify Gmail App Password (16 chars) in `server/.env`
- Check spam folder

### Recovery link button not showing
Agent must explicitly decide `GENERATE_RECOVERY_LINK`. For certain failures (e.g., `RISK_FRAUD_DECLINE`, `BANK_DOWNTIME`), agent may choose `HOLD` or `STOP` instead.

---

## Project Limitations

| Area | Limitation |
|------|-----------|
| **Payment Processing** | Fully simulated — no real banking transactions |
| **Payment Instruments** | Generated test data — not real card/UPI |
| **Recovery Probability** | Simulation baselines, not real merchant history |
| **Banking Intelligence** | No real bank downtime detection |
| **Razorpay** | Webhook handler present; uses mock credentials |
| **Multi-merchant** | DB supports it; registration disabled by default |
| **Token Refresh** | No refresh token rotation (60-min JWT) |
| **Rate Limiting** | Not implemented |
| **Voice/Multilingual** | Not implemented |

---

## Production Hardening

- **HTTPS:** TLS via nginx or load balancer
- **Secrets:** Vault, AWS Secrets Manager, or K8s Secrets
- **JWT Secret:** Replace default with 32+ char cryptographic random string
- **Rate Limiting:** Apply on `/api/auth/*` and payment endpoints
- **PostgreSQL:** pgBouncer connection pooling + read replicas
- **Redis:** Sentinel or Cluster for HA
- **Real Razorpay:** Replace mock client with live credentials
- **Monitoring:** Prometheus + Grafana for agent latency, recovery rates
- **Logging:** Structured logs to ELK or Datadog
- **Backups:** PostgreSQL PITR backups

---

## Future Enhancements

| Feature | Description |
|---------|-------------|
| Real Razorpay integration | Live payment capture + webhook verification |
| Multi-merchant SaaS | Self-registration + merchant onboarding |
| WhatsApp/SMS notifications | Recovery link delivery via messaging |
| Scheduled retries | Background cron worker for timed re-attempts |
| Historical learning | Train probability model on real merchant outcomes |
| Token refresh | Sliding sessions with refresh tokens |
| Admin panel | Multi-tenant management UI |
| Analytics export | CSV/Excel recovery reports |

---

## Developer Notes

### Adding a New Failure Type
Edit `server/app/payments/failure_taxonomy.py` — add key to `FAILURE_TAXONOMY`.

### Adding a New Agent
1. Create `server/app/agents/<name>_agent.py` extending `BaseAgent`
2. Add to `AgentCoordinator.__init__()` in `coordinator.py`
3. Add prompt type in `llm.py`

### Adding a New API Route
1. Create `server/app/api/routes/<name>.py`
2. Import and `include_router` in `server/app/api/router.py`

### Adding a New Database Model
1. Create `server/app/models/<name>.py` extending `Base, UUIDPrimaryKeyMixin, TimestampMixin`
2. Generate migration: `alembic revision --autogenerate -m "add <name>"`

### Adding New Realtime Events
Use `emit_to_customer()` or `emit_to_merchant()` from `app/websocket/socketio_server.py`.

---

*README generated from repository source inspection — September 2026.*
