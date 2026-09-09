# Chat — sub-plan

Status: `planning`

## Reference

- Odoo addon: `mail` (Odoo 19 Community; include `bus` behavior visible in the UI)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: mail/demo records available; include unread, empty, and offline fixture modes
- Core3 service: `chat`

## UI inventory

- Discuss/Chat app, inbox, starred, history, channels, direct messages, and configuration menus.
- Conversation sidebar with search, unread/starred filters, channel list, direct-message list, favorites, and create channel/invite dialogs.
- Conversation view with header, participants, message timeline, notes, mentions, reactions, attachments, composer, scheduled activities, read/unread, pin/star, and message actions.
- Channel form/settings, member management, notification preferences, mobile sidebar/drawer, responsive composer, empty and no-results states.

## Core3 backend mock-data plan

Use `chat_channels`, `chat_members`, `chat_conversations`, `chat_messages`, `chat_reactions`, `chat_attachments`, `chat_activities`, `chat_notifications`, and `chat_search`. `default` includes channels/direct conversations, unread counts, threaded messages, reactions, attachments, and members. States: `inbox`, `unread`, `starred`, `channel`, `direct`, `empty`, `search_no_results`, `thread`, `mobile`, `offline`.

## Shared UI primitives

Chat sidebar, message timeline/thread, composer, mention/autocomplete, attachment picker, reactions, notification badges, member dialog, activity/chatter, search, and mobile drawer.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for inbox, channel, direct message, thread, channel settings, search/no-results, and empty/offline states.

## Acceptance criteria

- Discuss menus, sidebar ordering, unread/starred behavior, message rendering, composer, attachments, reactions, member/settings dialogs, and mobile layout match Odoo.
- Every message, thread, member, badge, attachment, reaction, activity, and empty/search state comes from backend YAML mock data.
- Send/note/reply, star/read actions, search, channel navigation, and offline rendering are deterministic and datasource IDs remain query-replaceable.
