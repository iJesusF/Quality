# Quality domain

## Aggregate roots

- **Project:** tenant-scoped quality configuration, timezone, units and naming rules.
- **Drawing:** identity with immutable revisions and reconstructable annotations.
- **Segment:** the central physical dossier linking line, drawing coordinates, required activities, materials, inspections, issues and turnover.
- **Inspection:** execution of one immutable inspection template version with explicit performer/reviewer/approver roles.
- **Material receipt/lot:** received identity, heat number, certificates and installed destinations.
- **NCR/Punch item:** controlled issue lifecycle with corrective action and reinspection.
- **Generated document:** immutable output tied to structured input and template revision.
- **Turnover package:** completeness evaluation and revisioned package output.

## Segment completion

Quality completion equals completed required activities divided by required activities. `READY_FOR_TURNOVER` is derived only when every mandatory requirement is satisfied, blocking NCRs and Punch items are closed, and required documents/signatures are final.

## Inspection lifecycle

```text
DRAFT -> IN_PROGRESS -> COMPLETED -> PENDING_REVIEW
      -> PENDING_SIGNATURE -> APPROVED
      -> REJECTED -> IN_PROGRESS
      -> VOID
```

Transitions record actor, timestamp, reason and source revision. `performed_by`, `reviewed_by` and `approved_by` are separate identities.

## Document rules

Contractual values come from a user, trusted database record or explicit confirmation. An LLM may suggest or extract but cannot silently set official values. Given the same template revision and normalized input snapshot, generation must yield the same working document content.

## Time and measurements

Timestamps are stored in UTC and rendered in the project timezone. Measurements retain normalized numeric value and display unit. Validation rules belong to the applicable template/procedure rather than a global hard-coded standard.
