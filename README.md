# LS Capital — Deal Intelligence & Capital Deployment System

Internal tool for **LS Finance LLC** to discover, underwrite, score, and track real estate lending opportunities nationwide.

---

## Architecture Overview

```
ls-capital/
├── prisma/
│   ├── schema.prisma          # Full data model (deals, loans, config, auth)
│   └── seed.ts                # 20 sample deals + active GA portfolio loans
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Magic-link email auth
│   │   ├── (app)/             # Authenticated app shell
│   │   │   ├── dashboard/     # Capital overview + pipeline summary
│   │   │   ├── deals/         # Deal inbox (list), detail, new, edit
│   │   │   ├── underwrite/    # Standalone UW calculator
│   │   │   ├── capital/       # Loan portfolio + deployment tracking
│   │   │   ├── import/        # CSV import with column mapping
│   │   │   ├── ai-extract/    # AI-powered listing text extraction
│   │   │   └── admin/         # UW defaults, scoring weights, sources
│   │   ├── actions/           # Next.js Server Actions (all mutations)
│   │   │   ├── deals.ts       # CRUD, notes, attachments, status
│   │   │   ├── import.ts      # CSV import with dedupe + UW
│   │   │   ├── ai-extract.ts  # Claude API extraction
│   │   │   └── admin.ts       # Config updates
│   │   └── api/auth/          # NextAuth handler
│   ├── components/
│   │   ├── ui/Sidebar.tsx
│   │   ├── deals/             # Table, filters, form, detail tabs
│   │   ├── admin/             # Admin settings panels
│   │   └── ImportClient.tsx   # CSV upload + mapping UI
│   └── lib/
│       ├── underwriting.ts    # Core financial engine
│       ├── scoring.ts         # Bankability Score (0-100)
│       ├── auth.ts            # NextAuth config
│       ├── prisma.ts          # DB singleton
│       └── utils.ts           # Formatters, constants, helpers
```

**Stack:** Next.js 14 (App Router) · TypeScript · PostgreSQL · Prisma · NextAuth · Tailwind CSS

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ (local, Supabase, Neon, or Railway)

### 2. Clone & Install
```bash
git clone <repo>
cd ls-capital
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Required
DATABASE_URL="postgresql://postgres:password@localhost:5432/ls_capital"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# Email (for magic link login)
EMAIL_SERVER_HOST="smtp.ethereal.email"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your@ethereal.email"
EMAIL_SERVER_PASSWORD="ethereal-password"
EMAIL_FROM="LS Capital <no-reply@lsfinance.com>"

# AI Extraction (optional but recommended)
ANTHROPIC_API_KEY="sk-ant-..."
```

> **Dev tip:** Get free Ethereal credentials at https://ethereal.email — no real emails sent, magic links logged to console.

### 4. Database Setup
```bash
# Push schema
npm run db:push

# Seed with 20 sample deals + 4 active loans
npm run db:seed
```

### 5. Run
```bash
npm run dev
# → http://localhost:3000
```

Sign in with `luca@lsfinance.com` or `analyst@lsfinance.com` — the magic link will be logged to your Ethereal inbox or terminal.

---

## Deployment (Production)

### Vercel + Supabase (recommended)
```bash
# 1. Create Supabase project → copy DATABASE_URL (connection pooling string)
# 2. Create Vercel project → import repo
# 3. Set environment variables in Vercel dashboard
# 4. Deploy → run migrations
npx prisma migrate deploy
npm run db:seed
```

### Other options
- **Railway:** One-click PostgreSQL + deploy
- **Render:** Free tier PostgreSQL + web service
- **Self-hosted:** Any VPS with PostgreSQL + `npm run build && npm start`

---

## Feature Reference

### Deal Inbox (`/deals`)
- Nationwide deal pipeline with full-text search
- Filters: state, city, asset type, deal type, status, source, units range, price range
- Sort: Bankability Score, cap rate, DSCR, price/unit, date
- Bulk actions: status update, assign to user
- Pagination (25/page)

### Underwriting Engine
Every deal automatically computes:
| Output | Formula |
|--------|---------|
| Loan Amount | Purchase Price × LTV% |
| Monthly Payment | Standard amortization: P × [r(1+r)ⁿ]/[(1+r)ⁿ-1] |
| NOI | EGI × (1 - Expense Ratio%) |
| EGI | Gross Rent × (1 - Vacancy%) |
| Cap Rate | NOI / Purchase Price × 100 |
| DSCR | NOI / Annual Debt Service |
| Cash-on-Cash | Annual Cash Flow / Equity Required × 100 |
| Equity Required | Purchase Price × (1 - LTV%) |
| 6-Year Projection | Compounds rent at configured growth rate |

### Bankability Score (0-100)
Seven weighted factors (admin-adjustable):

