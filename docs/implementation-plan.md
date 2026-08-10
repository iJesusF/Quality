# Implementation plan

## Delivery phases

| Phase | Scope | Exit gate |
| --- | --- | --- |
| 1 | Foundation, auth, organizations, projects, permissions, shell, dashboard, PWA | Authenticated project isolation; responsive dashboard; clean quality checks |
| 2 | Drawings, revisions, segments and reconstructable markup | TR-0450 can be selected from ISO-PW-014 and opened as a dossier |
| 3 | Dynamic inspections, Hydrotest, evidence and PDF | HT-034 completes with required fields and evidence |
| 4 | Haskell template library, mapping, Excel/PPTX and PDF | Master preserved; same input/revision produces equivalent output |
| 5 | Receipts, lots, Heat/MTR, installations and QR | Heat can be traced from receipt to segment |
| 6 | NCR and Punch | Failed inspection can create and close a linked NCR |
| 7 | Signature adapter | Signed document and certificate are immutable and auditable |
| 8 | Offline packs, queue, retry and conflict center | Field inspection survives offline/reconnect without data loss |
| 9 | Turnover | Package completeness and revisioned ZIP/PDF binder |
| 10 | Permission-aware assistant | Suggestions only; official values require confirmation |

## Main risks

| Risk | Mitigation |
| --- | --- |
| Unknown existing VORTECH customer model | Keep Quality isolated; add an explicit customer adapter after source inspection |
| Office-to-PDF fidelity varies by runtime | Golden-file render tests and a dedicated conversion service |
| iPad storage eviction/offline limits | Explicit pack size, storage estimates, sync warnings and no silent data deletion |
| Complex RLS becomes inconsistent | Project-scoped columns, helper functions and policy tests in CI |
| Drawing coordinate drift across revisions | Revision-specific normalized coordinates and migration review tools |
| Duplicate folios under concurrency | Transactional database function with row lock |
| Signed documents become editable | Immutable revisions, checksums and append-only audit events |
| Missing backend configuration | Setup-only screen; no sample-data fallback or auth bypass |

## Phase 1 acceptance

- Application runs with or without Supabase secrets.
- Supabase mode authenticates with secure SSR cookies.
- Project reads are protected by RLS and server-side membership checks.
- Dashboard and project list have loading, empty and error surfaces.
- Navigation works at desktop, iPad landscape/portrait and mobile widths.
- Manifest, install icons, service worker and offline fallback exist.
- Lint, TypeScript, tests and production build pass.
