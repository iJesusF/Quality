# Signatures

The domain uses a provider-neutral `SignatureProvider`. DocuSign is the first intended adapter, but provider envelope IDs and payloads stay in adapter metadata rather than domain fields.

An envelope can be created only when the generated document is final, the inspection is completed, required attachments and recipients exist, and the active template revision matches. Webhook events are verified, idempotent and stored before transition processing.

```text
DRAFT -> SENT -> PARTIALLY_SIGNED -> COMPLETED
              -> DECLINED | VOIDED | ERROR
```

On completion, the signed artifact and certificate are downloaded to private storage, checksummed and linked to the source document revision. A correction creates a new document revision and envelope; it never replaces the signed file.
