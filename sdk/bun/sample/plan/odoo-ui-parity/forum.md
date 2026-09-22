# Forum parity — bounded wave 7 slice

Status: in-progress. Wave 7 adds the authenticated Post Close Reasons editable
list behind the existing Forum menu. It is not the anonymous `/forum` website
route or the complete answer, rank, badge, and moderation module.

## Source-backed Odoo trace

Reference: Odoo 19 `addons/website_forum`.

| Odoo entry | Source action/view | Core3 route | Permission |
| --- | --- | --- | --- |
| Website → Content → Forum Posts | `menu_forum_post_pages` → `forum_post_action` | `/forum-post-pages` | `forum.read` |
| Forum Post Pages list | `forum_post_view_tree` | List tab | `forum.read` |
| Forum Post Pages kanban | `forum_post_view_kanban` | Kanban tab | `forum.read` |
| Forum Post Pages graph | `forum_post_view_graph` | Graph tab | `forum.read` |
| Row website action | `go_to_website` | existing Core3 question detail alias | `forum.read` |
| Website → Configuration → Forum → Forums | `menu_forum_global` → `forum_forum_action` | `/forums` (action path alias) | `forum.read` |
| Forums list | `forum_forum_view_tree` | List view | `forum.read` |
| Website → Configuration → Forum → Tags | `menu_forum_tag_global` → `forum_tag_action` | `/forum-tags` | `forum.read` |
| Forum Tags list/form | `forum_tag_view_list`, `forum_tag_view_form` | List with create/edit form | `forum.read` / `forum.write` |
| Website → Configuration → Forum → Close Reasons | `menu_forum_post_reasons` → `forum_post_reason_action` | `/forum-close-reasons` | `forum.read` |
| Post Close Reasons list | `forum_post_reason_view_list` | Editable List | `forum.manage` |
| Forum Questions list | `forum_post_action` | `/forum-questions` | `forum.read` |
| Question edit | `forum_post_view_form` | question detail edit form | `forum.write` |
| Question archive | moderation action on `forum.post` | question row/detail action | `forum.manage` |
| Forum create | `forum_forum_view_form_add` → `forum_forum_action_add` | create modal on `/forums` | `forum.manage` |
| Forum detail/edit | `forum_forum_view_form` | `/forum-detail?id=...` | `forum.manage` |
| Forum duplicate-name guard | `forum.forum.name` required/unique model field | create/edit mutation | `forum.manage` |

This is the next uncovered source action after Forum Posts, by the source menu
sequence. Odoo orders Forums before Ranks, Tags, Badges, and Close Reasons.
The bounded view reproduces the sequence handle, Forum, Website, Total Posts,
and Total Views columns; optional Total Answers and Total Favorites remain
available in the datasource but hidden by default. Archived is a search filter.
This wave adds the next uncovered write surface: manager-only forum creation
and configuration editing for name, mode, privacy, website, description,
default sort, and sequence. Updates use optimistic row versions and refresh
the denormalized post forum name in the same transaction. Forum archive/restore
and its source-level active cascade remain a follow-up because Core3 currently
models archived questions as a terminal moderation state rather than Odoo's
separate `active` flag on `forum.post`.

Odoo declares `view_mode=list,kanban,graph`, a Posts-default search context,
no create button, and list fields Content, Website URL, Forum, # Views,
# Answers, Status, and SEO Optimized. Search also exposes Posts, Answers,
Accepted Answer, Answered Posts, Archived, date filters, and group-by Forum,
Author, and Post. Core3 represents the bounded useful subset in YAML tabs and
filters; the existing question-detail page is the deliberate Core3 route alias
for opening a record, since the generic runtime does not yet support external
website object actions.

## Core3 contract

- `pages/forum-post-pages.yaml` is presentation-only.
- `api/forum-post-pages.yaml` owns datasources/actions and joins by
  `page.id: forum-post-pages`.
