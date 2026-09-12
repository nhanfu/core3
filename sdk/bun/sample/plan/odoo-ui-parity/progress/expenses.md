# expenses parity progress

Module owner: expenses module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: in-progress
Verification trigger: feature-complete
Candidate commit: `7dee93a857fe55a4d773336c2ee41098aea8ae8a`

## Current state

The module has a current functional/browser QA candidate. No complete parity
claim is made because paired Odoo visual adjudication and broader attachment,
wizard, and CRUD interaction coverage remain open.

## Current evidence (2026-09-12)

- Expenses focused corpus: `bun test ./test/*expense*.integration.test.ts --timeout 20000` — 30 passed, 182 assertions, 0 failed across 9 files.
- Fresh authenticated route matrix on port 4029 passed 10 registered routes
  at desktop 1440x900 and mobile 390x844: 20/20, with no page/request errors,
  HTTP failures, or horizontal overflow.
- Fresh authenticated expense lifecycle passed for `expense-demo-draft`:
  Draft → Submitted → Approved → Posted, row versions 1 → 4, with journal
  and accounting date persisted. Fleet approval was denied with 403
  `expenses.manage`.

## Migration replay gate (2026-09-13)

- `expenses_migrations.integration.test.ts` covers the planned
  `EXPENSE-FUNC-008` restart/migration gate. It upgrades an in-memory database
  from `0.0.2` to the latest Expenses migration, replays the latest migration
  invocation, and verifies stable counts for sheets, expenses, activities,
  attachments, duplicate candidates, and split lines.
- The replay keeps 10 migration versions and the duplicate receipt checksum
  intact; no duplicate seeded rows are created.

## QA verification (2026-09-13)

- Candidate-focused corpus rerun: `bun test ./test/*expense*.integration.test.ts --timeout 20000` — 30 passed, 182 assertions, 0 failed across 9 files.
- Migration upgrade/replay, seeded counts, receipt checksum, activity behavior,
  duplicate review, split-line validation/application, lifecycle guards, and
  permission boundaries pass in the focused corpus. UI audit and
  `git diff --check` pass.
- Authenticated desktop/mobile evidence is limited to the existing 2026-09-12
  route-smoke artifacts (`/tmp/core3-odoo-parity/module-matrix-20260912/`);
  fresh Playwright retest was unavailable because persistent `js_repl` was not
  exposed. No fresh Odoo comparison or full browser CRUD/actor claim is made.
- Repository lint remains blocked by two unrelated pre-existing
  `website_public.integration.test.ts` unsafe-optional-chaining errors; the
  workspace TypeScript check likewise has pre-existing shared diagnostics.

## Next bounded task

Complete fresh authenticated desktop/mobile interaction and actor checks,
paired Odoo comparison, and repository lint cleanup before module sign-off.
