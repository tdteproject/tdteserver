# PDT Backend

Node.js / Express backend for PDT.

## Responsibilities

- Verify Firebase ID tokens with Firebase Admin SDK
- Serve the API used by the mobile app
- Persist data in PostgreSQL through Prisma, typically backed by Supabase Postgres
- Store uploaded files in Supabase Storage (or local disk during migration)

## Setup

```bash
cd PDT_backend
npm install
```

Create `.env` from `.env.example`, then set:

- `DATABASE_URL`
- `DIRECT_URL` (or legacy `DIRECT_DATABASE_URL`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_SERVICE_ACCOUNT_PATH` for local development, or
- `FIREBASE_SERVICE_ACCOUNT_JSON` for cloud deployments

Recommended verification commands:

```bash
npm run supabase:preflight
npm run db:verify
```

## Security notes

- `serviceAccountKey.json` is an admin secret and must never be committed.
- Cloud deployments should prefer `FIREBASE_SERVICE_ACCOUNT_JSON`.
- Frontend `EXPO_PUBLIC_FIREBASE_*` values are public client config and do not belong here.

## Local run

```bash
npm run dev
```

## Supabase migration workflow

The backend stays Node/Express + Prisma, with Supabase providing:

- Postgres for the primary relational database
- Storage for uploaded profile pictures and health records

Use [INFRASTRUCTURE_MIGRATION_PLAN.md](./INFRASTRUCTURE_MIGRATION_PLAN.md) for the finalized architecture and migration roadmap.

## Cloud tunnel testing

If you expose the backend through Cloudflare Tunnel, set the frontend to:

- `EXPO_PUBLIC_API_MODE=cloud`
- `EXPO_PUBLIC_API_BASE_URL=https://<your-tunnel>.trycloudflare.com`
- `EXPO_PUBLIC_ANDROID_API_BASE_URL=https://<your-tunnel>.trycloudflare.com`