- `pages/forums.yaml` is presentation-only; `api/forums.yaml` owns the Forums
  datasource/actions and joins by `page.id: forum-forums`.
- `pages/forum-detail.yaml` is presentation-only; `api/forum-detail.yaml` owns
  the detail datasource/actions and joins by `page.id: forum-detail`.
- Existing deterministic Forum migration fixtures provide two top-level posts,
  one answered and one unanswered, so Posts and Answered Posts are testable.
- `forum.read` gates the list, state lookup, and row navigation. `forum.write`
  gates question editing; `forum.manage` gates terminal archive. Archived
  questions cannot be edited or archived again.
- `forum_posts` declares `Archived` as a terminal state and the archive action
  requires an expected row version.
- `fixture_state=empty`, `fixture_state=transport_error`, search, status, and
  content-scope paths are covered by the focused test.
- Forums active/archived, search, empty, and transport-error paths are covered
  by the focused test; `forum.read` gates the action.
- `forum.manage` gates Forum create/edit; create and edit require a non-empty
  unique name, and edit requires the current `row_version`.
- The configuration migration adds durable sequence, website, and default-sort
  fields with backfilled values for existing fixtures.
- `pages/tags.yaml` is presentation-only and `api/tags.yaml` owns the matching
  `forum-tags` datasource/actions. Tag create/edit uses `forum.write`, derives
  the forum display name from the selected forum, enforces active-forum and
  `(forum_id, name)` uniqueness, and refreshes the denormalized post tag token
  when a tag is renamed.
- Migration `20260922100000-007-forum-tag-constraint.yaml` adds the durable
  database uniqueness index; the tag suite covers search, exact token counts,
  empty/transport-error behavior, stale updates, permissions, and restart.
- `pages/close-reasons.yaml` is presentation-only and `api/close-reasons.yaml`
  owns the matching `forum-close-reasons` datasource/actions. The list mirrors
  Odoo's `editable="bottom"` surface with required `name` and the
  `basic`/`offensive` `reason_type` selection. `forum.manage` gates create,
  edit, and delete; mutations require valid types and current `row_version`.
- Migrations `20260922110000-008-forum-close-reason-schema.yaml` and
  `20260922110001-009-forum-close-reason-data.yaml` create the durable reason
  table and idempotently seed Odoo's 13 demo reasons. The focused suite covers
  search, empty/transport-error behavior, validation, stale writes,
  permission enforcement, deletion, migration reapply, and restart.

## Acceptance/evidence

- [x] Source menu/action/view trace recorded before implementation.
- [x] Page/API separation and discovery join tested.
- [x] Deterministic populated/search/empty/error fixtures tested.
- [x] Authenticated permission boundary is declared; anonymous website route is
  explicitly outside this bounded slice.
- [x] Permissioned question edit persistence, required-title validation, stale
  update rejection, and archived-record guard tested.
- [x] Manager-only archive transition and forbidden writer attempt tested with
  persisted state and row-version assertions.
- [x] Forum configuration create/edit persistence, duplicate-name/required-name
  guards, stale update rejection, post relation refresh, and authenticated
  `forum.manage` boundary tested.
- [x] Odoo Forum Tags list/form is implemented with page/API separation,
  durable uniqueness, create/edit persistence, post-tag rename refresh, stale
  and validation guards, restart coverage, and authenticated `forum.write`.
- [x] Odoo Post Close Reasons editable list is implemented with page/API
  separation, durable Odoo seed data, create/edit/delete actions, valid-type
  and required-name guards, stale-row protection, `forum.manage`, and restart
  coverage.
- [ ] Odoo and Core3 authenticated desktop 1440×900 captures.
- [ ] Odoo and Core3 authenticated mobile 390×844 captures.
- [ ] Visual comparison sign-off after runtime/browser availability check.

## Wave 8 source-backed feature — Reverse accepted answer — 2026-09-22

