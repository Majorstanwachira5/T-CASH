# T CPI — 10-Box Mystery Number Draw

> Kenya's transparent, server-verified 10-box mystery draw. Match the published 10-number sequence to win the KSh 100,000 grand prize.

[![Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-blue?logo=prisma)](https://prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)

---

## 🏗️ Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS v4 |
| Backend | Next.js API Routes (server-side) |
| Database | **Supabase PostgreSQL** (via Prisma ORM) |
| Auth | Custom JWT sessions (bcryptjs + secure cookies) |
| Payments | Paystack (M-PESA / Card) with webhook verification |
| Deployment | Vercel-ready |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- npm

### 1. Clone & Install
```bash
git clone https://github.com/Majorstanwachira5/T-CASH.git
cd T-CASH
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your actual values (see Configuration section below)
```

### 3. Push Database Schema
```bash
npx prisma db push
```

### 4. Seed Initial Data
```bash
node prisma/seed.js
```

### 5. Start Dev Server
```bash
npm run dev
# App runs at http://localhost:3005
```

---

## ⚙️ Configuration

Copy `.env.example` → `.env` and fill in:

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (Direct) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → Publishable key |
| `JWT_SECRET` | Generate: `openssl rand -base64 48` |
| `PAYSTACK_SECRET_KEY` | [Paystack Dashboard](https://dashboard.paystack.com) → Settings → API |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack Dashboard → Settings → API |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack Dashboard → Settings → Webhooks |

> **Important:** URL-encode special characters in your database password.  
> Example: `@` → `%40`, `#` → `%23`

---

## 🗄️ Database

The project uses **Supabase PostgreSQL** via [Prisma ORM](https://prisma.io).

### Schema Management
```bash
# Push schema changes to Supabase
npx prisma db push

# Generate Prisma client after schema changes
npx prisma generate

# Seed database with initial admin + game config
node prisma/seed.js

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

### Default Seed Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@tcpi.co.ke` | Set via `ADMIN_PASSWORD` in `.env` |
| Demo Player | `player@tcpi.co.ke` | `PlayerPass123!` |

---

## 🎮 Game Rules

- **Entry:** KSh 100 per draw (via wallet or Paystack M-PESA)
- **Repeat Entry:** KSh 2 for subsequent draws in same round
- **Prize:** KSh 100,000 for matching all 10 ordered positions
- **RNG:** Server-side CSPRNG (SHA-256 seeded) — browser never decides outcomes
- **Audit:** Every entry stores cryptographic seed hash for tamper-evident logs

---

## 💳 Payments (Paystack)

- Webhook endpoint: `POST /api/payments/webhook`
- Set `PAYSTACK_MOCK_MODE=true` for local development (no real charges)
- Set to `false` + add live keys for production

**Webhook configuration in Paystack dashboard:**
```
URL: https://your-domain.com/api/payments/webhook
Events: charge.success, transfer.success
```

---

## 🔐 Default Admin Access

After seeding, log in at `/login` with your admin credentials, then visit `/admin` for the admin dashboard.

Admin capabilities:
- Game configuration management
- User management & suspension
- Payment review & reconciliation
- Prize claim approval
- Comment moderation
- Audit log viewer

---

## 📱 Mobile (Android)

Built mobile-first with Tailwind CSS responsive utilities. Tested at 360px viewport width. All touch targets meet minimum 44px guidelines.

---

## 🧪 Tests

```bash
npm test
# Runs: node --test tests/engine.test.mjs
```

---

## 📦 Production Build

```bash
npm run build
npm start
```

---

## 🔄 Database Migration Notes

- Schema managed entirely through Prisma (`prisma/schema.prisma`)
- All monetary values stored as integer cents (BigInt) — no floating-point money
- UTC timestamps throughout
- Idempotency keys on all payment and game entry operations

---

## 📄 License

Private — All rights reserved. T CPI © 2026.
