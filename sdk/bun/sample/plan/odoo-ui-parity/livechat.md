# Live Chat — sub-plan

Status: `planning`

## Reference

- Odoo addon: `im_livechat` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; include online/offline and empty visitor modes
- Core3 service: `livechat`

## UI inventory

- Live Chat dashboard, Conversations, Visitors, Operators, Channels, and Reporting/configuration menus.
- Conversation list with waiting/ongoing/closed states, visitor, channel, operator, tags, search/filter/group, assignment, close, and pager.
- Conversation form/panel with visitor metadata, transcript, canned responses, attachments, rating, operator assignment, notes, activities, and close/reopen actions.
- Channel/operator configuration forms with availability, welcome message, auto-popup, widget options, and routing rules.
- Visitor list/form, sessions, satisfaction/report graph/pivot, online/offline/queue/empty states, mobile operator panel and visitor widget.

## Core3 backend mock-data plan

Declare `livechat_channels`, `livechat_operators`, `livechat_conversations`, `livechat_visitors`, `livechat_messages`, `livechat_canned_responses`, `livechat_sessions`, `livechat_ratings`, `livechat_activities`, and `livechat_analysis`. `default` contains queued/ongoing/closed conversations, visitor profiles, transcripts, operators, canned replies, sessions, and ratings. States: `waiting`, `ongoing`, `closed`, `offline`, `empty`, `visitor_widget`, `operator_form`, `analysis_graph`, `analysis_pivot`, `mobile`.

## Shared UI primitives

Conversation panel, queue/status badges, visitor profile, transcript/composer, canned response picker, operator assignment, channel/operator forms, graph/pivot, rating widget, search/filter/pager, and responsive operator/visitor shells.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for dashboard, queue/conversation panel, visitor, channel/operator forms, visitor widget, reports, and offline/empty states.

## Acceptance criteria

- Live Chat menus, queue behavior, transcript/composer, visitor/operator/channel settings, ratings, reports, and responsive shells match Odoo.
- Backend YAML covers every visible conversation, visitor, message, operator, canned response, session, rating, metric, activity, and empty/offline state.
- Assign/close/reopen, canned reply, search/filter/group, form save/discard, and visitor/operator rendering work without a live backend; providers remain replaceable by queries.
