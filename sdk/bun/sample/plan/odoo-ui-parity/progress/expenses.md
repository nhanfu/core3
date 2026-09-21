# expenses parity progress

Module owner: expenses module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: in-progress
Verification trigger: feature-complete
Candidate commit: `7dee93a857fe55a4d773336c2ee41098aea8ae8a`

## Current state

## QA-pending candidate `99fe4073` (2026-09-13)

Receipt processing candidate is queued in existing
`agent/odoo-expenses-dev-next-20260913`; no merge was performed. Focused
receipt/migration evidence is **6/23**, audit **659/668/1,137**. Build/lint/
diff-check confirmation and authenticated actor/browser, restart,
Temporal/provider, and Odoo gates remain open.

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
- Import/export/print follow-up: service-owned deterministic expense import
  persists sheets and expenses, recalculates sheet totals, enforces malformed
  row and company-scope guards, and is replay-safe. Export and print are
  read-permissioned actions over the loaded datasource. Focused test, full
  Expenses corpus, relevant ESLint, and Expenses CSS build pass.

## Next bounded task

Complete fresh authenticated desktop/mobile interaction and actor checks,
paired Odoo comparison, and repository lint cleanup before module sign-off.

## Reviewer reconciliation `99fe4073` (2026-09-13)

Integrated the bounded receipt-processing attempt/result and retry/replay slice
as `f497301b`. Post-merge verification passed **38/217**, audit **661/670/1,158**,
frontend build, and diff-check; QA reports authenticated desktop/mobile,
permissions/company scope, CRUD/workflow, attachment/activity, idempotency, and
migration/replay evidence. Temporal is not applicable to the synchronous
provider boundary. File-backed live restart and fresh authenticated Odoo
comparison remain open; no full Expenses sign-off.

## Batch 7 - incoming email gateway (2026-09-21)

Implemented EXPENSE-FUNC-010 in the Expenses service. The source-backed
configuration and mail-import path now persists alias/domain settings, sender
identity mapping, inbound message idempotency, Draft expense creation from
Odoo-style subject tokens, receipt attachment metadata, activity history, and
sheet totals. Guards cover disabled gateway, recipient alias, company scope,
required input, and conflicting message replay.

Focused evidence: bun test
test/expenses_email_gateway.integration.test.ts --timeout 20000 - 3 tests /
19 assertions passed; the full Expenses corpus is 42 tests / 248 assertions
across 12 files, audit and Expenses CSS passed, and the migration replay gate
now includes 12 versions. The Core3 backend eventually bound after delayed
startup, but the shared browser profile had no Core3 authentication and
`/api/pages/dashboard` returned 401, so no new Core3 desktop/mobile parity
 claim is made.

## Batch 8 - expense activity scheduling/completion (2026-09-22)

EXPENSE-FUNC-011 is implemented in the Expenses service. It maps Odoo's
`mail.activity.mixin` / `activity_ids` contract to a durable scheduled-activity
table, detail chatter source, Schedule activity action, Mark done action,
company/actor/version/type/date guards, deterministic seed data, completion
audit, and restart/migration replay coverage. Focused result: 4 tests / 23
assertions; audit 782/791/1,606; CSS build and diff-check pass.

Evidence: `odoo-ui-parity/evidence/expenses/2026-09-22/EXPENSE-FUNC-011/`.
The migration replay expectation was updated from 12 to 13 versions after the
new Expenses migration. Paired Odoo screenshots and the Core3 browser result
are recorded in the feature evidence; no module sign-off is claimed while the
broader authenticated actor and paired visual gates remain open.
