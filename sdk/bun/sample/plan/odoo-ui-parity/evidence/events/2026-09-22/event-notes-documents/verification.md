# Verification and blockers

The implementation is limited to Events service/page/API/action/migration/test
and Events plan/QA/evidence paths. Existing unrelated worktree changes were
left untouched. `git diff --check` and staged-path checks are required before
commit.

The Odoo desktop and mobile reference surfaces exist and were captured. No
Odoo blocker was encountered. Core3 memory-mode startup reached readiness, but
this bounded checkpoint does not claim a new Core3 screenshot or full module
visual sign-off. Remaining blockers are the broader Events permission actor
matrix and complete responsive route comparison, which are outside this
bounded feature's focused evidence. The direct authenticated download endpoint
is covered by the restart test, but the shared client attachment URL resolver
does not currently map the Events attachment kind; therefore browser-click
download is intentionally not claimed. Fixing that shared resolver is outside
the Events-only path constraint.
