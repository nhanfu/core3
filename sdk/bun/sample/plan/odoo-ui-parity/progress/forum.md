# forum parity progress

Module owner: forum module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: in-progress
Verification trigger: feature-complete
Candidate commit: 6f4d67f7 (question edit/archive slice)

## Current state

The current developer wave adds permissioned question editing and manager-only
archiving to the existing Forum Questions and Question Detail surfaces. No
module-completion claim is made here.

## Developer wave evidence — 2026-09-13

- Forum focused corpus: 8 tests passed, 56 assertions, 0 failures.
- Edit persists title/content/tags and increments `row_version`; stale and
  blank-title writes are rejected.
- Archive is terminal, requires `forum.manage`, rejects a `forum.write` actor,
  and persists the archived state and version.
- Browser mutation, restart/migration, full actor/company, answer, asset,
  import/export/print, Temporal, and paired Odoo gates remain open.

## Review integration

- Integrated commit: `6f4d67f7`.
- Reviewer reran `forum_post_pages.integration.test.ts`: 4 tests, 32
  assertions, 0 failures, and the repository UI audit passed.
- Browser mutation, restart/migration, full actor/company, answer, asset,
  import/export/print, Temporal, and paired Odoo gates remain open; this is not
  module sign-off.

## Wave 6 — Forum Tags (2026-09-22)

Odoo 19's next source-backed configuration surface is `menu_forum_tag_global` →
`forum_tag_action` (`/forum-tags`), with list/form views from
`forum_tag_view_list` and `forum_tag_view_form`. Core3 now separates the Tags
page and API by matching `page.id`, adds manager create/edit with `forum.write`,
derives the selected forum name, enforces required/active/duplicate/stale
guards, refreshes renamed post tag tokens atomically, and adds a durable unique
index migration.

Evidence: `evidence/forum/2026-09-22/FORUM-TAG-001/verification.md`.
Focused tag test passed 4/4 tests and 22/22 assertions; the full Forum corpus
passed 21/21 tests and 155/155 assertions. `git diff --check` passed.
The repository-wide UI audit and Core3 browser capture are blocked by the
unrelated pre-existing Blog YAML parse error before backend bind. Paired Odoo
Tags captures are blocked independently because `website_forum` is not
installed in `core3_reference`; desktop/mobile launcher captures record both
facts. No visual sign-off is claimed.

## Wave 7 — Post Close Reasons (2026-09-22)

Odoo 19's next self-contained `website_forum` configuration action is
`menu_forum_post_reasons` → `forum_post_reason_action` (`/forum-close-reasons`),
with the editable list from `forum_post_reason_view_list`. Core3 now keeps the
page and API in separate YAML files joined by `page.id`, adds durable seeded
`basic`/`offensive` reasons, manager-only CRUD, required/invalid/stale guards,
and idempotent migration/restart coverage. Ranks and Badges are external
`gamification` actions and remain explicitly deferred.

Evidence: `evidence/forum/2026-09-22/FORUM-CLOSE-REASONS-001/`.
Focused test passed 4/4 tests and 25/25 assertions; the full Forum corpus
passed 25/25 tests and 180/180 assertions. Odoo visual pairing is blocked by
the missing `website_forum` addon in `core3_reference`; the final Core3 runtime
check reached readiness, but authenticated desktop/mobile browser capture was
not completed before finalization. No visual sign-off is claimed.

## Next bounded task

QA should verify the committed answer toggle and remaining Forum actor and
persistence gates in authenticated desktop and mobile browsers when the Odoo
addon and stable Core3 browser session are available.

## Wave 8 — Reverse accepted answer (2026-09-22)

The next genuinely uncovered Odoo workflow was `toggle_correct`: reversing an
accepted answer. Core3 now adds `unaccept_forum_answer` to the answer relation,
with a separate `api/question-detail.yaml` backend fragment joined to the
presentation page by `page.id`. The transition requires `forum.manage`, checks
both parent and answer row versions, atomically changes `Accepted` to `Active`,
and increments both versions.

Focused suite: `bun test ./test/forum_answer_moderation.integration.test.ts
./test/forum_post_pages.integration.test.ts` — 11 tests, 101 assertions,
passed. Evidence: `evidence/forum/2026-09-22/FORUM-ANSWER-UNACCEPT-001/`.
Odoo desktop/mobile captures record the exact missing `website_forum` addon and
`/forum` 404; Core3 runtime reached readiness but the authenticated BrowserSkill
detail capture stopped before a stable page screenshot. No visual parity sign-off.

## Wave 5 — Forum configuration form (2026-09-21)

The next source-backed gap after question/answer moderation is now implemented:
the Forums list has manager-only create and row navigation to a durable
configuration form. `api/forums.yaml` and `api/forum-detail.yaml` own the
datasources/actions; the matching `pages/*.yaml` files remain presentation
fragments joined by `page.id`. The migration persists sequence, website, and
default sort fields and backfills existing fixtures. Create/edit guards cover
required and duplicate names, edits require `row_version`, and renames update
the denormalized post forum name atomically.

Focused evidence: `forum_forum_configuration.integration.test.ts` passed 4/4
tests and 25 assertions, including file-backed restart; the full Forum corpus passed 17/17 tests and 133
assertions. `forum.manage` is exercised at the authenticated action boundary.
Odoo's local source confirms the list/form action, but the live `core3_reference`
app launcher has no Website/Forum menu because `website_forum` is not installed;
paired Odoo captures remain blocked. Forum archive/restore is intentionally
deferred until the Core3 post `active` model can mirror Odoo's cascade safely.

## Wave 9 — Question favorite toggle (2026-09-22)

The next distinct source action after the accepted-answer reversal was Odoo's
authenticated `question_toggle_favorite` JSON-RPC route. Core3 now adds the
stable `FORUM-QUESTION-FAVORITE-001` slice: a durable per-user favorite
relation, `favourite_count`/`is_favorite` detail projection, and a separate
YAML API action joined to the existing detail page by `page.id`.

The toggle is `forum.read`-bound, requires the authenticated actor and current
question version, supports active/closed questions, increments the parent
version atomically, and rejects stale, archived, missing, and replayed writes.
The focused suite passed 4/4 tests and 19 assertions, including HTTP
permission enforcement and file-backed restart persistence.

Evidence: `evidence/forum/2026-09-22/FORUM-QUESTION-FAVORITE-001/`.
BrowserSkill instance `245ea108` was reachable, but borrow of the shared
authenticated Odoo tab was denied because session `ftio` already owned it.
The reference addon is also absent from `core3_reference`; desktop/mobile
visual pairing remains blocked and no visual sign-off is claimed.

## Wave 11 — Question downvote toggle (2026-09-22)

The next distinct source action after the completed question upvote slice is
Odoo's authenticated `post_downvote` JSON-RPC route. Core3 now adds stable
`FORUM-QUESTION-DOWNVOTE-001`: a durable signed downvote toggle on the existing
question-detail API/page pair, with direction switching, removal, aggregate
projection, and `forum.read` actor/stale/archived/own-post guards.

Focused suite passed 4/4 tests and 21/21 assertions, including HTTP permission
enforcement and file-backed restart persistence. Evidence:
`evidence/forum/2026-09-22/FORUM-QUESTION-DOWNVOTE-001/`.
BrowserSkill instance `245ea108` was reachable, but the shared authenticated
Odoo tab `1770662590` was already borrowed by session `mczn`; task-created
desktop/mobile `/forum` captures show the truthful 404 blocker. No visual parity
or module-completion claim is made.
