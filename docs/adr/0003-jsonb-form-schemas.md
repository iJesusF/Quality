# ADR-003: Inspection form schemas use JSONB

Status: Accepted

Form structure and conditional rules use versioned JSONB because field layouts vary by client. Inspection identity, template version, actors, status, traceability links and individual recorded values remain relational.
