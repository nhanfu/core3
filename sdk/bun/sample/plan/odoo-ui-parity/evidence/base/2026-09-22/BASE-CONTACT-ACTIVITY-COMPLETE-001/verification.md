# Verification

Command:

```text
bun test test/base_contact_activity_completion.integration.test.ts --timeout 30000
```

Result: 3 tests passed, 25 assertions, 0 failures.

Covered checks:

- Odoo source action mapping and YAML page/API separation.
- Idempotent migration replay.
- Planned activity query includes `row_version` and `completed_at`.
- Actor-required, company-scope, and stale-version rejection.
- Durable completion (`done`, timestamp, incremented version) and chatter audit.
- Durable cancellation and cancellation audit.

Repository-wide audit/build/diff results are recorded in the handoff; this evidence does not claim authenticated visual parity.
