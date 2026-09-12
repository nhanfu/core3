# website parity progress

Module owner: website module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: active
Verification trigger: feature-complete
Candidate commit: `f95d0965` plus current public-renderer runtime fix

## Current state

The Website page lifecycle now has focused integration evidence: a seeded Draft
page publishes and unpublishes through the declared YAML workflow, increments
row versions, rejects duplicate transitions, and enforces the manager-only
unpublish permission. This is a bounded slice only; no full parity claim is
made here. Page metadata now also has a guarded YAML edit action that persists
title, URL, site, and presentation flags with row-version concurrency checks.
The public boundary now resolves published pages by path and ID and excludes
draft pages through Website-owned operations. The public browser route and
Fluent HTML renderer are now declared and covered by an implementation
contract test. A live single-module browser smoke verified the published Home
at 1440x900 and 390x844, and verified that the draft Contact us page is not
exposed. Page content is now migration-backed and sanitized before public DOM
insertion; a live browser smoke rendered the seeded content with no scripts.
The public operations now accept an explicit site scope and deterministic
second-site fixtures prove duplicate paths do not cross site boundaries.
Published pages now expose only public asset metadata and a binary asset route;
the seeded SVG loaded successfully in a 390x844 headless browser check.
These are Core3 runtime checks, not paired Odoo visual sign-off.

## Next bounded task

Add authenticated browser permission/site-scope checks, then continue with
assets, richer rendered page content, and paired Odoo comparison before module
sign-off. Authenticated edit/save/reload and file-backed restart/migration
replay are now verified in the Core3 runtime.

## Runtime evidence

| Date | Check | Evidence | Result |
| --- | --- | --- | --- |
| 2026-09-13 | Public Website page/content | Single-module server on `:4310`; published Home/content rendered in headless Chrome; draft `/contactus` showed unavailable state; no page errors/scripts in rendered content | Core3 runtime pass; artifact `/tmp/core3-odoo-parity/website-public-content-desktop.png`; paired Odoo comparison pending |
| 2026-09-13 | Authenticated Page Manager edit | Admin browser session exposed row Edit, saved title/URL/content, and reloaded the list with the changed row; no page errors | Core3 runtime pass; durable restart and paired Odoo comparison pending |
| 2026-09-13 | File-backed restart and migration replay | Explicit DuckDB file retained edited published content/state/version across close/reopen and rerunning Website migrations | Core3 persistence pass; full process/permission matrix and paired Odoo comparison pending |
| 2026-09-13 | Public multi-site scope | Two deterministic published sites share `/`; explicit `website_id` resolves the requested site and cross-site ID lookup returns 404 | Core3 public scope pass; company/actor permission and paired Odoo comparison pending |
| 2026-09-13 | Published asset delivery | Seeded SVG is exposed only through a published page, returns `image/svg+xml`, loads at natural width 240 in mobile Chrome, and has no page errors | Core3 asset delivery pass; upload/editor asset workflow and paired Odoo comparison pending |
