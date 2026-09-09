# Forum — UI-only sub-plan

Status: `planning`

## Reference and source availability

- Odoo addon: `website_forum`; supplied Odoo 19 source: available; verify demo-data flag.
- Core3 service: `forum` (`sdk/bun/sample/services/forum`), YAML-driven composition for moderation/public views.

## Menu, action, route, and view inventory

- Forum (`/forum`) / Community → Forums: channel list/detail, description, website/privacy/moderation/question settings, CRUD/archive, empty.
- Community → Questions (`/forum-questions`): list/card, search/filter/tag/forum/status/author, sort/pager, open/closed/flagged, bulk moderation.
- Question detail: title/body, tags/author, votes, accepted answer, answers/comments, follow, flag/edit/close, moderation dialogs, related questions, mobile.
- Community → Tags (`/forum-tags`): tag list/form, usage count, CRUD/archive, empty.
- Reporting → Forum Analysis (`/forum-analysis`): question/answer/vote/user KPI, chart/table, date filters/no-data.
- Public/mobile index, ask form, question search/filter, answer form, pagination, anonymous/login/permission states, nav overflow.

## YAML composition and backend mock-data plan

Page YAML defines layout and datasource IDs only. Backend datasource YAML owns `mock_data` for forums, questions/detail, answers, comments, tags, authors/users, votes/reputation, moderation flags/actions, related questions, and analysis rows. Include open/closed/flagged/accepted states, multiple answers/votes, moderation queue, filters/search/pager/empty/no-data, anonymous/login-required/denied states, exact chart values, and deterministic vote/follow/flag/close/accept results.

## Shared UI primitives

Reuse public composition, list/card/form, rich text, tag selector, vote/reputation, answer/comment threads, accepted/status badge, moderation dialog, search/filter/pager, KPI/chart/date filter, auth/permission, toast, responsive nav. Record nested-thread/voting gaps before implementation.

## Screenshots

Capture Odoo 19/Core3 at `1440x900` and `390x844`: index/detail, question list/detail, ask/answer forms, tags, moderation, analysis populated/no-data, search/filter, anonymous/login, flagged/closed/accepted. Record route/state/viewport/path.

## Acceptance

- Community menus, list/detail/thread, ask/answer, moderation, tags, analysis, auth boundaries, and mobile behavior match.
- Every visible question/answer/comment/vote/reputation/moderation/metric has backend `mock_data`; page YAML has no records and works offline.
- Search/filter/sort/pager, voting, follow, flag/close/accept, validation, empty/no-data, permission states are deterministic; visual review and `git diff --check` are clean.
