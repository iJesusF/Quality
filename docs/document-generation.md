# Deterministic document generation

```mermaid
flowchart LR
  Master["Immutable MASTER"] --> Copy["Working copy"]
  Data["Validated normalized input"] --> Map["Approved mapping revision"]
  Map --> Populate["Deterministic population"]
  Copy --> Populate
  Populate --> Render["PDF render"]
  Render --> Verify["Visual + required-field validation"]
  Verify --> Hash["SHA-256 + immutable record"]
  Hash --> Signature["SignatureProvider"]
```

Original Excel/PPTX files are private, immutable storage objects. Every generation records the source object checksum, template version, mapping version, normalized input snapshot, generator version and output checksum. Final generation is never LLM-driven.

The first Haskell file must be inspected before any write: sheets/slides, shapes/cells, merged cells, print areas, fields, signatures and rendering are inventoried. The test output is always a copy and is visually compared with the master.