| Factor | Default Weight | Logic |
|--------|---------------|-------|
| DSCR Strength | 25% | <1.0 = 0pts, ≥1.5 = 100pts |
| LTV Feasibility | 20% | ≤70% = 100pts, >80% = 0pts |
| Cap Rate Band | 15% | <4% = 10pts, ≥7.5% = 100pts |
| Value-Add Signals | 15% | Keyword detection in description |
| Price Per Unit | 10% | $50-100K = 90pts, >$300K = 10pts |
| Data Completeness | 10% | % of key fields populated |
| Stress Test | 5% | +200bps rate / -10% rent / +5% vacancy |

**Grade bands:** A (75+) · B (60+) · C (45+) · D (30+) · F (<30)

### Capital Dashboard (`/capital`)
- Visual deployment bar: deployed vs. available vs. pending
- Active loan portfolio table (origination, rate, LTV, DSCR, maturity)
- Pending capital from LOI + Under Contract deals
- Portfolio weighted averages

### CSV Import (`/import`)
1. Upload any CSV (LoopNet export, Crexi export, broker spreadsheet)
2. Auto-detects common column names
3. Manual mapping UI for unrecognized columns
4. Preview first 5 rows before committing
5. Dedupe logic: updates existing if matching `(address + city + state + units)` OR `sourceUrl`
6. Full underwriting computed on import

### AI Deal Extractor (`/ai-extract`)
- Paste any listing text, broker email, or property description
- Claude extracts: address, units, rents, occupancy, value-add signals, broker info
- Editable preview before saving
- Confidence scores per field
- Requires `ANTHROPIC_API_KEY` in env

### Admin (`/admin`)
- **Underwriting Defaults:** interest rate, LTV, expense ratio, vacancy, rent growth
- **Scoring Weights:** adjust all 7 factors (must sum to 1.0)
- **Deal Sources:** add/manage LoopNet, Crexi, broker, auction sources
- **Users:** view registered users (role management via Prisma Studio)

---

## Database Schema Summary

```
users              → auth + roles (ADMIN, ANALYST, VIEWER)
accounts/sessions  → NextAuth OAuth tables
deals              → core deal pipeline (all UW fields stored)
deal_notes         → timestamped notes per deal
deal_attachments   → document links (OM, T12, rent roll, etc.)
deal_audit_logs    → full event history per deal
loans              → active loan portfolio (existing GA loans + future)
deal_sources       → LoopNet, Crexi, broker, auction, etc.
import_jobs        → CSV import history with error logs
underwriting_configs → admin-configurable UW defaults
scoring_weights    → admin-configurable bankability score weights
```

---

## LS Finance Loan Parameters

| Parameter | Value |
|-----------|-------|
| Lender | LS Finance LLC |
| Max LTV | 80% |
| Interest Rate | 5.99% (configurable) |
| Term | Up to 30 years |
| Portfolio Cap | $10,000,000 |
| Min DSCR | 1.20 |
| Asset Types | SFR, 2-4, 5+, 20-30u, 50+u |
| Geography | Nationwide (expanding from GA) |
| Borrower Structure | Property SPE, guaranteed by Guarantor Entity |

---

## Phase 2 Roadmap (Design Only — Not Implemented)

- **Automated ingestion:** scheduled LoopNet/Crexi CSV pulls, scraping (with ToS compliance)
- **Email parsing:** Gmail/Outlook OAuth → broker blast → AI extract → auto-add to pipeline
- **Public records API:** county assessor data for year built, sq ft, ownership
- **Regional pricing model:** HUD FMR data, Census ACS, FRED ZHVI for PPU benchmarking
- **Saved filter views:** named filter presets per user
- **Email digest:** daily/weekly pipeline summary email
- **File uploads:** S3/R2 for actual document storage (vs. URL links)
- **Google Maps:** geocoding + map view of deal locations

---

## Useful Commands

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run db:push      # Sync schema to DB (no migration history)
npm run db:migrate   # Create + run migration (production)
npm run db:seed      # Seed sample data
npm run db:studio    # Prisma Studio GUI (localhost:5555)
npm run db:generate  # Regenerate Prisma client after schema changes
```

---

## Assumptions & Notes

1. **BigInt for money:** All dollar amounts stored as integer cents in PostgreSQL to avoid floating-point errors. UI formats back to dollars.
2. **Expense ratio defaults to 40% of EGI** — industry standard for small multifamily. Override per-deal or in admin.
3. **Vacancy default 5%** — conservative. Auction/distressed deals may warrant 10-15%.
4. **Rent growth 3%/yr** — used for 6-year projection. Adjust based on market.
5. **Stress test:** +200bps rate shock + −10% rent + +5% vacancy applied simultaneously.
6. **Value-add keyword list** is in `src/lib/scoring.ts` — extend as needed.
7. **Auth is email magic link only** — no passwords. Add credential provider if needed.
8. **No file uploads** in MVP — attachments are URL links. Add S3/Cloudflare R2 for Phase 2.
9. **Regional PPU benchmarking** uses national bands in MVP — Phase 2 adds market-specific data.
10. **Deduplication:** `address + city + state + units` → normalized hash. Change in units count = new record.
