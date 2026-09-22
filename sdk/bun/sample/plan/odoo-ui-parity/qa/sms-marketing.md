# sms-marketing QA ledger

## Candidate `325d0a45` bounded review (2026-09-13)

- Company-scope migration/backfill, list/detail filtering, lifecycle write
  ownership, actor-company create derivation, and explicit 401/403/404
  contracts: **PASS** at isolated API/DuckDB level.
- Focused SMS regression: **PASS**, 17 tests / 145 assertions. Audit (659/668/
  1,141), SMS Sass, explicit-test ESLint, Vite build, and diff-check passed.
- Conditional blockers preserved: authenticated lifecycle actor matrix and
  reliable browser CRUD/reload evidence were not completed; file-backed restart,
  Temporal/provider boundaries, and authenticated paired Odoo desktop/mobile
  comparison remain open. YAML lint is not claimed because the service YAML is
  ignored by ESLint.

Disposition: bounded company-scope change integrated; SMS Marketing remains
unsigned off and no aggregate progress claim is made.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/sms-marketing-desktop.png and sms-marketing-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable sms-marketing assignment (pending wave dispatch)
Module owner: sms-marketing module owner
Verification trigger: feature-complete
Candidate commit: working tree after SMS Marketing QA planning

## Candidate 2fb85b60 bounded QA (2026-09-13)

- Exact candidate verified at `2fb85b60ce7fa1c5e84b37d80107c60b78dc0357` in the developer checkout. Product code was not changed by QA.
- Focused regression: `bun test ./test/sms_marketing*.integration.test.ts --timeout 20000` — **14 passed, 134 expectations, 0 failed** across five files. This covers schedule, send, cancel, Mark Sent/completion, stale row-version rejection, durable delivery counters, list/contact contracts, and analysis boundaries.
- Static timeout review: all four replacement detail actions (`send`, `schedule`, `cancel`, `complete/Mark Sent`) use `AbortController`, abort after exactly 10,000 ms, clear the timer, reload only after a successful mutation, and throw visible action errors for aborts: `Sending`, `Scheduling`, `Cancelling`, and `Completing SMS campaign timed out. Please try again.`
- UI audit: `bun scripts/audit-order-ui.ts` — passed, 659 pages, 668 routes, 1,140 datasources.
- Scoped lint: `bunx eslint sample/test/sms_marketing_campaigns.integration.test.ts sample/test/sms_marketing_transition_timeout.integration.test.ts` — passed with no warnings. Full `bun run lint` remains red only on unrelated pre-existing `sample/test/website_public.integration.test.ts:31,33` (`no-unsafe-optional-chaining`).
- CSS and diff hygiene: Sass compilation to `/tmp/sms-qa-2fb85b60.css` passed; `git diff --check 2fb85b60^ 2fb85b60 -- services/sms-marketing test/sms_marketing_campaigns.integration.test.ts test/sms_marketing_transition_timeout.integration.test.ts` passed.
- Authenticated Core3 browser attempt: single-module runtime on `localhost:4330` accepted `admin@tms.local` / `admin123`. Desktop 1440x900 reached the authenticated SMS Campaigns shell with no page errors and no horizontal overflow (`1440/1440/1440`), but campaign content did not render in the bounded wait. Mobile 390x844 redirected to login after `/api/auth/me` failed. Captures: `/tmp/sms-2fb85b60-desktop.png`, `/tmp/sms-2fb85b60-mobile.png`. No completed browser click/reload transition claim is made.
- Odoo: `http://127.0.0.1:8069/web/login` was reachable, but no authenticated SMS Marketing comparison was available; no paired Odoo claim is made.

### Separate discovery blocker

- `activity_complete_action` is a supported generic `OdooFormView` property in the shared schema/renderer and is exercised by Maintenance, but no SMS Marketing declaration, action, or Odoo SMS-specific mapping was discovered. This is unrelated to candidate `2fb85b60`'s lifecycle reload timeout repair and remains a discovery/parity blocker, not a candidate failure.

## Bounded QA execution (2026-09-13, candidate `7db5dde23c1258861fdd59341aff4d98e73782f0`)

