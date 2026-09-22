# sms-marketing parity progress

Module owner: sms-marketing module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: active - blacklisted phone numbers bounded implementation in progress; sign-off gates remain open
Verification trigger: focused contract suite and module audit
Candidate commit: 2fb85b60ce7fa1c5e84b37d80107c60b78dc0357

## Current state

The campaign list/detail contract, deterministic fixtures, and mailing-list,
contact, and analysis slices are present in the active checkout. This wave
adds the manager-only `Sending -> Sent` completion action and optimistic
row-version guards for every campaign lifecycle transition. Focused lifecycle
tests cover durable state, delivery counters, and stale-transition rejection.
No authenticated visual-parity claim is made here.

## Next bounded task

Re-run authenticated campaign workflows with a stable service/runtime, then
exercise actor/company boundaries and paired Odoo comparison before updating
module sign-off. Do not treat the separate `activity_complete_action`
discovery gap as part of this timeout candidate.

## Current bounded task

Implement and verify `SMS Marketing / Configuration / Blacklisted Phone
Numbers` as the next distinct source-backed UI/workflow slice after delivery
traces and retry. The paired Odoo screen is blocked until `mass_mailing_sms` is
installed in `core3_reference`; do not claim visual parity from the Apps page.

## Wave 6 checkpoint (2026-09-22)

`SMS-UTM-CAMPAIGNS-001` implements the previously missing SMS Marketing
`Campaigns` menu action backed by Odoo's shared `action_view_utm_campaigns`.
The page/API contracts, durable stages and campaign storage, deterministic
fixtures, manager permission boundary, CRUD, archive/restore, validation, and
optimistic concurrency are covered by the focused integration test. The
authenticated Odoo desktop/mobile gate remains blocked by the BrowserSkill tab
borrow confirmation timeout; no visual-parity claim is made and module
sign-off remains open.

## QA checkpoint (2026-09-13, candidate `2fb85b60`)

The exact candidate passed the focused SMS suite: 14 tests / 134 expectations /
0 failures. The four lifecycle reload actions are statically bounded at 10
seconds, clear their timers, reload after success, and expose distinct timeout
errors. UI audit passed at 659 pages / 668 routes / 1,140 datasources; scoped
SMS ESLint, Sass compilation, and candidate diff-check passed. Full-repo lint
has only unrelated existing errors at `website_public.integration.test.ts:31,33`.

Authenticated Core3 desktop reached the SMS shell at 1440x900 without page
errors or horizontal overflow, but campaign data did not render in the bounded
wait; mobile redirected to login after `/api/auth/me` failed. Therefore no
browser transition, cleanup/reload persistence, or mobile workflow claim is
made. Odoo was reachable only at login, so no paired authenticated comparison
is claimed. The separate `activity_complete_action` discovery blocker is
recorded in the QA ledger and is unrelated to this candidate.

## QA checkpoint (2026-09-13, candidate `7db5dde23c1258861fdd59341aff4d98e73782f0`)

Focused SMS regression passed: 13 tests / 93 expectations / 0 failures. The
contract suite covers schedule → send → complete, stale completion rejection,
row-version persistence, and the manager-only completion action. Core3
authenticated desktop route/detail rendering also passed with no page/request
errors or horizontal overflow; capture is recorded in the QA ledger.

The real browser transition sequence hung during post-Schedule reload and was
stopped. Mobile, browser actor/company permissions, reload/restart persistence,
and paired authenticated Odoo evidence remain unverified. This checkpoint is
evidence only and does not sign off the module.
