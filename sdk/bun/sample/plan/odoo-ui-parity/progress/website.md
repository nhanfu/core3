# website parity progress

Module owner: website module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: active
Verification trigger: feature-complete
Candidate commit: pending commit for Website lifecycle slice

## Current state

The Website page lifecycle now has focused integration evidence: a seeded Draft
page publishes and unpublishes through the declared YAML workflow, increments
row versions, rejects duplicate transitions, and enforces the manager-only
unpublish permission. This is a bounded slice only; no full parity claim is
made here.

## Next bounded task

Add authenticated browser mutation/reload evidence, public visibility and
site-scope checks, then continue with assets, persistence/restart, Fluent HTML,
and paired Odoo comparison before module sign-off.
