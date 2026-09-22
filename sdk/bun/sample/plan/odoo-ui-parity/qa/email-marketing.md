# email-marketing QA ledger

## Bounded review handoff — exact candidate `6f86823a` (2026-09-13)

- Recipient normalization/validation and idempotent persistence: **PASS**.
  CRLF, outer whitespace, named-address trimming, invalid-email rejection,
  duplicate-safe contacts/subscriptions, and refreshed list counts are covered.
- Focused Email Marketing suite: **PASS**, 46 tests / 459 assertions. Full
  repository run: **PASS**, 1,132 tests / 10,631 assertions. Audit, Email
  Marketing CSS, applicable ESLint, and diff-check passed.
- Blocker `EMAIL-MARKETING-BROWSER-001`: authenticated desktop/mobile import
  modal comparison was unavailable because js_repl/Playwright was unavailable;
  no candidate-specific modal screenshots or interaction claim is made.
- Paired authenticated Odoo comparison and broader actor/company, restart,
  Temporal, provider, and full route-tree gates remain open.

Disposition: bounded normalization change integrated; preserve the browser/Odoo
blocker and pending unsigned-off module status.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/email-marketing-desktop.png and email-marketing-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: evidence recorded; sign-off pending
QA slot: email-marketing candidate QA
Module owner: email-marketing module owner
Verification trigger: feature-complete
Candidate commit: `54f08872ce52db5c18013430ec694a654a37d2bd`

## Candidate `54f08872` verification (2026-09-13)

- Scope reviewed: every-recipient validation for the Mailing Test wizard,
  CRLF and outer-whitespace normalization, persisted multiline recipients and
  `last_test_email` compatibility mirror, optimistic stale-row guard, mailing
  workflow/recipient regression, permission/error contracts, audit, lint, and
  diff check. No product code was changed during QA.
- Focused regression: `bun test ./test/email_marketing*.integration.test.ts
  --timeout 20000` — **46 passed, 457 assertions, 0 failed**, across 14 files.
  The mailing test covers an invalid second address, CRLF normalization,
  outer whitespace trimming, persisted multiline recipients, first-address
  mirroring, and stale-row rejection. The wider corpus covers campaign and
  mailing send/schedule/cancel/retry guards, contact import and subscription
  workflow, blacklist/opt-out eligibility, persistence/idempotent migrations,
  and declared read/write/manager/technical permission and error boundaries.
- UI audit: `bun run audit` — **passed**, 659 pages, 668 routes, 1,139
  datasources.
- Lint: the sample package declares no `lint` script (`bun run lint` exits
  with `Script not found "lint"`). Direct ESLint on the changed TypeScript
  test passed; the YAML file was ignored with one expected warning because no
  ESLint configuration applies to YAML.
- Diff hygiene: `git diff --check HEAD^ HEAD` — passed. Candidate checkout
  was clean before QA; only this QA ledger commit is being added.

### Authenticated browser evidence

- Isolated candidate runner: `bun run agent:module -- email-marketing
  --port=4354`; `GET /api/modules` returned HTTP 200.
- Admin login: `admin@tms.local` / `admin123`. Canonical route
  `/email-marketing/email-mailings` rendered seeded Draft, In Queue, Sending,
  and Sent mailings at 1440x900 and 390x844. Both passes had zero page errors,
  zero failed requests, and no horizontal overflow (desktop 1440/1440,
  mobile 390/390).
- Desktop Mailing Test action opened the Odoo-shaped “Send a Sample Mail”
  wizard with the multiline `Recipients` field and `Cancel`/`Send test`
  controls. Mobile list rendering passed; the responsive list does not expose
  the desktop side-panel detail/wizard in the captured state.
- Captures: `/tmp/core3-odoo-parity/email-marketing-campaigns-54f08872-desktop.png`,
  `/tmp/core3-odoo-parity/email-marketing-campaigns-54f08872-mobile.png`,
  `/tmp/core3-odoo-parity/email-marketing-campaigns-54f08872-desktop-test-wizard.png`.
- Exploratory route probe: unqualified `/email-mailings` was blank at desktop,
  while the module-qualified canonical route above passed. This was not
  treated as a candidate-specific product failure without a route-contract
  mismatch, but should remain a route-entry follow-up.
