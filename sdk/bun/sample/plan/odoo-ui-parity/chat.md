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

## Bounded batch — Canned Responses action parity

- Added the installed Odoo `mail.mail_canned_response_action` surface at
  `/chat/canned-responses`, with separate page/API YAML fragments joined by
  `page.id`, a matching detail form contract, and a manifest-owned Discuss →
  Configuration → Canned Responses menu.
- Added service-owned `chat_canned_responses` storage with fixed IDs,
  substitutions, authorized-group labels, fixed timestamps, and idempotent
  migration `20260910190000-007-chat-canned-responses.yaml`. The list contract
  covers search, Shared/Private filters, list/kanban/form modes, CRUD, and
  optimistic-concurrency/de-duplication/shortcut-format guards.
- Coverage includes `chat.read` for page/data access and `chat.write` for
  create/update/delete, plus deterministic empty/not-found query states and
  transport-error contracts. Core3 desktop/mobile and authenticated Odoo
  desktop/mobile comparison captures are kept under `/tmp` and are not Git
  artifacts:
  - Odoo: `/tmp/odoo-canned-responses-desktop.png`,
    `/tmp/odoo-canned-responses-mobile.png`
  - Core3: `/tmp/core3-chat-canned-responses-desktop.png`,
    `/tmp/core3-chat-canned-responses-mobile.png`
- Authenticated browser verification recorded zero failed responses and zero
  console errors. Core3 measured `1440/1440` and `390/390` body/document widths;
  Odoo mobile measured `390/390`. The Core3 desktop list and mobile kanban
  captures were reviewed against the Odoo action surface; no clipped content
  or horizontal page overflow was observed.

## Bounded batch — Discuss Channels action parity (20260912)

- Source-backed action: `mail.discuss_channel_action` in Odoo `mail/views/discuss_channel_views.xml`, exposed at Discuss → Channels. It uses `discuss.channel`, `kanban,form` modes, the `channel_type = channel` domain, `Search Groups`/Archived search, and member-sensitive Join/Leave buttons. Technical → Email Channels/Members is restricted to `base.group_no_one` and remains out of this user-facing batch.
- Core3 routes are `/chat/channels` and `/chat/channels/detail`, with page-only YAML joined to backend API YAML by `page.id`. Fixtures use `chat_channels`, `chat_channel_members`, and existing Auth-owned `chat_users`; migration `20260912100000-008-chat-channels.yaml` is deterministic and idempotent.
- Acceptance coverage includes active/archived/member and empty/search states, forbidden/transport contracts, duplicate-name validation, not-found and optimistic-concurrency guards, and create/update/join/leave action declarations. Authenticated desktop/mobile evidence and exact runtime limitations are recorded after verification.
- Runtime limitation: this worktree session did not expose `js_repl`, and `playwright` is not installed in the sample workspace, so authenticated Core3/Odoo browser rendering and the required 1440x900/390x844 captures could not be produced. No visual-parity claim is made for this batch; static YAML/schema, migration/query, audit, and build checks are the available evidence.

## Bounded batch — Discuss Notifications action parity (20260912)

- Source-backed action: Odoo `mail.discuss_notification_settings_action` from
  `mail/data/ir_actions_client.xml`, exposed at Discuss → Configuration →
  Notifications. The client action is a medium dialog without a footer and
  presents Channel Notifications (`All Messages`, `Mentions Only`, `Nothing`)
  plus the Message sound switch. Core3 exposes the same user-visible contract
  at `/chat/notifications` using the shared `SettingsView`.
- Core3 keeps page layout in `pages/notifications.yaml` and the datasource,
  mutation, permissions, and error contracts in `api/notifications.yaml`, joined
  by `page.id`. Migration
  `20260912110000-009-chat-notifications.yaml` adds one deterministic,
  idempotent `chat_notification_settings` row initialized to `Mentions Only`
  and sound enabled. Saving requires `chat.write`; reading requires `chat.read`.
- Acceptance coverage includes the exact configuration menu/page/API join,
  supported notification choices, deterministic empty and transport states,
  and valid save plus invalid-value, missing-record, and optimistic-concurrency
  guards. Focused Chat coverage passes 9/9 tests and 61 assertions (Channels,
  Canned Responses, and Notifications); UI audit passes with 593 pages, 600
  routes, and 1021 datasources; frontend production build and `git diff --check`
  pass.
- Browser evidence was attempted but blocked in this worktree session: `js_repl`
  is unavailable and `sdk/bun/sample/node_modules/playwright` is absent, so
  authenticated Core3/Odoo rendering and 1440x900/390x844 captures could not be
  produced. No visual-parity claim is made for this batch; no image files were
  added.

## Bounded batch — Discuss Voice & Video settings action parity (20260912)

- Source evidence: Odoo `mail.discuss_call_settings_action` in
  `addons/mail/data/ir_actions_client.xml` is a client action named “Voice &
  Video Settings”, opened as a medium dialog with no footer. The user-facing
  menu is `mail.menu_call_settings`, ordered fifth under Configuration. Its
  `call_settings.xml` view presents Voice (Microphone, Audio Output, Voice
  Detection/Push to Talk, sensitivity and release delay), Video (Camera,
  video-only and blur toggles/intensities), and debug-only RTC logging. Device
  selectors are represented by deterministic Core3 choices; the no-footer
  dialog behavior is represented by the existing settings shell.
