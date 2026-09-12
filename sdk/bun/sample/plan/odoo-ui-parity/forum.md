# Forum parity — bounded wave 2 slice

Status: in-progress. This slice is the authenticated Website content-management
screen for public Forum posts; it is not the anonymous `/forum` website route.

## Source-backed Odoo trace

Reference: Odoo 19 `addons/website_forum`.

| Odoo entry | Source action/view | Core3 route | Permission |
| --- | --- | --- | --- |
| Website → Content → Forum Posts | `menu_forum_post_pages` → `forum_post_action` | `/forum-post-pages` | `forum.read` |
| Forum Post Pages list | `forum_post_view_tree` | List tab | `forum.read` |
| Forum Post Pages kanban | `forum_post_view_kanban` | Kanban tab | `forum.read` |
| Forum Post Pages graph | `forum_post_view_graph` | Graph tab | `forum.read` |
| Row website action | `go_to_website` | existing Core3 question detail alias | `forum.read` |

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
- Existing deterministic Forum migration fixtures provide two top-level posts,
  one answered and one unanswered, so Posts and Answered Posts are testable.
- `forum.read` gates the list, state lookup, and row navigation. No write action
  is exposed by this Odoo action; creation remains on the public website flow.
- `fixture_state=empty`, `fixture_state=transport_error`, search, status, and
  content-scope paths are covered by the focused test.

## Acceptance/evidence

- [x] Source menu/action/view trace recorded before implementation.
- [x] Page/API separation and discovery join tested.
- [x] Deterministic populated/search/empty/error fixtures tested.
- [x] Authenticated permission boundary is declared; anonymous website route is
  explicitly outside this bounded slice.
- [ ] Odoo and Core3 authenticated desktop 1440×900 captures.
- [ ] Odoo and Core3 authenticated mobile 390×844 captures.
- [ ] Visual comparison sign-off after runtime/browser availability check.

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