- Focused regression: `bun test ./test/sms_marketing*.integration.test.ts --timeout 20000` — **13 passed, 93 expectations, 0 failed** across four files. This includes lifecycle transitions, stale completion rejection, durable row-version/counter assertions, list/contact permissions and failure contracts, and SMS analysis boundaries.
- Static workflow review: `schedule`, `send`, `complete`, and `cancel` are declared in `services/sms-marketing/pages/sms-workflow.yaml`; `complete_sms_campaign` is manager-only (`sms_marketing.manage`) and the detail page exposes `Mark Sent` only for `Sending`. All four mutations require `expected_row_version`, stale guards return 409 / `SMS_MAILING_STALE`, and updates require a changed row.
- Authenticated Core3 probe: direct single-module runtime `http://127.0.0.1:4330`, `admin@tms.local`, rendered `/sms-marketing/sms-campaigns` and `/sms-marketing/sms-campaigns/detail?id=sms-campaign-demo-004` at 1440x900. Four seeded campaigns rendered; the detail showed the Draft campaign and lifecycle controls. Probe reported zero `pageerror`, zero `requestfailed`, and `innerWidth=scrollWidth=bodyWidth=1440`.
- Desktop capture: `/tmp/core3-odoo-parity/sms-qa-7db5dde2-campaigns-desktop.png` (SHA-256 `46ebfc60329067fafde78be265325969fa054be23be3aeb5b819e20543ee38be`).
- UI transition limitation: the longer real-click sequence hung during the post-Schedule reload and was terminated. No browser claim is made for completed UI clicks, reload persistence, mobile rendering, actor/company mutation boundaries, or Odoo comparison. No mobile capture was produced in this bounded run.
- Persistence evidence is contract-level only: the focused test persisted `Sent`, `row_version=4`, and `delivered_count=24` after schedule → send → complete, and rejected a stale completion without changing the row.
- Permission evidence is contract/static only: `sms_marketing.write` guards send/schedule/cancel; `sms_marketing.manage` guards completion; `sms_marketing.read` protects campaign datasources. Manager/user/wrong-company/unauthenticated browser actor checks were not completed.
- Odoo evidence is unavailable: the module plan records local Odoo login rejection (`Wrong login/password`) and diagnostic captures only; no paired authenticated Odoo comparison is claimed.

## Audit and hygiene checks (2026-09-13)

- `bun scripts/audit-order-ui.ts` — passed: 659 pages, 668 routes, 1139 datasources.
- SMS SCSS compiled successfully to `/tmp/sms-qa-7db5dde2/index.css` using Sass; product CSS was not overwritten.
- `git diff --check 7db5dde2^ 7db5dde2 -- services/sms-marketing test/sms_marketing_campaigns.integration.test.ts` — passed with no whitespace errors.
- ESLint 9.39.5 reports the requested YAML/TS service path is ignored; no lint pass is claimed.

## Current regression evidence (2026-09-13)

- Focused SMS Marketing suite: `bun test ./test/sms_marketing*.integration.test.ts --timeout 20000` — 13 passed, 93 expectations, 0 failed across 4 files.
- Isolated runner `:4323` authenticated Campaigns at desktop 1440x900 with
  List/Kanban/Calendar/Graph tabs and at mobile 390x844 with grouped status
  cards. The desktop missing detail-page request was repaired; the retest has
  no HTTP errors, page errors, or horizontal overflow. Capture:
  `/tmp/core3-odoo-parity/sms-campaigns-desktop-fixed.png`.

Detailed execution matrix: [`test-plans/sms-marketing.md`](test-plans/sms-marketing.md). It is the module-level source for campaigns, lists, contacts, reports, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SMS_MARKETING-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Candidate `2fb85b60` bounded QA; contract lifecycle passes, browser/Odoo gates remain open | pending |
| SMS-FUNC-001 | SMS campaign, list, contact, and analysis contract corpus | Candidate `2fb85b60`: 14 tests, 134 expectations | pass |
| SMS-BROWSER-001 | Authenticated campaign route and view-mode loading | Isolated runner `:4323`; desktop and mobile rendered without errors or overflow; detail form-view request now resolves after page-ID filename correction | pass for Core3 runtime; paired Odoo comparison remains open |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| SMS-BUG-001 | Desktop SMS Campaigns loaded `campaign-detail` from `form_view`, but the declared page ID was `sms-campaign-detail`, producing HTTP 404 | `a3af7332` and current alias repair | Renamed the SMS page file and added shared file-stem aliases; desktop retest has no failed requests | fixed |

## Sign-off

- Functional: pass at focused contract level; browser action sequence incomplete
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off; bounded evidence recorded, browser/Odoo gates remain open

## Bounded wave 5 — delivery traces and failed retry (2026-09-21)

