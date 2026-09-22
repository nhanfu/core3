# Verification

Focused command:

```text
bun test test/base_contact_activity_feedback.integration.test.ts --timeout 30000
```

Result: 2 tests passed, 17 assertions, 0 failures.

Covered checks:

- Odoo `action_feedback` source mapping and the page/API separation.
- Feedback form action binding and datasource feedback readback.
- Required feedback, authenticated actor, planned state, company scope, and stale row-version guards.
- Durable feedback, done state, completion timestamp, incremented row version, chatter audit, and idempotent migration replay.

Contacts regression command:

```text
bun test test/base_contact_activity_completion.integration.test.ts test/base_contact_activity_reschedule.integration.test.ts test/base_contacts_export.integration.test.ts test/base_contact_children.integration.test.ts test/base_contact_merge.integration.test.ts --timeout 30000
```

Result: 15 tests passed, 121 assertions, 0 failures.

`git diff --check` passed. The requested `bun run audit:yaml` name is not present in this checkout; the available audit command is `bun run audit` and is recorded in the handoff.
