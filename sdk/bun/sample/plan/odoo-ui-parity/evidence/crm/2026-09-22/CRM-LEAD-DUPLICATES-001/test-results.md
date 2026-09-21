# Test results

- Focused: `bun test test/crm_lead_duplicates.integration.test.ts`
  — **2 passed, 13 assertions**.
- Broader CRM: `bun test test/crm_lead_duplicates.integration.test.ts test/crm.integration.test.ts`
  — **47 passed, 1 failed, 236 assertions**.
- Broader failure: existing `CRM YAML lifecycle integration > keeps every
  declared CRM named action represented in the AI allowlist`; the missing
  entries are the four Lead Mining Requests actions. This CRM-only change did
  not edit `services/ai/agent.yaml`.
- Discovery audit: `bun run audit` was attempted but is blocked by unrelated
  Events definitions: `upload_event_badge_background` is missing and
  `FormSection` is unregistered.
- Scoped formatting: `git diff --check -- sdk/bun/sample/services/crm
  sdk/bun/sample/test/crm_lead_duplicates.integration.test.ts
  sdk/bun/sample/plan/odoo-ui-parity/crm.md
  sdk/bun/sample/plan/odoo-ui-parity/qa/crm.md
  sdk/bun/sample/plan/odoo-ui-parity/qa/test-plans/crm.md` — passed.