- Source comparison: **PASS**. Odoo's `action_retry_failed_sms` and the
  readonly SMS trace list/form were confirmed in local Odoo 19 source under
  `addons/mass_mailing_sms`; the implementation is limited to this module.
- Core3 contract: **PASS**. `sms_marketing_delivery_retry.integration.test.ts`
  covers 4 tests / 33 assertions: page/API `page.id` joins, trace list/form,
  migration replay, filtering/empty state, retry state transition, stale and
  company/state guards, and file-backed restart persistence.
- Odoo browser gate: **BLOCKED** for this feature. Authenticated
  `core3_reference` at `http://localhost:8069` exposes `SMS Marketing` only in
  Apps as an installable app; it is absent from the authenticated application
  menu, so the SMS mailing form/trace action cannot be opened. Evidence:
  `evidence/sms-marketing/2026-09-21/SMS-DELIVERY-RETRY-001/`.
- Odoo desktop/mobile diagnostics are captured at
  `/tmp/core3-odoo-parity/sms-wave5-odoo-apps-desktop.png` and
  `/tmp/core3-odoo-parity/sms-wave5-odoo-apps-mobile.png`; these prove the
  exact installation blocker only and are not claimed as SMS UI parity.
- Provider callback/Temporal execution is explicitly **OPEN**, not silently
  signed off; the bounded feature implements Odoo's retry state and durable
  trace audit path only.

| SMS-FUNC-008 | Delivery traces and failed retry | `sms_marketing_delivery_retry.integration.test.ts` | pass | Core3 contract; paired Odoo screen blocked |
| SMS-BROWSER-002 | Authenticated Odoo SMS form/traces desktop/mobile | `evidence/sms-marketing/2026-09-21/SMS-DELIVERY-RETRY-001/verification.md` | blocked | `mass_mailing_sms` not installed in `core3_reference` |

## Bounded wave 6 - blacklisted phone numbers (2026-09-22)

- Source comparison: **PASS**. The SMS configuration menu/action is declared by
  `mass_mailing_sms`; Odoo's phone blacklist list/form/search and archive
  behavior are defined by the local `phone_validation` addon.
- Core3 contract: **PASS**. `sms_marketing_phone_blacklist.integration.test.ts`
  covers 3 tests / 40 expectations: source/menu mapping, page/API joins,
  active/archive reads, input normalization, guarded create/edit/archive/
  restore, duplicate/invalid/missing/stale/state failures, and migration replay.
- Odoo browser gate: **BLOCKED**. In authenticated `core3_reference`, Apps
  lists “SMS Marketing” as installable and the launcher contains no SMS
  Marketing menu because `mass_mailing_sms` is not installed. The exact live
  observation was captured during this run with browser instance `245ea108`;
  no Odoo SMS configuration capture or visual-parity claim is made.
- Core3 browser gate: pending runtime probe; if the scoped runtime is unavailable
  the exact listener/readiness error and unauthenticated diagnostic will be
  recorded in the feature evidence.
## Bounded wave 7 - UTM campaigns (2026-09-22)

- Stable ID: `SMS-UTM-CAMPAIGNS-001`.
- Source comparison: **PASS**. The SMS menu points to the shared Odoo
  `mass_mailing.action_view_utm_campaigns`; local source confirms
  `kanban,list,form`, the non-automatic campaign domain, stage/responsible/tag
  search and grouping, archive/restore, and mailing stat/navigation surfaces.
- Core3 contract: **PASS**. The focused test covers 4 tests / 32 assertions:
  source/menu mapping, separate page/API IDs, deterministic migration replay,
  search/stage/archive/empty reads, CRUD, stage/title validation, duplicate
  protection, stale row-version rejection, archive/restore, permissions, and
  transport error contracts.
- Odoo BrowserSkill gate: **BLOCKED**. Browser instance `245ea108` reported a
  healthy daemon, but the one authorized borrow request for the existing
  signed-in Odoo tab timed out while awaiting the configured user-window
  confirmation. The user tab remained user-owned; no credentials, cookies, or
  tokens were read, and no independent login or alternate browser backend was
  used. No authenticated Odoo desktop/mobile captures exist for this feature.
- Core3 visual gate: **PENDING** until authenticated Odoo reference access is
  available. No visual-parity claim is made.

