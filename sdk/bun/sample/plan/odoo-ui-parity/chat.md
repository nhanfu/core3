# Chat — sub-plan

Status: `ready`

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

## Current batch evidence

- Core3 authenticated route: `/chat/`.
- Core3 captures: `/tmp/core3-odoo-parity/chat-20260909-desktop.png` and `chat-20260909-mobile.png`.
- Odoo captures: `/tmp/odoo-chat-inbox-1440x900.png` and `/tmp/odoo-chat-inbox-390x844.png`.
- Verified: deterministic inbox/thread rendering, unread/starred fixture fields, attachment display, and desktop/mobile rendering. The Core3 shell remains intentionally separate from Odoo's native shell for this fixture-focused batch.

## Bounded batch — Discuss sidebar parity

- Added a page-only `chat` layout and page-scoped API fragment joined by `page.id`, with explicit sidebar, thread, message, and attachment datasource contracts.
- Added deterministic Inbox, Starred, History, Channels, Direct Messages, search-no-results, empty, and offline fixtures plus the `chat.read`/`chat.write` permission boundary and migration `20260910180000-006-chat-sidebar-flags.yaml`.
- Added authenticated browser verification against the isolated Core3 runtime at 1440x900 and 390x844: Discuss navigation, seeded Event Store Demo and Operations team conversations, Starred/Channels filters, and search empty state rendered successfully. Captures are `/tmp/core3-odoo-parity/chat-next-inbox-1440x900.png` and `/tmp/core3-odoo-parity/chat-next-inbox-390x844.png`; images remain outside Git.
- Focused verification: client ChatWorkspace tests `11/11` passed; Chat API/page integration tests `3/3` passed; UI audit passed with `316` pages, `320` routes, and `571` datasources; changed-file ESLint and `git diff --check` passed.
