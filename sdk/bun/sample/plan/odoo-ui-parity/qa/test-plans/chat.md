# Chat detailed QA test plan

Module: chat  
QA owner: chat-qa  
Developer owner: chat module owner  
Reference addon/version: mail and bus, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`chat.md`](../../chat.md); executed evidence is recorded in
[`../chat.md`](../chat.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Discuss workspace | `/chat/` | Inbox, Starred, History, channels, direct messages, search, threads, composer, unread/read and star state |
| Channels | `/chat/channels`, `/chat/channels/detail` | Active/archived channels, member-sensitive Join/Leave, create/edit and membership |
| Configuration | `/chat/notifications`, `/chat/voice-video`, `/chat/canned-responses`, `/chat/roles`, `/chat/roles/detail` | Notification settings, device preferences, canned responses, roles and member search |
| Technical → Discuss → Scheduled Messages | `/chat/scheduled-messages`, `/chat/scheduled-messages/detail` | List/form queue, search, edit scheduling, notification parameters, Force Send |

The authenticated topology is the Chat module process with Auth-owned users and
persisted Chat tables. Actors are Chat Manager, ordinary Chat user, non-member,
Fleet ordinary user, wrong-company user and unauthenticated user. Fixtures must
include unread, starred, direct, channel, thread, attachment, reaction,
archived, empty, no-results and offline states with stable IDs.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| CHAT-FUNC-001 | Discuss navigation | Inbox, Starred, History, channels, direct messages, search and empty states select deterministically | pass: focused suite |
| CHAT-FUNC-002 | Conversation read | Participant-scoped threads, messages, reactions and attachments query from persisted tables; non-members cannot read | pass: focused suite |
| CHAT-FUNC-003 | Message actions | Send message/note/reply, mark read/unread and star/unstar persist after reload and reject stale versions | pass at contract level; browser mutation planned |
| CHAT-FUNC-004 | Channels | Create/edit/archive, search, Join/Leave and member changes persist with duplicate and authorization guards | pass at contract level; browser CRUD planned |
| CHAT-FUNC-005 | Configuration | Notifications, Voice & Video, canned responses and roles validate values and persist after reload | pass: focused suite; browser mutation planned |
| CHAT-FUNC-006 | Empty/error/offline | Empty, no-results, forbidden, transport-error and offline states are explicit and do not expose protected data | pass at contract level |
| CHAT-FUNC-007 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate channels, roles, messages or settings | pass at contract level; restart gate planned |
| CHAT-FUNC-008 | Attachments/import/export | Exercise attachment picker, message file lifecycle and exposed import/export/print actions | planned browser interaction gate |
| CHAT-SCHEDULED-MESSAGES-001 | Scheduled Messages action | Technical list/form maps `mail_message.schedule`; seeded rows persist, search and empty state work, future-date edit and Force Send guards are enforced | pass: focused integration; authenticated browser blocked |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| CHAT-WF-001 | Message lifecycle | Compose → send → read/unread → star/unstar updates participant marker and message state atomically | pass: `chat_message_lifecycle.integration.test.ts`; browser mutation gate remains planned |
| CHAT-WF-002 | Thread/reply/reaction | Reply, mention, reaction and thread navigation remain linked to the owning conversation | pass at contract level |
| CHAT-WF-003 | Channel membership | Join/Leave and invite/member changes enforce membership and manager rules without partial updates | pass at contract level; actor browser gate planned |
| CHAT-WF-004 | Notifications/activity | Read markers, notification preferences and scheduled activities remain user/channel scoped | pass at contract level |
| CHAT-WF-005 | Durable/external boundary | Realtime reconnect, mail delivery, callbacks and cross-module workflows use Temporal when durable; retry, replay, restart and compensation are tested | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| CHAT-PERM-001 | Chat Manager | Configuration and permitted channel/member mutations succeed | planned browser actor gate |
| CHAT-PERM-002 | Chat user/member | Reads and message actions are limited to owned conversations and allowed channels | participant guard pass; broader browser matrix planned |
| CHAT-PERM-003 | Non-member | Thread/message/attachment reads and mutations return 403 with no data leakage | pass at contract level |
| CHAT-PERM-004 | Fleet ordinary user | Protected Chat configuration/direct actions return 403 and do not change rows | planned |
| CHAT-PERM-005 | Wrong company | Cross-company channels, members, messages and attachments are not visible or mutable | planned |
| CHAT-PERM-006 | Unauthenticated/expired | Redirect/401/403 without protected response data | planned |
| CHAT-PERM-007 | Stale/missing input | 409/404/422 leaves current conversation/channel/settings unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| CHAT-UI-001 | Inbox/channel/direct | 1440x900, 390x844 | Sidebar ordering, badges, timeline, composer, attachments and responsive drawer match Odoo | partial; captures exist for prior inbox slice |
| CHAT-UI-002 | Thread/search/empty/offline | both | Thread panel, search/no-results and offline/empty states have correct geometry and labels | planned paired capture |
| CHAT-UI-003 | Configuration dialogs/forms | both | Notifications, Voice & Video, Canned Responses and Roles match Odoo controls and overflow behavior | partial; static contracts only for latest batches |
| CHAT-UI-004 | Current route regression | all manifest-owned Chat routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or horizontal overflow | planned fresh authenticated matrix |
| CHAT-UI-005 | Scheduled Messages list/form | 1440x900, 390x844 | Technical menu, List/Form tabs, scheduled date fields, Force Send placement and mobile overflow match Odoo | blocked: authenticated tab already borrowed |

## Exit criteria

Full Chat sign-off requires the focused suite, authenticated browser CRUD and
message/channel workflows, all actor boundaries, reload/restart persistence,
and paired Odoo desktop/mobile comparisons for each listed state. Existing
focused tests and earlier inbox captures are progress evidence only; the
latest configuration batches remain unsigned until browser evidence is
available.
