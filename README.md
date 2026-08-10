# VORTECH Quality

Field-first quality management PWA for industrial construction. The first functional phase includes the application shell, project context, permissions model, Supabase integration boundary, dashboard and offline-aware PWA foundation.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The application never falls back to sample project data. Without Supabase environment variables it shows a setup screen. With `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, authentication and all project data use Supabase.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Supabase

For a new local database, apply all migrations in order, then optionally load the seed:

```bash
supabase db reset
```

The SQL source lives in `supabase/migrations/` and `supabase/seed.sql`. Files are private by default and the service-role key must never be exposed to the browser.

### Existing hosted database

Do **not** run `202608100001_initial_quality_schema.sql` again when tables such as `user_profiles` already exist. That file is the initial baseline, not an incremental upgrade. Re-running it in SQL Editor produces PostgreSQL error `42P07: relation already exists`; because it is inside a transaction, PostgreSQL rolls that attempt back without requiring any table to be deleted.

For a database where `202608100001_initial_quality_schema.sql` was previously applied, execute only these pending files, one at a time and in this order:

1. `supabase/migrations/202608100002_recover_workspace_onboarding.sql`
2. `supabase/migrations/202608100003_operational_backend.sql`
3. `supabase/migrations/202608100004_operational_module_audit.sql`

These incremental files are safe to retry. Never fix `42P07` by dropping `user_profiles` or other production tables, because doing so can remove user, project, and quality data. See `docs/database.md` for the verification queries and recovery procedure.

## Documentation

- `docs/architecture.md`: diagnosis, system architecture, route map and dependencies
- `docs/database.md`: ER model, ownership and RLS model
- `docs/design-system.md`: interface principles and reusable components
- `docs/quality-domain.md`: domain language, states and invariants
- `docs/offline-sync.md`: local queue and conflict strategy
- `docs/document-generation.md`: deterministic document pipeline
- `docs/template-mapping.md`: immutable template mapping model
- `docs/signatures.md`: provider-neutral signature workflow
- `docs/implementation-plan.md`: phased delivery, risks and acceptance gates
- `docs/adr/`: architecture decision records

## Vercel deployment

1. Import `iJesusF/Quality` and deploy the `codex/phase-1` branch.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Production and Preview environment variables.
3. On a new Supabase project, run every file in `supabase/migrations/` once and in filename order. On an existing project, run only the pending incremental files described above.
4. Redeploy. Sign in with an existing confirmed Supabase Auth user, then complete onboarding.

## Current scope

Phase 1 provides real Supabase authentication, organization/project onboarding, project creation, RLS-backed dashboard metrics, global search, navigation, loading/error/empty states and sign-out. Drawing markup, inspection capture, Haskell template processing, material intake, NCR/Punch mutations, signatures and full offline mutation sync remain subsequent phases; their core database entities already exist but the UI does not pretend those workflows are complete.