- Odoo reference server responded on `8069` but redirected to `/web/login`;
  no authenticated paired Odoo desktop/mobile capture was available.

## Current regression evidence (2026-09-13)

- Focused Email Marketing suite: `bun test ./test/email_marketing*.integration.test.ts --timeout 20000` — 46 passed, 456 assertions, 0 failed across 14 files.
- Isolated runner `:4319` rendered the authenticated Campaigns list at desktop
  1440x900 and mobile 390x844; seeded Draft, Scheduled, Sending, and Sent
  records were visible with no page errors, failed requests, or horizontal
  overflow. Captures: `/tmp/core3-odoo-parity/email-campaigns-desktop.png` and
  `email-campaigns-mobile.png`.
- Regression: the campaign form previously submitted an empty optional
  `scheduled_at` as a string and produced DuckDB HTTP 500. Its YAML field is
  now declared as Core3 `datetime`; the same admin create flow on runner
  `:4321` returned HTTP 200, persisted through reload, and produced no browser
  errors or overflow. Capture: `/tmp/core3-odoo-parity/email-campaign-create-mobile.png`.

Detailed execution matrix: [`test-plans/email-marketing.md`](test-plans/email-marketing.md). It is the module-level source for campaign, mailing, contact, reporting, actor, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EMAIL_MARKETING-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Candidate `54f08872`; focused suite, audit, diff check, authenticated canonical-route desktop/mobile evidence recorded above | pending: actor/company matrix, restart/browser mutation, full route-tree visual coverage, and paired Odoo comparison remain open |
| EMAIL_MARKETING-FUNC-001 | Campaign, mailing, contact, reporting, configuration, and trace contracts | Focused suite 46/46, 457 assertions across 14 files | pass for tested contracts |
| EMAIL_MARKETING-BROWSER-001 | Authenticated Mailings list at desktop/mobile | Isolated runner `:4354`; canonical route rendered seeded states with 0 page/request errors and no overflow; desktop/mobile captures above | pass for Core3 runtime; paired Odoo comparison remains open |
| EMAIL_MARKETING-BROWSER-002 | Mailing Test recipient wizard | Desktop authenticated capture shows Odoo-shaped wizard and multiline Recipients field; mobile list capture passes without side-panel wizard | pass for captured Core3 states; mobile wizard interaction remains open |

## R2 dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-EMAIL-MARKETING-WAVE-20260913-R2` → `QA-EMAIL-MARKETING-WAVE-20260913-R2` | existing `agent/email-marketing-recipient-workflow-20260913` in `/home/nhanjs/projects/core3-worktrees/email-marketing-recipient-workflow-20260913` | Marketing actor/company boundaries for campaign, mailing, contact, and settings mutations, with 401/403, wrong-company, stale/missing, and unchanged-row focused tests | dispatched in `826f9556`; awaiting self-contained product commit before QA |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EMAIL_MARKETING-BUG-001 | Empty optional `scheduled_at` submitted as `""`, causing DuckDB timestamp conversion HTTP 500 | `c25f33d2` plus current working tree fix | Campaign field now uses `type: datetime`; focused suite 46/46 and browser create/reload retest pass | fixed |

## Sign-off

- Functional: pending full module sign-off; candidate recipient slice passes focused regression
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off

## Next review handoff: recipient validation `54f08872`

- Candidate `54f08872` is a self-contained Email Marketing slice covering
  every-recipient validation, CRLF/whitespace normalization, persisted
  multiline recipients, first-address compatibility mirroring, and stale-row
  protection. QA recorded the focused, audit, targeted ESLint, diff-check, and
  authenticated canonical-route desktop/mobile evidence above.
- Route the next event to the central review/integration gate from existing
  owner `agent/email-marketing-recipient-workflow-20260913` at
  `/home/nhanjs/projects/core3-worktrees/email-marketing-recipient-workflow-20260913`,
  candidate `54f08872`. Do not substitute later dispatch-only HEAD
  `826f9556`.
- Review must verify the Email Marketing-only diff and active contracts before
  integration. Actor/company, restart/browser mutation, complete route-tree,
  and paired Odoo gates remain open; no full module sign-off is implied.

## Review reconciliation: `54f08872`