- Core3 adds `/chat/voice-video`, a presentation-only page and API fragment
  joined by `page.id`, and the manifest Configuration menu entry ordered after
  Notifications. Migration `20260912120000-010-chat-call-settings.yaml` seeds
  fixed device names and settings. Reads require `chat.read`; saving requires
  `chat.write`, with empty/transport, not-found, stale-version, and bounded
  value validation contracts.
- Focused Chat coverage passes 15/15 tests with 88 assertions, including the
  new 3-test Voice & Video suite and all prior Chat slices. `bun run audit`
  passes with 628 pages, 644 routes, and 1075 datasources; ESLint,
  `frontend:build`, and `git diff --check` pass.
- Authenticated capture attempt: Odoo login pages responded HTTP 200 on
  `127.0.0.1:8069` and `:8073`, but Core3 could not start because Vite hit
  `EMFILE: too many open files` while watching `vite.config.ts`. The required
  Playwright `js_repl` tool is also unavailable in this session. No Odoo or
  Core3 desktop/mobile captures were produced under `/tmp/core3-odoo-parity`,
  and no visual-parity claim is made for this batch.

## Bounded batch — Discuss inbox state actions (20260912)

- Source trace: Odoo `mail/views/mail_menus.xml` places Discuss first, Channels
  second, and Configuration third; the Discuss client surface exposes Inbox,
  Starred, and History categories. Odoo's `mail/static/tests/discuss_app/inbox.test.js`
  verifies unread inbox notifications and `sidebar.test.js` verifies category
  selection and collapsed/expanded channel behavior. This batch covers the
  next visible state transition on the existing Core3 Discuss surface rather
  than duplicating Odoo frontend code.
- Core3 `ChatWorkspace` now exposes active-thread Star/Unstar and
  Mark-as-read/Mark-as-unread controls in the conversation header. The
  presentation page remains `pages/chat.yaml`; action contracts remain in
  `api/chat.yaml` and are joined through the existing `page.id` discovery.
  `chat.write` protects all state mutations while `chat.read` continues to
  protect datasource access. Star state uses the existing deterministic
  `chat_threads.starred` field; read state uses the participant read marker.
- Empty, search-no-results, offline, unread, and starred fixtures remain
  deterministic in the API YAML. The action boundary includes bounded
  mutation IDs and stable unread/star transitions; message sending and
  attachment behavior are unchanged.
- Focused verification passed: Chat integration `4/4`, ChatWorkspace `12/12`,
  UI audit `631 pages, 647 routes, 1079 datasources`, frontend build, ESLint,
  and `git diff --check`.
- Authenticated screenshots were attempted but blocked. Core3 startup failed
  with the exact Vite error `EMFILE: too many open files, watch .../vite.config.ts`;
  Odoo `/web/login` returned HTTP 200 on `127.0.0.1:8069` and `:8073`, but the
  session has no `js_repl` browser tool and no authenticated browser context.
  No 1440x900 or 390x844 screenshots were produced for this batch and no
  visual-parity claim is made.

## Bounded batch — Discuss Roles action parity (20260912)

- Source-backed next action: Odoo `mail.res_role_action` from
  `addons/mail/views/res_role_views.xml`, exposed at Discuss → Configuration →
  Roles after Canned Responses. It targets `res.role` with `list,form` modes;
  the list is inline-editable and shows Role plus Users, while search exposes
  Role, Users, My Roles, and Users grouping. The action help text explains
  @-mentioning roles; unlike Technical → Call History, Roles is user-facing.
- Core3 adds `/chat/roles` and `/chat/roles/detail`, page-only YAML fragments
  joined to `api/roles.yaml` and `api/role-detail.yaml` by `page.id`. The
  service-owned `chat_roles` fixture has fixed IDs and member names; migration
  `20260912130000-011-chat-roles.yaml` is deterministic and idempotent.
  Search, My Roles, empty/not-found and transport contracts are explicit;
  create/update/delete use `chat.write`, with duplicate-name, missing-record,
  and optimistic-concurrency guards.
- Focused verification: Chat integration tests pass `19/19` with `126`
  assertions across all six Chat suites; UI audit passes with `643` pages,
  `659` routes, and `1103` datasources; changed TypeScript passes ESLint and
  `git diff --check` passes.
- Authenticated browser capture was attempted under `/tmp/core3-odoo-parity`.
  Odoo login endpoints returned HTTP 200 on ports 8069 and 8073, but this
  session has no `js_repl` browser capability or installed Playwright package,
  so no authenticated Core3/Odoo rendering or 1440x900/390x844 screenshots
  could be produced. A Core3 launch reached Vite on port 3002, then the
  bounded attempt was terminated after 20 seconds; no authenticated browser
  context existed. No visual-parity claim is made and no image artifacts were
  added.
