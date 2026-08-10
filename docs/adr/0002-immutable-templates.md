# ADR-002: Document templates are immutable

Status: Accepted

A source template revision is never overwritten. Generation always follows MASTER -> COPY -> POPULATE -> EXPORT and records source/output checksums. Corrections create a new revision.
