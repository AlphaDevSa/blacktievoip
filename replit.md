# Black Tie VoIP Reseller Portal

## Overview

Full-stack reseller management system for Black Tie VoIP — a South African VoIP company. Features separate admin and reseller portals with cookie-based session authentication. All pricing is in South African Rand (ZAR).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/reseller-portal, port 5000)
- **API framework**: Express 5 (artifacts/api-server, port 8080)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Session-based (express-session + connect-pg-simple + bcryptjs)
- **Email**: Nodemailer (configurable SMTP — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM; gracefully skips if not set)
- **UI**: Tailwind CSS + Shadcn components
- **Currency**: South African Rand (ZAR)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/          # Express API server (port 8080)
│   │   └── src/routes/      # auth, admin, reseller, catalog, dids, orders, settings, notices, reports
│   └── reseller-portal/     # React + Vite frontend (port 5000, served at /)
│       └── src/pages/
│           ├── admin/       # Admin dashboard, resellers, clients, catalog, DIDs, orders, reports
│           ├── reseller/    # Reseller dashboard, clients, catalog, DIDs, orders
│           └── login.tsx    # Unified login page with role selector
├── lib/
│   ├── db/                  # Drizzle ORM, PostgreSQL schema, migrations
│   ├── api-spec/            # OpenAPI spec (openapi.yaml)
│   ├── api-zod/             # Generated Zod schemas (from openapi.yaml)
│   └── api-client-react/    # Generated React Query hooks (from openapi.yaml)
└── scripts/
    └── post-merge.sh        # Auto-run after task merges
```

## Default Login Credentials

| Role  | Email                          | Password    |
|-------|-------------------------------|-------------|
| Admin | admin@blacktievoip.co.za      | Admin1234!  |

Resellers can self-register and require admin approval before login.

## Database Schema

Tables: `admins`, `resellers`, `clients`, `services`, `service_categories`, `products`, `product_categories`, `area_codes`, `dids`, `orders`, `order_items`, `web_hosting_packages`, `domain_tlds`, `notices`, `connectivity_categories`, `connectivity_items`, `company_settings`

## API Routing

- All API routes are at `/api/*` handled by Express (port 8080)
- The API server (port 8080 → external port 80) is the primary entry point in dev mode
- In development, Express proxies non-/api requests to the Vite dev server (port 5000) via `http-proxy-middleware`
- The Vite server on port 5000 also has a proxy for `/api` → port 8080 (for direct Vite access)
- This dual-proxy ensures the app works correctly regardless of which port the browser hits

## Authentication

Three roles:
- **Admin** — full access, manages resellers, catalog, DIDs, orders, reports, notices, company settings, staff
- **Reseller** — manages their own clients, can order services, view catalog, manage their DIDs
- **Reseller Customer (Client)** — managed by resellers (not yet self-login; managed via reseller portal)

Sessions use PostgreSQL-backed session store (connect-pg-simple).

## Running Locally

```bash
pnpm install
pnpm --filter @workspace/db run push
```

Frontend auto-reloads on change. API server uses `tsx` for hot reload.

## Adding API Endpoints

1. Update `lib/api-spec/openapi.yaml`
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Add route handler in `artifacts/api-server/src/routes/`
4. Register route in `artifacts/api-server/src/routes/index.ts`

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Optional; defaults to hardcoded dev secret
- `PORT` — Required for both services (8080 for API, 5000 for frontend)
- `BASE_PATH` — Required for frontend (set to `/`)
- SMTP variables for email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
