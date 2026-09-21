# FORUM-TAG-001 — Forum Tags verification

Date: 2026-09-22
Source: Odoo 19 `/home/nhanjs/projects/odoo/addons/website_forum`
Bounded feature: authenticated Forum Tags list/form (`forum_tag_action`)

## Source trace

- `views/forum_menus.xml`: `menu_forum_tag_global`, label `Tags`, sequence 30,
  action `forum_tag_action`.
- `views/forum_tag_views.xml`: `forum_tag_action` path `/forum-tags`,
  `view_mode=list,form`; list fields `name`, `color`, `forum_id`; form fields
  `name`, `color`, `forum_id`.
- `models/forum_tag.py`: required `name` and `forum_id`; unique `(name,
  forum_id)` constraint; computed post count.

## Core3 implementation and assertions

- `services/forum/pages/tags.yaml` is presentation-only.
- `services/forum/api/tags.yaml` is joined by `page.id: forum-tags` and owns
  read lookup/list plus `forum.write` create/edit actions.
- Migration `20260922100000-007-forum-tag-constraint.yaml` adds durable
  `(forum_id, name)` uniqueness.
- Create derives `forum_name` from the selected active forum. Edit requires
  `expected_row_version`; duplicate, blank, missing/inactive forum, and stale
  writes reject without partial persistence. Renaming refreshes the exact
  comma-delimited post tag token atomically.

Commands and results:

- `bun test ./test/forum_tags.integration.test.ts` — 4 passed, 22 assertions.
- `bun test ./test/forum*.integration.test.ts` — 21 passed, 155 assertions.
- `git diff --check` — passed.

## Authenticated reference evidence

BrowserSkill session used instance `245ea108` with the shared authenticated QA
session. Passwords, cookies, and tokens were not printed or extracted.

- Odoo desktop 1916×833 launcher capture:
  `/tmp/core3-odoo-parity/forum/2026-09-22/FORUM-TAG-001/odoo-desktop-launcher.png`
- Odoo mobile 390×844 launcher capture:
  `/tmp/core3-odoo-parity/forum/2026-09-22/FORUM-TAG-001/odoo-mobile-launcher.png`
- Both authenticated launcher observations list Discuss, Calendar, Contacts,
  CRM, Sales, and other installed apps, but no Website or Forum. Direct
  `/forum` and guessed Forum action routes are therefore unavailable: the
  `core3_reference` database does not have `website_forum` installed. Paired
  Odoo Tags list/form screenshots are blocked by this exact environment state.

## Core3 browser blocker

`bun run dev --db=ddb --memory` exited during page discovery before binding
port 3001 with:

`SyntaxError: YAML Parse error: Unexpected token`

The isolated parser identifies the pre-existing source as
`services/blog/pages/blog-workflow.yaml`. The Blog path is outside the Forum
scope and was not changed. Consequently authenticated Core3 desktop/mobile
Tags screenshots cannot be captured in this wave; no visual parity claim is
made. The repository UI audit has the same blocker.

## Disposition

Functional/data/permission/restart coverage passes for the bounded tag slice.
Odoo/Core3 visual comparison and full Forum sign-off remain blocked by the two
environment/runtime conditions above.