- The candidate YAML/test product slice is already present on active as
  equivalent commit `efe5c846`; cherry-picking `54f08872` was empty after the
  active ledger conflict was preserved. No duplicate product merge was made.
- Active focused verification: `bun test
  ./test/email_marketing_mailings.integration.test.ts --timeout 20000` — **5
  pass, 69 assertions**. Candidate QA’s recipient regression, audit, targeted
  ESLint, diff-check, and authenticated desktop/mobile route/wizard evidence
  remain applicable.
- Later owner HEAD `826f9556` remains dispatch-only and was not substituted.
  Actor/company, restart/browser mutation, complete route-tree, and paired Odoo
  gates remain open; this is conditional bounded reconciliation only.

## Bounded review handoff — Add Selected Contacts to a Mailing List (2026-09-21)

- Source comparison: Odoo 19 revision `65975996`,
  `mailing_contact_to_list_action`, `mailing.contact.to.list`; the source Add
  branch creates only missing subscriptions and closes after its info
  notification.
- Core3 implementation: Email Marketing page/API fragments remain separate and
  match on `page.id: mailing-contacts`; the new `Add to List` bulk action is
  protected by `email_marketing.manage` and uses existing durable subscription
  storage. No migration was needed.
- Focused validation: `bun test ./test/email_marketing_add_contacts_to_list.integration.test.ts ./test/email_marketing_mailing_contact_import.integration.test.ts --timeout 20000` — **8 passed, 0 failed, 50 assertions**.
- Full Email Marketing regression: `bun test ./test/email_marketing*.integration.test.ts --timeout 20000` — **52 passed, 0 failed, 496 assertions** across 15 files.
- Covered assertions: deterministic selection mapping, idempotent replay,
  list-count refresh, file-backed restart, missing/empty/inactive/scope guards,
  page/API discovery, permission, transport state, and deferred companion
  navigation.
- Evidence bundle:
  `plan/odoo-ui-parity/evidence/email-marketing/2026-09-21/EMAIL-MARKETING-CONTACT-TO-LIST-001/`.
- Live blocker: authenticated `core3_reference` at `http://localhost:8069`
  shows Email Marketing as `uninstalled` with **Request Access**; no installed
  Odoo screen or wizard exists. Core3 browser capture is separately blocked by
  an unrelated Live Chat API discovery error (`actions[0].fields must be a
  non-empty array`).

Disposition: bounded Add branch implemented and test-evidenced; paired
installed-Odoo visual parity, Core3 browser mutation proof, and the source
Add-and-Send follow-up remain open. Do not sign off the module.

## Bounded review handoff — Mailing Duplicate (2026-09-22)

- Source comparison: Odoo 19 `mailing.mailing.action_duplicate` from
  `mass_mailing/views/mailing_mailing_views.xml`; visible only for Sent
  (`done`) mailings and opens a copied form.
- Core3 implementation: `pages/mailing-detail.yaml` adds the Sent-only
  Duplicate action; `api/mailing-detail.yaml` adds the page-bound durable copy
  mutation with Draft/reset counters, permission, source-state, and version
  guards.
- Focused validation: **3 passed, 0 failed, 16 assertions**; existing
  Mailings regression **5 passed, 69 assertions**; Add branch regression **4
  passed, 24 assertions**.
- Audit: **799 pages, 808 routes, 1,646 datasources**; Email Marketing Sass
  build and diff check passed.
- Evidence:
  `plan/odoo-ui-parity/evidence/email-marketing/2026-09-22/EMAIL-MARKETING-MAILING-DUPLICATE-001/`.
- Blockers: requested `core3_reference` has Email Marketing uninstalled/not
  exposed; isolated Core3 browser login required a human click and did not
  complete. No visual-parity claim is made.

## Bounded review handoff — Mailing List Merge (2026-09-22)

- Source comparison: Odoo 19 `mailing_list_merge_action` from
  `mass_mailing/wizard/mailing_list_merge_views.xml` and
  `wizard/mailing_list_merge.py`; selected mailing-list rows merge into a new
  or existing destination, deduplicate by email, skip opted-out/blacklisted
  contacts, and optionally archive source lists.
- Core3 implementation: `pages/lists.yaml` remains layout-only and adds the
  `Merge` bulk action; `api/lists.yaml` owns the page-ID-matched server form,
  lookup, transaction, permission, scope, validation, stale, and refresh
  contracts. No migration was needed because the existing durable list,
  contact, and subscription schema is sufficient.
