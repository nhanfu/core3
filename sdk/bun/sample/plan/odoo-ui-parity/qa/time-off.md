# Time Off QA ledger

Module owner: time-off module owner
QA event: bounded candidate review
Candidate: `6300ab0a` (`test(time-off): verify deletion roles and restart persistence`)
Worktree: `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`
Date: 2026-09-13
Tester decision: conditional pass; reviewer sign-off required

## Evidence

- Deletion contract/tests: **PASS**, 4 tests / 24 assertions. Unchanged Draft
  deletion succeeds; missing, non-Draft, stale, and repeated deletes are
  rejected with deterministic guards.
- Role declaration: **PASS**. List/detail deletion requires `time_off.write`;
  responsible/manager `time_off.manage` tiers remain explicit.
- Restart persistence: **PASS**. File-backed DuckDB close/reopen and migration
  rerun preserve deletion.
- Full focused regression: **PASS**, 49 tests / 509 assertions across 18 files.
- Audit: **PASS**, 647 pages / 662 routes / 1,112 datasources.
- Frontend build and diff-check: **PASS**. No local lint script/binary was
  available; repository typecheck remains blocked by pre-existing shared and
  unrelated service errors, with no candidate file implicated.

## Blockers and open gates

- `TIME_OFF-HTTP-001`: live Core3 backend failed to bind `127.0.0.1:3001`, so
  authenticated actor enforcement was not revalidated for this candidate.
- `TIME_OFF-VISUAL-001`: Playwright/js_repl was unavailable; no candidate
  authenticated Core3 desktop/mobile screenshots were captured.
- `TIME_OFF-ODOO-001`: paired authenticated Odoo desktop/mobile comparison is
  pending; login/redirect availability is not comparison evidence.
- `TIME_OFF-TYPE-001`: pre-existing repository typecheck failures remain.
- `TIME_OFF-LINT-001`: no local lint command was available.

Disposition: conditional bounded pass only. Preserve these blockers; do not
claim full Time Off module sign-off or aggregate progress.
