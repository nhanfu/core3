# Chat workspace controls

## Local interaction checklist

- [x] The route is a strict YAML page backed by the reusable `ChatWorkspace`
  component; the obsolete page-local message array has been removed.
- [x] Authenticated identity is injected by the server and overrides any
  client-supplied `current_user_id`.
- [x] Thread and message queries return only conversations where the current
  user is a participant.
- [x] Search filters thread title, participant names, and message preview.
- [x] Selecting an unread thread persists `last_read_at` and clears its badge.
- [x] Enter sends trimmed composer content through the named
  `chat.messages.send` action and refreshes thread preview and timeline.
- [x] Sent messages and newly created conversations survive a full reload.
- [x] The normal toolbar modal creates a direct or group thread from validated
  participant emails.
- [x] Non-participant sends, empty messages, unknown participant emails, and
  direct raw-table patches are rejected.
- [x] Thread creation and message sending atomically persist actor, action,
  resource ID, and detail in `system_activity`.
- [x] The composer accepts files up to 5 MB, persists message-linked metadata,
  renders attachment chips, and downloads bytes through an authenticated,
  membership-scoped endpoint.
- [x] 1440 x 1000 and 1024 x 768 have no document overflow.
- [x] Login, navigation, read state, send, create, refresh, and reload produce
  no console errors or failed responses.

## Local evidence

- `local-desktop.png`: membership-scoped threads, unread badge, active finance
  conversation, persisted attachment chips, and composer at 1440 x 1000.
- `local-tablet.png`: the same state at 1024 x 768 with wrapped bubbles and the
  full thread list/composer visible.