| SMS-FUNC-009 | SMS UTM Campaigns page/API and durable CRUD contract | `evidence/sms-marketing/2026-09-22/SMS-UTM-CAMPAIGNS-001/test-results.md` | pass | Core3 contract; visual gate open |
| SMS-BROWSER-003 | Authenticated Odoo SMS Campaigns desktop/mobile comparison | `evidence/sms-marketing/2026-09-22/SMS-UTM-CAMPAIGNS-001/verification.md` | blocked | BrowserSkill borrow confirmation timeout |

## Bounded wave 8 - Send SMS from UTM campaign (2026-09-22)

- Stable ID: `SMS-UTM-CAMPAIGN-SEND-001`.
- Source comparison: **PASS**. Odoo's `action_create_mass_sms` header action
  and `UtmCampaign.action_create_mass_sms` context were confirmed in the local
  `mass_mailing_sms` addon. The action is distinct from the already-landed
  Campaigns list/detail CRUD slice.
- Core3 contract: **PASS**. The focused UTM campaign test covers 5 tests / 47
  expectations, including Odoo source mapping, separate page/API contracts,
  active-list options, durable campaign-linked insert, parent count/version
  update, migration replay, duplicate protection, and stale-parent rejection.
- BrowserSkill gate: **BLOCKED**. Instance `245ea108` reported a healthy
  daemon, but authenticated Odoo tab `1770662590` was already borrowed by
  session `ivfy`. The borrow was refused before capture; no session takeover,
  independent login, alternate browser, or credential access was attempted.
  Desktop and mobile captures for this stable ID are absent. Existing
  diagnostic captures from earlier SMS waves remain outside Git and are not
  reused as visual-parity evidence for this feature.

| SMS-FUNC-010 | Odoo UTM campaign Send SMS form and durable linked mailing | `evidence/sms-marketing/2026-09-22/SMS-UTM-CAMPAIGN-SEND-001/test-results.md` | pass | Contract and migration evidence; visual gate open |
| SMS-BROWSER-004 | Authenticated Odoo campaign Send SMS desktop/mobile comparison | `evidence/sms-marketing/2026-09-22/SMS-UTM-CAMPAIGN-SEND-001/verification.md` | blocked | Tab `1770662590` owned by BrowserSkill session `ivfy` |

## Bounded wave 9 - UTM campaign SMS mailing tab (2026-09-22)

- Stable ID: `SMS-UTM-CAMPAIGN-MAILINGS-001`.
- Source comparison: **PASS**. Odoo's SMS campaign form adds the `SMS`
  notebook page over `mailing_sms_ids`, with mailing metrics and
  `action_duplicate`; the local source was read directly from
  `mass_mailing_sms/views/utm_campaign_views.xml`.
- Core3 contract: **PASS**. The focused test covers 4 tests / 21 expectations:
  page/API joins, source fields and list action, deterministic A/B projection,
  migration replay, duplicate persistence, parent count/version updates, and
  stale guards.
- BrowserSkill gate: **BLOCKED**. The shared Odoo endpoint was reachable and
  the existing authenticated tab was listed, but borrowing tab `1770662590`
  timed out while awaiting the configured confirmation. The tab remained
  user-owned; no alternate browser backend or credential access was attempted.
  No authenticated Odoo desktop/mobile captures exist for this stable ID.

| SMS-FUNC-011 | UTM campaign SMS mailing notebook/list and duplicate contract | `evidence/sms-marketing/2026-09-22/SMS-UTM-CAMPAIGN-MAILINGS-001/test-results.md` | pass | YAML/API/migration contract and persistence evidence |
| SMS-BROWSER-005 | Authenticated Odoo campaign SMS notebook desktop/mobile comparison | `evidence/sms-marketing/2026-09-22/SMS-UTM-CAMPAIGN-MAILINGS-001/verification.md` | blocked | BrowserSkill borrow confirmation timeout |

## 2026-09-13 coordinator dispatch — bounded SMS wave

- Existing owner `agent/sms-lifecycle-20260913` is assigned on
  `/home/nhanjs/projects/core3-worktrees/sms-owner-full-20260913`, based at
  `325d0a45`. Development event: `DEV-SMS-WAVE-20260913-R2`; QA event:
  `QA-SMS-WAVE-20260913-R2`; handoff commit: `00e807c2`.
- Scope is the next bounded durable/external delivery contract: provider
  attempt/callback or retry state with idempotent replay, preserving company
  scope, ownership, cancellation, and row-version guards. Candidate pending;
  aggregate progress untouched. Existing ledger edits in the owner worktree
  are preserved.
