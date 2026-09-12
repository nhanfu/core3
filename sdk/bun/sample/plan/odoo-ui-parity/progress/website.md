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
made here.
The public boundary now resolves published pages by path and ID and excludes
draft pages through Website-owned operations. The public browser route and
Fluent HTML renderer are now declared and covered by an implementation
contract test. A live single-module browser smoke verified the published Home
at 1440x900 and 390x844, and verified that the draft Contact us page is not
exposed. These are Core3 runtime checks, not paired Odoo visual sign-off.

## Next bounded task

Add authenticated browser mutation/reload evidence, public visibility and
site-scope checks, then continue with assets, persistence/restart, richer
rendered page content, and paired Odoo comparison before module sign-off.

## Runtime evidence

| Date | Check | Evidence | Result |
| --- | --- | --- | --- |
| 2026-09-13 | Public Website page | Single-module server on `:4310`; published Home rendered at desktop/mobile; draft `/contactus` showed unavailable state; no page errors on published route | Core3 runtime pass; artifacts in `/tmp/core3-odoo-parity/website-public-desktop.png` and `website-public-mobile.png` |
