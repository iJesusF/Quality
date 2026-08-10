# Offline synchronization

Phase 1 installs the PWA shell, caches visited read surfaces and exposes connectivity state. Full offline mutations are Phase 8 because they require durable IndexedDB storage, encrypted project packs and conflict UX.

## Local operation envelope

```ts
type LocalOperation = {
  id: string;
  projectId: string;
  entityType: string;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "ATTACH";
  baseVersion: number | null;
  payload: unknown;
  createdAtLocal: string;
  userId: string;
  status: "LOCAL_ONLY" | "SYNCING" | "SYNCED" | "CONFLICT";
  retries: number;
};
```

## Strategy

1. Download an explicit project/area/work-package pack; never cache an entire project implicitly.
2. Store metadata, form schemas and queue items in IndexedDB. Store photos as blobs with original hashes.
3. Use client-generated UUIDs and idempotency keys.
4. Send operations in dependency order; photos upload after their parent record exists.
5. Compare `baseVersion`/`updated_at` on the server. Append-only evidence is merged; conflicting official fields require human review.
6. Never discard a failed photo. Keep it `LOCAL_ONLY` or `CONFLICT` and expose retry details in Sync Center.

The service worker is responsible for the application shell and visited read responses, not authoritative mutation reconciliation.