The next uncovered workflow after the existing answer create/edit/accept/flag
slice is Odoo's `toggle_correct` reverse transition. Odoo's
`website_forum.controllers.website_forum.post_toggle_correct` toggles the
answer's `is_correct` value while ensuring one accepted answer per question.
Core3 now exposes the bounded equivalent as `unaccept_forum_answer` on the
question detail answer relation. It requires `forum.manage`, the current
parent and answer row versions, changes `Accepted` back to `Active`, and
increments both versions atomically.

`pages/question-detail.yaml` is presentation-only and
`api/question-detail.yaml` owns the matching datasources/actions joined by
`page.id: forum-question-detail`. No migration was required because the
existing durable answer state and row-version columns already support the
transition.

Evidence: `evidence/forum/2026-09-22/FORUM-ANSWER-UNACCEPT-001/`.
Focused answer/post regression tests passed 11/11 with 101 assertions,
including restart, stale/replay, and authenticated permission checks. The live
Odoo reference remains blocked because `website_forum` is not installed in
`core3_reference`; Core3 runtime readiness was reached, but the BrowserSkill
session stopped before an authenticated Core3 detail capture. No visual parity
claim is made.

## Wave 5 developer evidence — 2026-09-21

- Focused Forum corpus: `bun test ./test/forum*.integration.test.ts` — 17
  passed, 133 assertions, 0 failures.
- New configuration test: `bun test ./test/forum_forum_configuration.integration.test.ts` — 4
  passed, 25 assertions, 0 failures.
- `git diff --check` and the module UI audit are required before commit.
- Authenticated browser captures and durable file-backed restart/reapply remain
  evidence gates for this wave.

## Wave 6 source-backed feature — Forum Tags — 2026-09-22

Odoo 19 source comparison identified the next bounded gap in
`addons/website_forum/views/forum_tag_views.xml`: `forum_tag_action` exposes
`view_mode=list,form` at `/forum-tags`, the editable list contains `name`,
`color`, and `forum_id`, and `forum_tag_view_form` exposes the same fields.
`addons/website_forum/models/forum_tag.py` requires `name` and `forum_id` and
declares a unique `(name, forum_id)` constraint. Core3 previously had a
partial Tags page with its datasource/actions embedded in the page YAML and no
edit action or durable DB uniqueness.

The new bounded implementation is in `services/forum/pages/tags.yaml`,
`services/forum/api/tags.yaml`, migration
`20260922100000-007-forum-tag-constraint.yaml`, and
`test/forum_tags.integration.test.ts`. It covers page/API discovery, search,
exact post-token counts, create/edit/rename, duplicate/required/invalid/stale
guards, `forum.write`, and file-backed restart persistence.

Focused tag evidence: `evidence/forum/2026-09-22/FORUM-TAG-001/verification.md`.
The authenticated Odoo desktop/mobile captures show the app launcher without
Website or Forum; `website_forum` is not installed in `core3_reference`, so no
Odoo Tags list/form exists to capture. Core3 browser capture is also blocked by
the unrelated pre-existing `services/blog/pages/blog-workflow.yaml` discovery
parse error; the backend exits before binding port 3001. No visual parity claim
is made.

## Wave 7 source-backed feature — Post Close Reasons — 2026-09-22

Odoo 19 source comparison identified the next self-contained `website_forum`
configuration action after the completed Tags slice. `views/forum_menus.xml`
declares `menu_forum_post_reasons` at sequence 50 and
`views/forum_post_reason_views.xml` exposes `forum_post_reason_action` at
`/forum-close-reasons` with `view_mode=list`; its editable list contains
`name` and `reason_type`. `models/forum_post_reason.py` requires `name` and
defines the `basic`/`offensive` selection, ordered by name. Ranks and Badges
remain separate `gamification` actions and are not approximated in this slice.

Core3 implements the bounded list in `services/forum/pages/close-reasons.yaml`
and `services/forum/api/close-reasons.yaml`, joined by `page.id:
forum-close-reasons`. The new table and deterministic 13-row Odoo fixture are
owned by migrations 008/009. `test/forum_close_reasons.integration.test.ts`
covers the page/API contract, populated/search/empty/error states, CRUD,
invalid type and blank name guards, stale update/delete, `forum.manage` at the
authenticated action boundary, migration reapply, and file-backed restart.

