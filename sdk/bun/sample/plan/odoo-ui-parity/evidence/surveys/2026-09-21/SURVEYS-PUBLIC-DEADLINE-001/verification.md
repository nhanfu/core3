# Verification

Focused test verification passed as recorded in `test-results.md`.

The source-served Core3 browser probe was attempted with authenticated Admin
credentials (`admin@tms.local`) at desktop `1440x900` and mobile `390x844`.
The process exited during discovery before serving either viewport:

```text
PageSchemaError: Invalid page definition:
- actions[4].fields is not allowed
```

No screenshot, rendered-page status, overflow result, or Odoo deadline
comparison is claimed from this failed attempt. The shared boundary was not
repaired in another owner's files.
