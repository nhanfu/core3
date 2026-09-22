# forum QA ledger

## Conditional review handoff — exact candidate `eea0e68b` (2026-09-13)

- Forum integrity/filter/persistence slice: **PASS**, 9 tests / 64 assertions.
  Archived filtering, forum-name mismatch rejection, atomic `total_posts`
  increment, successful authenticated HTTP creation, and no-partial-write
  rejection are covered.
- Audit (659/668/1,134), Forum CSS, targeted ESLint, and diff-check passed.
- Conditional blockers preserved: authenticated desktop/mobile browser mutation
  and reload evidence, and durable restart verification, were unavailable due
  to missing Playwright/js_repl and the memory-backed runner. No browser or
  visual parity claim is made.

Disposition: bounded Forum change integrated conditionally; preserve browser,
durable-restart, actor, and Odoo gates. No full Forum module sign-off or
aggregate progress claim.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/forum-desktop.png and forum-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable forum assignment; dedicated QA pending
Module owner: forum module owner
Verification trigger: feature-complete
Candidate commit: 6f4d67f7 (question edit/archive slice)

## Wave 5 developer handoff — Forum configuration (2026-09-21)

- Added the source-backed Forums create/edit form on the existing `/forums`
  action, with a `/forum-detail` form route and manager-only `forum.manage`
  mutations.
- Focused configuration test: `forum_forum_configuration.integration.test.ts`
  — 4 tests, 25 assertions, passed, including file-backed restart.
- Full Forum corpus: `bun test ./test/forum*.integration.test.ts` — 17 tests,
  133 assertions, passed.
- Odoo Forum UI pairing remains blocked: live authenticated `core3_reference`
  has no Website/Forum app menu because `website_forum` is not installed.
- Core3 desktop/mobile authenticated browser proof and file-backed restart proof
  are still open gates until the candidate runtime is available.

Detailed execution matrix: [`test-plans/forum.md`](test-plans/forum.md). It is the module-level source for forums, posts, moderation, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| FORUM-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Integrated candidate `6f4d67f7` covers question edit/archive only; broader module gates remain open | pending |
| FORUM-FUNC-001 | Forum and Post Pages YAML contract corpus | `bun test ./test/forum*.integration.test.ts` — 7 tests, 43 assertions | pass |
| FORUM-PUBLIC-001 | Unauthenticated public question list/detail boundary | Public Active question renders at desktop/mobile with 200 response, no browser errors or overflow; missing and flagged IDs return 404; SQL contract includes Closed visibility and Flagged exclusion; captures `/tmp/core3-odoo-parity/forum-public-desktop.png` and `forum-public-mobile.png` | pass |
| FORUM-WORKFLOW-001 | Post close/reopen lifecycle | Focused test executes close and reopen, persists moderator reason and versions 1 → 3, and rejects invalid repeated transitions with 409 | pass |
| FORUM-FUNC-002 | Permissioned question edit and manager archive | `forum_post_pages.integration.test.ts`; edit persistence/stale/title guards and manager-only terminal archive pass in isolated repository tests | pass for service contract; browser, restart, full actor matrix, and paired Odoo gates remain open |
| FORUM-FUNC-009 | Forum Tags CRUD | Tags list/search/count, create/edit name/color/forum, exact post-token rename, duplicate/required/invalid/stale guards | pass: `forum_tags.integration.test.ts` |

## R2 dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-FORUM-WAVE-20260913-R2` → `QA-FORUM-WAVE-20260913-R2` | existing `agent/forum-post-moderation-wave` in `/home/nhanjs/projects/core3-worktrees/forum-post-moderation-wave` | Answer create/edit or accept/flag moderation relation, preserving post/author links, stale guards, actor permissions, and atomic no-partial-write behavior with focused tests | dispatched in `301f7fe1`; awaiting self-contained product commit before QA |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | No current-wave QA run | — | — | pending |

## Wave 6 developer handoff — Forum Tags (2026-09-22)

- Odoo source-backed Tags list/form completed from
  `addons/website_forum/views/forum_tag_views.xml` and
  `addons/website_forum/models/forum_tag.py`.
- Focused tag suite: `bun test ./test/forum_tags.integration.test.ts` — 4
  tests, 22 assertions, passed.
- Full Forum corpus: `bun test ./test/forum*.integration.test.ts` — 21 tests,
  155 assertions, passed.
- `git diff --check` passed. The repository UI audit is blocked by the
  unrelated pre-existing YAML parse error in
  `services/blog/pages/blog-workflow.yaml`; no non-Forum path was changed.