Evidence: `evidence/forum/2026-09-22/FORUM-CLOSE-REASONS-001/`.
The Odoo desktop/mobile launcher captures and `/forum` response show that
`website_forum` is not installed in `core3_reference`; no Odoo Close Reasons
screen exists to pair. The final runtime check reached Core3 backend/frontend
readiness, but an authenticated Core3 desktop/mobile capture was not completed
before finalization. No visual parity or module sign-off is claimed.

## Wave 9 source-backed feature — Question favorite toggle — 2026-09-22

Odoo 19's next distinct question action is
`WebsiteForum.question_toggle_favorite`, exposed at
`/forum/<forum>/<question>/toggle_favourite` in
`addons/website_forum/controllers/website_forum.py`. It is an authenticated
JSON-RPC action that adds or removes the current user from
`forum.post.favourite_ids` and returns the resulting boolean state. The source
form/list surfaces expose `favourite_count` for question statistics.

Stable ID: `FORUM-QUESTION-FAVORITE-001`.

Core3 now persists a user-scoped `forum_post_favorites` relation in migration
`20260922130000-010-forum-favorites.yaml`. The question-detail API derives
`favourite_count` and the authenticated user's `is_favorite`; the presentation
page remains separate and joins through `page.id: forum-question-detail`.
`toggle_forum_post_favorite` requires `forum.read`, an authenticated actor,
the current question row version, and active/closed state. The transaction
inserts or deletes one `(post_id, user_id)` relation, increments the question
version, returns the new state, and rejects stale, archived, missing, or
unauthenticated requests without partial writes.

Evidence: `evidence/forum/2026-09-22/FORUM-QUESTION-FAVORITE-001/`.
Focused functional, HTTP permission, stale/archived, and restart coverage is
in `test/forum_question_favorite.integration.test.ts`. The live BrowserSkill
borrow was blocked because the authenticated Odoo tab was already borrowed by
session `ftio`; existing desktop/mobile launcher captures still show that
`website_forum` is absent from `core3_reference`. No visual parity claim is
made.

## Runtime evidence and blockers — 2026-09-12

- Odoo login was authenticated successfully with the local parity credentials
  at `/web/login` on both 1440×900 and 390×844 Chromium contexts.
- The active Odoo reference returned HTTP 404 for `/forum`; the guessed
  authenticated action URLs `action-website_forum.forum_post_action` and
  `action-website_forum.forum_forum_action` redirected to Discuss. This means
  `website_forum` is not installed in the configured reference database, so no
  Odoo Forum Posts screen was available for a visual comparison.
- Core3 startup was attempted with `bun run dev --db=ddb --memory`, but the
  backend exited before binding port 3001 with:
  `Named action sms_marketing.mailings.cancel permission does not match its
  workflow transition`. The frontend therefore also stopped; both Core3
  desktop and mobile route attempts were connection-refused.
- Screenshots from these attempts are under `/tmp/core3-odoo-parity`; no visual
  parity claim is made for this slice until both runtimes are available.
- Wave 3 capture attempt: Odoo still returns HTTP 404 for `/forum`. The fresh
  Core3 runner found port 3001 occupied by an existing process (401 on `/forums`)
  and then failed its frontend watcher with `EMFILE: too many open files`; no
  authenticated browser session or desktop/mobile screenshot could be produced.
- Wave 5 live-menu check: authenticated Odoo at `/odoo` opened the app launcher,
  but `core3_reference` exposes Discuss and other installed apps, not Website or
  Forum. The local Odoo 19 source still confirms `menu_forum_global`,
  `forum_forum_action`, `forum_forum_view_form_add`, and
  `forum_forum_view_form`; paired Odoo Forum screenshots are therefore blocked
  by the reference database not having `website_forum` installed.
