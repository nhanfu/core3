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
