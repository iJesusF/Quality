# Template mapping

A mapping belongs to one immutable template revision and is reviewable before activation.

```json
{
  "schemaVersion": 1,
  "templateRevisionId": "uuid",
  "fields": {
    "project.name": { "target": "Sheet1!C8", "type": "text" },
    "inspection.testPressure": {
      "target": "Sheet1!F18",
      "type": "number",
      "unit": "PSI",
      "required": true
    }
  }
}
```

Mapping proposals may be assisted by extraction, but activation is explicit. Renamed cells/shapes, changed print areas and missing fonts are validation failures. A new source revision requires a new mapping revision even when most targets remain unchanged.
