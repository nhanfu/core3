# surveys parity progress

Module owner: surveys module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `1859b836edadc73bad3b432a7622b73fba684fa3`

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
