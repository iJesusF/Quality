# ADR-001: Supabase as the initial backend

Status: Accepted

Use Supabase PostgreSQL, Auth and private Storage. It provides transactional relational data and RLS suitable for project isolation while keeping SQL portable. External services are accessed through application interfaces so storage/signature/document vendors can change.
