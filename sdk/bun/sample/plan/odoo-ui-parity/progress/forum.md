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
the missing `website_forum` addon in `core3_reference`; Core3 browser capture is
blocked by the pre-existing Blog YAML discovery error. No visual sign-off is
claimed.

## Next bounded task

QA should verify the committed edit/archive candidate in authenticated desktop
and mobile browsers, then run the remaining Forum actor and persistence gates.

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
