# Time Off QA ledger

Module owner: time-off module owner
QA event: bounded candidate review
Candidate: `6300ab0a`
Worktree: `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`
Date: 2026-09-13
Tester decision: conditional pass; reviewer sign-off required

## Evidence

- Deletion tests: **PASS**, 4 tests / 24 assertions; Draft, missing,
  non-Draft, stale, and repeated-delete guards pass.
- Role declaration: **PASS**; deletion requires `time_off.write` and actor
  `time_off.manage` tiers remain explicit.
- Restart persistence: **PASS** across file-backed DuckDB close/reopen and
  migration rerun.
- Full focused suite: **PASS**, 49 tests / 509 assertions across 18 files.
- Audit: **PASS**, 647 pages / 662 routes / 1,112 datasources.
- Frontend build and diff-check: **PASS**. Typecheck has pre-existing shared
  and unrelated service failures; no candidate file was implicated. No local
  lint command was available.

## Blockers

- Live Core3 failed to bind `127.0.0.1:3001`; live actor HTTP enforcement was
  not revalidated.
- Playwright/js_repl was unavailable; no authenticated Core3 desktop/mobile
  candidate captures were obtained.
- Paired authenticated Odoo desktop/mobile comparison remains pending.
- Pre-existing repository typecheck failures and unavailable local lint remain
  conditional quality blockers.

Disposition: conditional bounded pass only. Preserve blockers; no full Time Off
module sign-off or aggregate progress claim.
