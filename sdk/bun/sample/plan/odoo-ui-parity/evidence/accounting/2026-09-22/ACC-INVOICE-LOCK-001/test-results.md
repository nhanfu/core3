# Test results

- `bun test test/accounting_invoice_lock.integration.test.ts --timeout 20000`
  — 3 passed, 30 assertions.
- Regression set:
  `bun test test/accounting_invoice_lock.integration.test.ts test/accounting_invoice_payment_block.integration.test.ts test/accounting_invoice_reset_to_draft.integration.test.ts --timeout 20000`
  — 7 passed, 70 assertions.
- `git diff --check` — passed.
- `bun run audit` — blocked before discovery by unrelated CRM error:
  `components[0].bulk_actions[0].id references unknown action "send_leads_email"`.
- `bun run agent:module -- accounting --port=4012` — blocked before server
  startup by unrelated CRM error:
  `components[0].header_actions[11].id references unknown action "send_lead_email_detail"`.
- Full Accounting glob:
  `bun test ./test/accounting_*.integration.test.ts --timeout 20000` — 102
  passed, 29 failed across 131 tests. The failures are discovery-only errors
  from unrelated dirty module contracts (`reschedule_activity_*`, duplicate
  Base `activity_types`); the lock tests and mutation paths passed.
