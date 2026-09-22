# Verification

Focused integration: `test/base_contact_activities_overview.integration.test.ts`.

The test covers discovery, page/API separation, workflow registration,
idempotent migration, overdue/done filters, create/complete mutations, audit
persistence, file-backed restart, and permission/stale/company declarations.

Authenticated desktop/mobile browser evidence is blocked by the BrowserSkill
borrow timeout recorded in `browser-check.md`.