- Authenticated Odoo desktop/mobile launcher evidence confirms the exact live
  blocker: `website_forum` is not installed in `core3_reference`, so Website →
  Configuration → Forum → Tags is unavailable. Core3 desktop/mobile route
  evidence is blocked because the same discovery error prevents port 3001 from
  binding.
- Evidence: `../evidence/forum/2026-09-22/FORUM-TAG-001/verification.md`.

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off

## Wave 8 developer handoff — Reverse accepted answer (2026-09-22)

- Added `unaccept_forum_answer` to the question-detail answer relation and
  separated its backend contract into `api/question-detail.yaml`.
- Focused suite: `bun test ./test/forum_answer_moderation.integration.test.ts
  ./test/forum_post_pages.integration.test.ts` — 11 tests, 101 assertions,
  passed.
- Coverage includes accept→unaccept, stale/replay guards, direct authenticated
  permission denial, atomic parent/answer version updates, reload, and
  file-backed restart/migration replay.
- Evidence: `../evidence/forum/2026-09-22/FORUM-ANSWER-UNACCEPT-001/`.
- Blockers: `website_forum` is not installed in `core3_reference`, so Odoo has
  no Forum route/menu to compare; Core3 runtime reached readiness but the
  authenticated BrowserSkill detail session stopped before capture. No visual
  parity claim is made.

## Wave 7 developer handoff — Post Close Reasons (2026-09-22)

- Odoo source-backed Close Reasons list completed from
  `addons/website_forum/views/forum_post_reason_views.xml`,
  `views/forum_menus.xml`, and `models/forum_post_reason.py`.
- Focused suite: `bun test ./test/forum_close_reasons.integration.test.ts` — 4
  tests, 25 assertions, passed.
- Full Forum corpus: `bun test ./test/forum*.integration.test.ts` — 25 tests,
  180 assertions, passed.
- Odoo desktop/mobile authenticated launcher captures and the authenticated
  `/forum` 404 record the exact blocker: `website_forum` is not installed in
  `core3_reference`, so Close Reasons is absent. The final Core3 runtime check
  reached backend/frontend readiness, but authenticated Core3 desktop/mobile
  route evidence was not completed before finalization. No visual parity claim
  is made.
- Evidence: `../evidence/forum/2026-09-22/FORUM-CLOSE-REASONS-001/`.

## Wave 9 developer handoff — Question favorite toggle (2026-09-22)

- Implemented stable feature `FORUM-QUESTION-FAVORITE-001` from Odoo's
  `question_toggle_favorite` route in
  `addons/website_forum/controllers/website_forum.py`.
- Added durable `forum_post_favorites` schema, current-user favorite/count
  projections, page/API separation, and visible Favorite/Remove favorite
  detail actions.
- Focused suite: `bun test test/forum_question_favorite.integration.test.ts
  --timeout 20000` — 4 tests, 19 assertions, passed.
- Coverage includes per-user toggle/count behavior, stale and actor guards,
  archived-state rejection, authenticated HTTP permission enforcement, reload,
  migration replay, and file-backed restart persistence.
- BrowserSkill instance `245ea108` status was healthy. Borrowing tab
  `1770662590` was denied because it was already borrowed by session `ftio`;
  the worker session was stopped (`xwxz`) after the blocker was recorded.
  Existing authenticated desktop/mobile launcher captures show the reference
  database lacks `website_forum`; no Odoo/Core3 visual parity claim is made.
- Evidence: `../evidence/forum/2026-09-22/FORUM-QUESTION-FAVORITE-001/`.

## Wave 11 developer handoff — Question downvote toggle (2026-09-22)

- Implemented stable feature `FORUM-QUESTION-DOWNVOTE-001` from Odoo's
  `post_downvote` JSON-RPC route in
  `addons/website_forum/controllers/website_forum.py`.
- Added the question-detail `forum.posts.downvote` action and
  Downvote/Remove downvote presentation controls. The existing durable vote
  relation is reused; switching from upvote to downvote adjusts the signed
  aggregate atomically.
- Focused suite: `bun test ./test/forum_question_downvote.integration.test.ts
  --timeout 20000` — 4 tests, 21 assertions, passed.
- Coverage includes page/API separation, toggle/removal, direction switching,
  stale/own-post/actor/archived guards, HTTP permission enforcement, reload,
  and file-backed restart persistence.
- BrowserSkill instance `245ea108` was healthy. Borrowing tab `1770662590` was
  denied because it was already borrowed by session `mczn`; the task-created
  `/forum` tab returned HTTP 404 and desktop/mobile blocker captures are under
  `/tmp/core3-odoo-parity/`. No visual parity claim is made.
- Evidence: `../evidence/forum/2026-09-22/FORUM-QUESTION-DOWNVOTE-001/`.
