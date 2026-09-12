# Time Off parity progress

Module owner: time-off module owner
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `6300ab0a`

## Current state

The focused Time Off suite passes 47 tests across 18 files with 497 assertions.
This branch advances request CRUD with permissioned deletion from the list and
detail contracts. Only unchanged Draft requests can be deleted; the focused
DuckDB test proves durable removal and deterministic 404/409 rejection for
missing, non-Draft, and stale requests.

The candidate extends this with role declarations and file-backed restart
persistence. Full actor boundaries, browser evidence, and paired Odoo remain
open; no full parity claim is made.

## Candidate QA evidence

- 49 focused tests / 509 assertions passed; audit and frontend build passed.
- Live Core3 binding, browser tooling, paired Odoo, typecheck, and lint remain
  blocked as recorded in the QA ledger.