- Focused validation: **4 passed, 0 failed, 23 assertions** in
  `test/email_marketing_mailing_list_merge.integration.test.ts`.
- Full Email Marketing regression: **59 passed, 0 failed, 535 assertions**
  across 17 focused integration files.
- Repository gates: `bun run audit` passed with 808 pages, 817 routes, and
  1,675 datasources; Email Marketing CSS and frontend Vite builds passed;
  `git diff --check` passed.
- Browser blocker: BrowserSkill instance `245ea108` was connected, but the
  signed-in tab `1770662590` could not be borrowed after the configured
  confirmation window and remained user-owned. The tab was not navigated, so
  no live Odoo merge route/action or desktop/mobile captures exist and no
  visual-parity claim is made.
- Evidence:
  `plan/odoo-ui-parity/evidence/email-marketing/2026-09-22/EMAIL-MARKETING-MAILING-LIST-MERGE-001/`.

Disposition: bounded merge workflow is implementation- and contract-tested;
paired authenticated Odoo/Core3 visual proof, full route-tree coverage, and
module sign-off remain open.

## Bounded review handoff — Odoo UTM Campaigns (2026-09-22)

- Source comparison: Odoo 19 `mass_mailing.action_view_utm_campaigns` from
  `mass_mailing/views/utm_campaign_views.xml`, inheriting the UTM campaign
  Kanban/List/Form contract and restricted to non-automatic campaigns.
- Core3 implementation: new `email_utm_campaigns` durable storage, page/API
  fragments joined by `page.id`, Campaigns menu route
  `/email-marketing/campaigns`, deterministic stage/tag fixtures, CRUD,
  search/group/filter, row-version guards, archive/restore, and mailing stat
  navigation. The existing synthetic `/email-campaigns` mailing route remains
  unchanged.
- Focused validation: **4 passed, 0 failed, 33 assertions** in
  `test/email_marketing_utm_campaigns.integration.test.ts`.
- Regression/build: Email Marketing suite passed (**63 tests, 568 assertions**);
  `bun run audit` passed with 824 pages, 832 routes, and 1,715 datasources; Email Marketing Sass and full
  frontend builds passed; `git diff --check` passed.
- Browser blocker: BrowserSkill instance `245ea108` was connected, but the
  authenticated Odoo tab `1770662590` was already borrowed by session `lexx`.
  The required borrow returned `tab is borrowed by another session`; no tab was
  navigated, no screenshots were produced, and no visual-parity claim is made.
- Evidence:
  `plan/odoo-ui-parity/evidence/email-marketing/2026-09-22/EMAIL-MARKETING-UTM-CAMPAIGNS-001/`.

Disposition: bounded Campaigns action is implementation- and contract-tested;
installed-Odoo desktop/mobile comparison, full Campaigns parity, and module
sign-off remain open.

## Bounded review handoff — Mailing-scoped Mail Statistics (2026-09-22)

- Source comparison: Odoo 19 `action_view_mail_mail_statistics_mailing` from
  `mass_mailing/views/mailing_trace_views.xml`; read-only `mailing.trace`
  action with `graph,list,form,pivot` and current-mailing context. Ordinary
  mass-mailing users have read access to the trace model.
- Core3 implementation: stable ID `EMAIL-MARKETING-MAILING-STATISTICS-001`,
  separate page/API detail and list contracts, a scoped route at
  `/email-mailings/statistics`, and a read-only `Mail Statistics` action on
  mailing detail. Technical `/email-traces` remains settings-only.
- Focused validation: `bun test ./test/email_marketing_mailing_statistics.integration.test.ts --timeout 20000` — **3 passed, 24 assertions, 0 failed**.
- Full Email Marketing regression: `bun test --reporter=dots ./test/email_marketing_*.integration.test.ts --timeout 20000` — **80 passed, 0 failed, 669 assertions across 23 files**.
- UI audit: **passed**, 865 pages, 873 routes, 1,828 datasources. Email
  Marketing Sass build and `git diff --check` are required release gates.
