# Verification

- Focused feature test: `bun test test/employees_activity_filters.integration.test.ts`
  — 3 passed, 21 assertions.
- Adjacent regression run: activity CRUD/completion, newly hired, contract
  filters, and organization chart — 18 passed, 98 assertions.
- Migration replay and file-backed restart passed.
- `git diff --check` passed after the final edit.
- BrowserSkill evidence is conditional for user-tab borrowing because the only
  user tab was already borrowed by another active session. The authenticated
  task-owned Odoo tab produced the desktop/mobile captures listed in README.
