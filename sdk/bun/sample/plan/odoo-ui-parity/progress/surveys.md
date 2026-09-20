# surveys parity progress

Module owner: surveys module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `f7b9a24e7100e0821688ef006dec187212bb36de`

## Bounded QA rerun: f7b9a24e (2026-09-13)

Migration repair passes on fresh DuckDB: latest `0.0.17` had all three response indexes; rollback to `0.0.16` preserved a submitted response and both dependent earlier indexes; upgrade and two replays restored `0.0.17`, retained data, and left 17 migration rows. Candidate migration tests: 2/2 pass. Nonexistent target `9.9.9` is accepted as a no-op by the migration runner and is recorded as a framework finding.

Focused Surveys glob: 33 pass / 3 fail / 292 assertions across 36 tests. All three failures are the same unrelated discovery error, `components[0].activity_complete_action is not allowed`, in catalog/delete/invite tests. `bun run audit` fails on that same key; scoped `git diff --check` passes. Full repository regression was stopped on request after an unrelated `sales_orders_to_upsell` 30-second timeout; no full-suite pass is claimed.

Fresh module HTTP/browser probe: public `/surveys` returned 200; authenticated headless desktop 1440x900 and mobile 390x844 reached `/surveys` with zero page/request errors and no overflow, but empty body. Screenshots: `/tmp/core3-qa-surveys-f7b9-desktop.png` and `/tmp/core3-qa-surveys-f7b9-mobile.png`. No Odoo visual comparison or sign-off.

Status remains **qa-in-progress / blocked**, with migration repair verified but schema/audit, full regression, authenticated render, and paired Odoo evidence open.

## 2026-09-20 — `SURVEYS-QUESTION-CREATE-001`

Selected the smallest unfinished source-backed form workflow: Odoo's
Questions-tab inline `Add a question` control. Core3 implementation is complete
in the page/API pair `survey-detail`, with `surveys.write` permission,
parent-scoped ordered persistence, deterministic defaults, stale/archive and
validation guards, and file-backed restart coverage. Focused test result is
3/3 passing with 17 assertions. Authenticated Core3 desktop/mobile evidence
and truthful authenticated Odoo fallback captures are recorded under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-QUESTION-CREATE-001/`.
The current Odoo reference database has Surveys uninstalled, so this feature is
not visually signed off against Odoo. Overall module status remains
**qa-in-progress / conditional**.

## Current state

The focused Surveys suite passes 34 tests with 305 assertions across five files,
including keyed public start/submit retry behavior with single response rows
and counts. Fresh module-scoped public and authenticated browser probes at
1440x900 and 390x844 passed with no page/request errors or horizontal overflow;
captures are `/tmp/core3-qa-surveys-public-start-desktop.png`,
`/tmp/core3-qa-surveys-public-start-mobile.png`,
`/tmp/core3-qa-surveys-auth-desktop.png`, and
`/tmp/core3-qa-surveys-auth-mobile.png`. Required-answer submission returned
422 without mutation, Fleet was denied `surveys.read` with 403, and invalid
public API tokens returned 404 without disclosure. Forward migration
apply/reapply is stable (17 migration rows, 5 seeded responses, one
idempotency column on both runs). An exploratory full-chain DuckDB rollback to
`0.0.16` is blocked by dependent entries preventing alteration of
`survey_responses`. Audit and scoped diff-check pass. The full repository suite
was started but interrupted at the user's request before completion; no
full-suite pass is claimed. The
module-scoped authenticated process passed 28/28 route checks across 14 routes
at desktop and mobile sizes, and Fleet was denied `surveys.read` with HTTP 403.
The shared process on port 3002 was stale and returned page 404s; it needs a
fresh-process retest. A fresh authenticated lifecycle probe persisted a survey
and question, then moved Draft → Published → Closed → Archived → Draft with
row versions 1 → 5. Paired Odoo comparison remains open. No parity claim is
made here.

## Next bounded task

Resolve the DuckDB migration rollback/dependent-entry blocker, complete the
full repository regression, then repeat the complete actor mutation matrix and
paired Odoo desktop/mobile comparison. This bounded QA run does not sign off
the module.