- Browser blocker: BrowserSkill instance `245ea108` was healthy; tab
  `1770663883` was already borrowed by session `qsyw`, and tab `1770663889`
  timed out waiting for configured confirmation in task session `gocr`.
  No Odoo tab was navigated and no visual-parity claim is made.
- Evidence:
  `plan/odoo-ui-parity/evidence/email-marketing/2026-09-22/EMAIL-MARKETING-MAILING-STATISTICS-001/`.

Disposition: bounded action is implementation- and contract-tested; the
authenticated Odoo desktop/mobile comparison and full Email Marketing
sign-off remain open.

## Bounded review handoff — Mailing A/B winner (2026-09-22)

- Source comparison: Odoo 19 `mailing.mailing.action_select_as_winner` from
  `mass_mailing/models/mailing.py` and the A/B Tests form controls in
  `mass_mailing/views/mailing_mailing_views.xml`; a sent A/B variant is copied,
  queued at 100%, and opened through `action_ab_testing_open_winner_mailing`.
- Core3 implementation: `mailing-detail` page/API fragments add the manual
  **Send this as winner** action, durable stable-ID final mailing, A/B group
  completion, deterministic fixtures/migrations, and stale/missing/not-ready/
  duplicate guards. Automatic winner selection and comparison remain deferred.
- Focused validation: **4 passed, 0 failed, 20 assertions** in
  `test/email_marketing_mailing_ab_winner.integration.test.ts`.
- Browser blocker: BrowserSkill instance `245ea108` was healthy, but the
  authenticated tab `1770662590` remained user-owned after the configured
  `120s` borrow wait. The tab was not navigated; no Odoo action screen or
  desktop/mobile captures exist and no visual-parity claim is made.
- Evidence:
  `plan/odoo-ui-parity/evidence/email-marketing/2026-09-22/EMAIL-MARKETING-MAILING-AB-WINNER-001/`.

Disposition: bounded manual winner workflow is implementation- and
contract-tested; authenticated Odoo/Core3 browser proof and Email Marketing
module sign-off remain open.

Validation handoff: focused A/B winner **4 passed, 0 failed, 20 assertions**;
Email Marketing regression **67 passed, 0 failed, 588 assertions** across 19
files; audit passed with **829 pages, 837 routes, 1,728 datasources**; Email
Marketing CSS and full frontend/Vite builds passed; scoped ESLint and
`git diff --check` passed. Concurrent CRM, Employees, and Events changes were
left unstaged and untouched.

## Bounded review handoff — Mailing A/B comparison (2026-09-22)

- Source comparison: Odoo 19 `mailing.mailing.action_compare_versions` in
  `mass_mailing/models/mailing.py`; the A/B Tests notebook button in
  `mass_mailing/views/mailing_mailing_views.xml` returns `A/B Tests` with
  `list,kanban,form,calendar,graph` modes over the current campaign's
  A/B-enabled mailings.
- Core3 implementation: `pages/ab-tests.yaml` and `api/ab-tests.yaml` add a
  read-only, campaign-scoped comparison page with all five visible modes,
  search/status filters, empty state, deterministic rows, and detail
  navigation. `mailing-detail` adds the source action and a durable minimum-two
  variant visibility guard.
- Focused validation: **3 passed, 0 failed, 23 assertions** in
  `test/email_marketing_mailing_ab_compare.integration.test.ts`.
- Full regression: **70 passed, 0 failed, 611 assertions** across 20 files.
- Builds: `bun run css:build:email-marketing` and `bun run frontend:build`
  passed. `bun run audit` passed with **845 pages, 853 routes, and 1,767
  datasources**. Scoped ESLint and `git diff --check` passed.
- Browser blocker: BrowserSkill instance `245ea108` was healthy and the
  authenticated Odoo tab was `1770662590`, but the required borrow returned
  `tab is borrowed by another session` with owner `ebbh`. The task did not
  navigate or reuse the tab; no Odoo/Core3 desktop/mobile captures exist and
  no visual-parity claim is made.
- Evidence:
  `plan/odoo-ui-parity/evidence/email-marketing/2026-09-22/EMAIL-MARKETING-MAILING-AB-COMPARE-001/`.

Disposition: bounded comparison is contract-tested and build-verified; full
module sign-off, global audit, paired installed-Odoo comparison, and complete
route-tree evidence remain open.
