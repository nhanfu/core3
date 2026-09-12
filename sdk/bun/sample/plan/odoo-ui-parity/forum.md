# Forum parity — bounded wave 4 slice

Status: in-progress. This slice adds authenticated question moderation to the
existing Forum Questions surface; it is not the anonymous `/forum` website
route or the complete answer/taxonomy module.

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
| Forum Questions list | `forum_post_action` | `/forum-questions` | `forum.read` |
| Question edit | `forum_post_view_form` | question detail edit form | `forum.write` |
| Question archive | moderation action on `forum.post` | question row/detail action | `forum.manage` |

This is the next uncovered source action after Forum Posts, by the source menu
sequence. Odoo orders Forums before Ranks, Tags, Badges, and Close Reasons.
The bounded view reproduces the sequence handle, Forum, Website, Total Posts,
and Total Views columns; optional Total Answers and Total Favorites remain
available in the datasource but hidden by default. Archived is a search filter.
This wave adds permissioned title/content/tag editing with optimistic row
version checks and a manager-only terminal archive transition.

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
  datasource and joins by `page.id: forum-forums`.
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
- [ ] Odoo and Core3 authenticated desktop 1440×900 captures.
- [ ] Odoo and Core3 authenticated mobile 390×844 captures.
- [ ] Visual comparison sign-off after runtime/browser availability check.

## Wave 4 developer evidence — 2026-09-13

- Focused Forum corpus: `bun test ./test/forum*.integration.test.ts` — 8
  passed, 56 assertions, 0 failures.
- `git diff --check` passed in the isolated developer worktree.
- Browser mutation, restart/migration reapply, complete actor/company matrix,
  answer moderation, attachment/import/export, Temporal, and paired Odoo
  comparison remain QA/main-agent gates.

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
