# Verification

Command:

```text
bun test test/base_contact_activity_reschedule.integration.test.ts --timeout 30000
```

Result: 3 tests passed, 29 assertions, 0 failures.

Covered checks:

- Odoo source action mapping and YAML page/API ownership separation.
- Selectable activity list, bulk actions, and row action menu bindings.
- Durable Today, Tomorrow, and Next Week deadline updates with incremented
  activity row versions.
- Empty selection, missing selection, actor, company, planned-state, and stale
  row-version rejection.
- File-backed restart preserves the rescheduled deadline and row version.

Repository-wide audit/build and final diff results are recorded in the handoff;
this evidence does not claim authenticated visual parity.

The requested repository audit was also attempted. It is currently blocked by
the unrelated concurrent edit
`services/email-marketing/api/mailing-detail.yaml:29`, where the existing
`success_message` key is rejected by the shared YAML schema as
`actions[7].success_message is not allowed`. No Email Marketing or Live Chat
file was changed for this Base slice.
