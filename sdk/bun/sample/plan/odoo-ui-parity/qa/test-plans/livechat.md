# Live Chat detailed QA test plan

Module: livechat  
QA owner: livechat-qa  
Developer owner: livechat module owner  
Reference addon/version: im_livechat, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`livechat.md`](../../livechat.md); executed evidence is
recorded in [`../livechat.md`](../livechat.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Conversations | sessions, all conversations, looking-for-help and history routes | Session detail, queue states, partner/member history and read-only scopes |
| Channels and configuration | channels, channel rules, tags, canned responses, expertise and chatbots | Channel CRUD/join-leave, routing rules, tags, response scripts, expertise and bot steps |
| Reporting | agents and sessions analysis routes | Date/search/group filters and read-only aggregates |
| Technical queues | ongoing, escalated, in-call, handled-by-agent and handled-by-bot routes | Manager-only operational filters, details, empty/error states and no-CRUD boundaries |

Actors are Live Chat Manager, Live Chat Operator, ordinary user, visitor,
wrong-company user and unauthenticated user. Fixtures use stable channels,
sessions, partners, members, tags, rules, expertise, scripts, reports and
technical queue rows. Mutations use isolated databases and deterministic IDs;
technical queues must never expose unrelated company conversations.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| LIVECHAT-FUNC-001 | Sessions/conversations | Search/filter/detail and partner/member history query persisted, correctly scoped conversations | pass: focused suite |
| LIVECHAT-FUNC-002 | Channels/rules | Channel and routing-rule CRUD, join/leave, validation, duplicate and stale guards persist | pass: focused suite |
| LIVECHAT-FUNC-003 | Chatbot/scripts | Chatbot, steps and answers support manager CRUD, ordering and relation validation | pass: focused suite |
| LIVECHAT-FUNC-004 | Tags/expertise | Tag and expertise CRUD, duplicate/in-use guards and scoped search work | pass: focused suite |
| LIVECHAT-FUNC-005 | Canned responses | Read/write permissions, substitutions, search, validation and stale guards work | pass: focused suite |
| LIVECHAT-FUNC-006 | Reporting/technical queues | Agent/session reports and operational queues expose deterministic read-only data and filters | pass: focused suite |
| LIVECHAT-FUNC-007 | Empty/error/not-found | Empty, no-results, missing, forbidden and transport-error states are explicit | pass: focused suite |
| LIVECHAT-FUNC-008 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate conversations or configuration | planned restart/migration gate |
| LIVECHAT-FUNC-009 | Attachments/import/export | Exercise visitor attachments, transcript export and exposed import/print actions | planned browser interaction gate |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| LIVECHAT-WF-001 | Visitor session | New → ongoing → closed session preserves visitor, channel, operator and transcript relations | pass: `livechat_sessions.integration.test.ts`; browser workflow remains planned |
| LIVECHAT-WF-002 | Channel routing | Rule/expertise selection assigns eligible operators and rejects invalid or unauthorized changes | pass at contract level |
| LIVECHAT-WF-003 | Chatbot handoff | Script steps/answers progress deterministically and hand off to an operator without losing transcript | pass at contract level |
| LIVECHAT-WF-004 | Help/escalation queues | Looking-for-help and technical escalation actions preserve queue state and manager scope | pass at contract level |
| LIVECHAT-WF-005 | Durable/external boundary | Realtime reconnect, bot calls, notifications, transcript delivery and third-party callbacks use Temporal when durable; retry, replay, restart and compensation are tested | planned |
| LIVECHAT-WF-006 | Conversation tag assignment | Operator Add Tag/Remove Tag persists the source-backed relation, preserves session versions, scopes assigned sessions, and rejects duplicate, stale, missing, and unassigned mutations | pass: `livechat_session_tags.integration.test.ts`; browser comparison remains planned |
| LIVECHAT-WF-007 | Visitor feedback and leave session | Public token-scoped feedback persists one rating per session; visitor leave closes the session, appends a timeline event, rejects replay, and survives restart | pass: `livechat_visitor_feedback.integration.test.ts`; Odoo widget blocked because addon is not installed |
| LIVECHAT-WF-008 | Public visitor message composer | Token-owned visitor message persists in the transcript, increments session counters/version, rejects blank/oversize/closed sends, and survives restart | pass: `livechat_public_message.integration.test.ts`; browser/reference blocked |
| LIVECHAT-WF-009 | Authenticated transcript email | Closed-session operator action validates email and scope, queues a durable transcript delivery, refreshes the detail projection, rejects stale/open/missing/invalid requests, and survives restart | pass: `livechat_transcript_delivery.integration.test.ts`; live browser tab blocked |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| LIVECHAT-PERM-001 | Live Chat Manager | Channel, rule, bot, tag, expertise and canned-response mutations succeed | planned browser actor gate |
| LIVECHAT-PERM-002 | Operator | Assigned conversation reads/actions and tag mutations work only within channel/company scope | pass at contract level; browser actor gate planned |
| LIVECHAT-PERM-003 | Visitor | Public session access exposes only its own transcript and allowed channel actions | planned |
| LIVECHAT-PERM-004 | Ordinary user | Technical queues and manager configuration writes return 403 without row changes | pass at contract level |
| LIVECHAT-PERM-005 | Wrong company | Sessions, partners, channels, transcripts and reports are not leaked or mutable | planned |
| LIVECHAT-PERM-006 | Unauthenticated/expired | Redirect/401/403 without protected response data | planned |
| LIVECHAT-PERM-007 | Stale/missing/invalid | 409/404/422 leaves the current session/channel/configuration unchanged | pass at contract level |
| LIVECHAT-PERM-008 | Visitor token | Wrong visitor token returns 404 without disclosing or mutating another conversation | pass: `livechat_visitor_feedback.integration.test.ts` |
| LIVECHAT-PERM-009 | Public message ownership | Wrong visitor token cannot post, and a closed visitor conversation cannot be reopened by message post | pass: `livechat_public_message.integration.test.ts` |
| LIVECHAT-PERM-010 | Transcript delivery actor/scope | Missing actor, another operator, and stale session version return bounded errors without a delivery row | pass: `livechat_transcript_delivery.integration.test.ts` |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| LIVECHAT-UI-001 | Conversation/session | 1440x900, 390x844 | Conversation form, transcript, sidebar, actions and responsive layout match Odoo | planned |
| LIVECHAT-UI-002 | Channel/configuration | both | Channel, rule, tag, expertise, canned-response and chatbot forms match Odoo | planned |
| LIVECHAT-UI-003 | Reports/technical queues | both | Graph/pivot/list, filters, operational detail and empty states match Odoo | planned |
| LIVECHAT-UI-004 | Current route regression | all manifest-owned Live Chat routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |
| LIVECHAT-UI-005 | Visitor composer | 1440x900, 390x844 | Existing visitor conversation displays the Odoo-shaped composer and refreshes the timeline; paired Odoo/Core3 capture required when runtimes are available | blocked: Odoo addon route is 404; Core3 runtime availability pending |
| LIVECHAT-UI-006 | Closed session transcript email | 1440x900, 390x844 | Closed session exposes Email transcript, validates the email form, and shows the durable last-recipient projection without overflow | blocked: authenticated Odoo tab already borrowed; no visual claim |

## Exit criteria

Full Live Chat sign-off requires the focused suite, authenticated conversation
and configuration workflows, visitor/operator/manager/company boundaries,
reload/restart persistence, complete responsive route coverage, and paired Odoo
desktop/mobile comparisons. Existing contract evidence is not module completion.
