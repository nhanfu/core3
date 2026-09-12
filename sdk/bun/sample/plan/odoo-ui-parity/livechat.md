# Live Chat — Odoo UI parity gate sub-plan

Status: `planned` (incremental parity slices in progress)

The personal authenticated reference database at `http://localhost:8069` now
has `im_livechat` installed with demo data. The slices below are independently
gated; the overall plan remains planned until the complete authenticated and
public-widget inventory is covered.

## Reference and evidence

- Odoo checkout: `/home/nhanjs/projects/odoo`, revision
  `659759969d535d286b656c96b675e4612b925ddd`.
- Addon: `addons/im_livechat`; manifest name `Live Chat`, version `1.0`,
  `installable=True`, `application=True`, category `Website/Live Chat`.
- Dependencies: `mail`, `rating`, `digest`, `utm`.
- Official demo data is present: one channel, chatbot, chatbot sessions, and
  live chat sessions in `demo/im_livechat_channel/*.xml` (30 files in the
  manifest list). Preserve demo-off and demo-on fixture modes.
- Authenticated reference evidence from the earlier pre-install baseline:
  `/tmp/odoo-livechat-auth-1440x900.png`,
  `/tmp/odoo-livechat-discuss-1440x900.png`,
  `/tmp/odoo-livechat-channels-1440x900.png`,
  `/tmp/odoo-livechat-configuration-1440x900.png`,
  `/tmp/odoo-livechat-auth-390x844.png`, and
  `/tmp/odoo-livechat-menu-390x844.png`.
- The desktop session authenticated to `/odoo/discuss`; the visible Channels
  link resolved to `/odoo/action-123` and showed nine Discuss channels, not
  `im_livechat.channel` records. The mobile session showed the Discuss feed,
  mobile drawer, and Notifications/Chats/Channels/Starred tabs only.

## Gate status

| Gate | Evidence and result |
| --- | --- |
| 1. Addon/version/demo | Pass from pinned manifest and demo XML; see `__manifest__.py` and `demo/im_livechat_channel/`. |
| 2. Menus/actions/views | Pass from source inventory below and the installed personal database; each bounded slice records its action id and visible labels. |
| 3. Routes and 1440x900/390x844 reference UI | Pass incrementally for installed slices; the complete inventory remains open. |
| 4. Core3 datasource fixtures | Planned below; current service has only partial channel/session/report tables and no truthful Odoo-shaped fixtures for most surfaces. |
| 5. Shared primitives | Planned below; primitives must be approved before implementation. |
| 6. Visual/fixture/security acceptance | Planned below; cannot pass until the addon is installed and both reference viewports are captured. |

## Complete Odoo UI inventory

### Application menus

Source file: `views/im_livechat_channel_views.xml` unless noted.

- `menu_livechat_root`: Live Chat, sequence 240, restricted to
  `im_livechat_group_user`.
- `support_channels`: Channels → `im_livechat_channel_action`.
- `menu_livechat_sessions`: Sessions.
  - `menu_livechat_all_conversations`: All Conversations →
    `discuss_channel_action`.
  - `menu_livechat_looking_for_help`: Looking for Help →
    `discuss_channel_looking_for_help_action`.
- `menu_reporting_livechat`: Reporting, manager-only.
  - `menu_reporting_livechat_agent`: Agents →
    `im_livechat_agent_history_action`.
  - `menu_reporting_livechat_channel`: Sessions →
    `im_livechat_report_channel_action`.
- `livechat_config`: Configuration.
  - Canned Responses → `mail.mail_canned_response_action`.
  - Chatbots → `chatbot_script_action`, manager-only.
  - Tags → `livechat_conversation_tag_action`.
  - Expertise → `im_livechat.expertise_action`.
- `livechat_technical`: Technical, `base.group_no_one` only.
  - Member History → `im_livechat_channel_member_history_action`.

The separate `im_livechat` frontend also supplies the website widget and
support page; it is not an authenticated backend menu and must not be silently
represented as one.

### Backend actions, routes, and view modes

| Action/surface | Model or route | View mode / required state |
| --- | --- | --- |
| `im_livechat_channel_action` | `im_livechat.channel`, path `livechat` | `kanban,form`; channel cards, join/leave, create, open sessions |
| `discuss_channel_action` | `discuss.channel`, livechat domain | `kanban,list,pivot,graph,form`; all conversation history, search/date filters, empty history |
| `discuss_channel_action_from_livechat_channel` | `discuss.channel`, active channel domain | same `kanban,list,pivot,graph,form`; channel-scoped history |
| `discuss_channel_looking_for_help_action` | `discuss.channel`, `livechat_status=need_help` | `list,kanban,form`; no-conversation help state and join/request-help actions |
| `im_livechat_report_channel_action` | `im_livechat.report.channel` | `graph,pivot`; last-month defaults, count/time/duration/rating/calls measures |
| `im_livechat_report_channel_time_to_answer_action` | `im_livechat.report.channel` | `graph,pivot`; last-week default, time-to-answer measure |
| `im_livechat_agent_history_action` | `im_livechat.channel.member.history` | `pivot,graph`; agent grouping, response/session/rating/call measures |
| `im_livechat_channel_member_history_action` | `im_livechat.channel.member.history` | `list,form`; create disabled, technical member history |
| `chatbot_script_action` | `chatbot.script` | `list,form`; script list and multi-step editor |
| `livechat_conversation_tag_action` | `im_livechat.conversation.tag` | `list,form`; inline editable name/color |
| `im_livechat.expertise_action` | `im_livechat.expertise` | `list,form`; inline expertise and assigned operators |
| `action_report_livechat_conversation` | `discuss.channel` | QWeb PDF conversation transcript, available from conversation actions |
| `/im_livechat/support/<channel_id>` | public support page | full-page embedded chat; loading, active, closed, feedback, chatbot |
| `/im_livechat/loader/<channel_id>` | public loader | external widget bootstrap; visitor/operator username |
| `/im_livechat/get_session` | public JSON-RPC POST | create/resume persisted session, operator/chatbot routing |
| `/im_livechat/feedback` | public JSON-RPC | rating and reason submission |
| `/im_livechat/history` | public JSON-RPC | paginated prior visitor history |
| `/im_livechat/email_livechat_transcript` | authenticated JSON-RPC | email transcript dialog/action |
| `/im_livechat/download_transcript/<channel_id>` | public HTTP | PDF transcript download |
| `/im_livechat/visitor_leave_session` | public JSON-RPC | visitor leave/close state |
| `/chatbot/restart`, `/chatbot/answer/save`, `/chatbot/step/trigger`, `/chatbot/step/validate_email` | public JSON-RPC | chatbot restart, answer persistence, step transitions and email validation |
| `/im_livechat/external_lib.<css\|js>`, `/im_livechat/assets_embed.<css\|js>`, `/im_livechat/font-awesome`, `/im_livechat/odoo_ui_icons`, `/im_livechat/emoji_bundle` | public assets | widget asset loading and CORS behavior |

### View and state inventory

- Channel: `im_livechat.channel.kanban`; `im_livechat.channel.form`; channel
  search; card Configure/View, Join/Leave, operator avatars, satisfaction,
  chatbot/session stats. Form tabs are Agents, Options, Rules, and Widget.
  Rules have list, kanban, and form views with URL/country/action/chatbot
  conditions. Manager-only Options/Rules/Widget and user read-only states must
  be preserved.
- Sessions/conversations: `discuss.channel` search/list/kanban/form/pivot/graph;
  livechat-only domain; normal, looking-for-help, no-data, filters/grouping,
  date range, and channel-scoped states. Include conversation header,
  participants, message timeline, rating, tags, transcript, attachments,
  chatter/composer, join/leave/help, and mobile drawer behavior inherited from
  `mail`/Discuss and patched by `im_livechat`.
- Reports: channel report list/form/search plus graph/pivot; agent history
  search plus graph/pivot. Include sample/empty report help and all measures,
  date filters, grouping, drill-down, and responsive chart/pivot behavior.
- Chatbot: script list/search/form; step list/form; answer editable list/form;
  step types, triggering answers, operator expertise, optional links, and
  question-selection answer rows. Include new, edited, validation-error, and
  empty states.
- Configuration: canned-response list/form is delegated to `mail`; tags list
  and form; expertise list/form. Include inline create/edit, color picker,
  many2many operator assignment, no-create restrictions, empty/error states.
- Technical: member-history list/search/form (create disabled); agent graph and
  pivot. Include technical permission boundary and no-data state.
- User/partner integration: Livechat Name and access-dependent controls in
  `res.users` preferences/form and the partner livechat button. These are
  extension views and must be tested from the user/partner records, not omitted
  because they are outside the root menu.

## Existing Core3 boundary and deterministic fixture plan

Existing files are `services/livechat/manifest.yaml`, `permissions.yaml`,
`storage.yaml`, `pages/channels.yaml`, `pages/sessions.yaml`,
`pages/session-detail.yaml`, `pages/analysis.yaml`,
`pages/livechat-workflow.yaml`, and the two livechat migrations. Existing
coverage is a `/livechat` channel list, `/livechat-sessions` session list/detail,
four status transitions, and a totals/rating chart. It is not yet Odoo parity:
it lacks the Odoo channel kanban/form/options/rules/widget, conversation
history/composer, chatbot, tags/expertise, reports/pivots, transcript, public
widget, and user/partner integration.

Keep page layout YAML separate from backend datasource YAML. Add deterministic,
query-replaceable datasource definitions in service API fragments or the
service's established datasource location for at least:

- `livechat_channels`: ids, names, website, active, operators/avatars/languages,
  chatbot count, session count, rating count/percentage, join state, colors,
  notification/default messages, capacity policy, widget script/page, and
  manager-only options.
- `livechat_channel_rules`: ordered actions, URL regex, countries, popup timer,
  chatbot condition, and empty/validation variants.
- `livechat_conversations`, `livechat_members`, `livechat_messages`,
  `livechat_attachments`, `livechat_ratings`, `livechat_tags`, `livechat_calls`,
  `livechat_transcripts`: visitor/operator/chatbot participants, statuses
  (open/waiting/need-help/closed), messages, notes, reaction/attachment data,
  ratings/reasons, dates, duration/response time, and transcript output.
- `livechat_chatbots`, `livechat_bot_steps`, `livechat_bot_answers`,
  `livechat_expertise`, `livechat_expertise_operators`, and
  `livechat_canned_responses`: all editor fields, ordering, branching,
  forward-to-operator and email-validation paths.
- `livechat_member_history` and report-specific aggregate datasources for
  channel and agent graph/pivot measures, with deterministic date buckets and
  drill-down ids.
- `livechat_user_settings` / `livechat_partner_capabilities`: Livechat Name,
  access visibility, language/expertise, operator capacity, and hidden/readonly
  fields.
- `livechat_widget_sessions` and `livechat_widget_transport`: public loader,
  persisted/resumed session, operator assignment, chatbot transitions,
  feedback, transcript email/download, visitor leave, asset failure, offline,
  and CORS-safe error modes.

Fixture profiles must include `default`, `empty`, `no_results`, `need_help`,
`closed_rated`, `chatbot_branching`, `manager`, `user_read_only`, `technical`,
`widget_offline`, `permission_denied`, and `api_error`. Demo data must be
idempotent and relative-date based; no screenshot text or static rows may be
embedded in page YAML. API responses must retain stable ids, permissions,
status transitions, optimistic-conflict/error responses, and pagination/filter/
group/sort parameters.

## Shared primitives to approve first

Reuse existing Core3 primitives where possible and record any contract changes
before implementation: Odoo app/menu shell; kanban/list/form/search/action
toolbar; stat buttons; tabs/notebook; many2many tags and avatar users; color
picker; statusbar/status chip; date-range/group/filter controls; graph/pivot
renderer; chatter/message timeline/composer; attachment/transcript dialog;
rating widget; chatbot step/branch editor; join/leave/help action; public chat
widget/loader; responsive mobile drawer; permission/readonly field wrapper;
empty/error/offline/retry surfaces; report drill-down; and copy-to-clipboard.
The public widget and authenticated backend chat must share data contracts but
must remain separate shells and permission contexts.

## Acceptance matrix

### Authenticated functional and visual acceptance

- At 1440x900, menu hierarchy, action names, breadcrumbs/path, toolbar, card/list
  density, kanban/form tabs, report graph/pivot, dialogs, colors, typography,
  scroll ownership, and empty help match installed Odoo captures.
- At 390x844, the app/menu drawer, channel cards, form tabs, conversation
  timeline/composer, chatbot, reports, dialogs, and widget fit without
  horizontal overflow; touch targets remain usable and content-only scrolling is
  preserved.
- Capture installed Odoo and Core3 for channel kanban/form, session list and
  conversation, looking-for-help, report graph/pivot, agent report,
  chatbot/editor, tags/expertise, member history, empty/no-results/error,
  manager/read-only, and public widget states at both viewports. Store captures
  under `/tmp/odoo-livechat-*` and `/tmp/core3-livechat-*`; never commit them.
- Verify list/kanban/form switching, search, filters, grouping, sorting,
  pagination, favorites where supplied by the shell, row/card actions, join,
  leave, need-help, close, rating, tag/expertise assignment, chatbot branch,
  transcript email/download, widget session resume, and retry/offline behavior.

### Data, permission, and failure acceptance

- Every visible value, count, badge, chart point, pivot measure, message,
  participant, avatar, rule, chatbot answer, transcript, and empty-state copy is
  returned by a named backend datasource and can be replaced by a real query.
- `im_livechat_group_user` can read/join/leave permitted channels and use tags,
  canned responses, session history, and member history; it cannot edit
  manager-only channel Options/Rules/Widget, chatbot scripts, expertise, or
  reports. `im_livechat_group_manager` gets the manager actions. Technical
  menus remain hidden without `base.group_no_one`.
- Unauthorized page/API access returns the product's standard permission
  response; missing ids, stale row versions, invalid rule/chatbot branches,
  invalid ratings, empty lookup options, transport failure, and report query
  failure render deterministic inline error/retry states without leaking data.
- Empty channels, empty history, no conversations needing help, no report data,
  no chatbot scripts, no tags/expertise, search no-results, closed sessions,
  offline widget, visitor leave, and permission-denied states are all explicit
  fixture profiles and screenshot assertions.
- Focused validation must parse every changed YAML file, verify page/API
  fragment joins and datasource ids, exercise the livechat API permission and
  workflow paths, run authenticated Playwright desktop/mobile checks after
  `/api/modules` readiness, and finish with `git diff --check`.

## Exit condition

Keep `planned` until `im_livechat` is installed in the reference database and
the missing authenticated Odoo desktop/mobile route/view evidence is captured.
Then complete the six gates, reconcile any source-vs-live differences, obtain
approval for the fixture and primitive contracts, and only then mark `ready`.

## Bounded implementation slice: conversation tags (2026-09-10)

The owned reference database now has `im_livechat` installed and exposes the
Tags action as Odoo action `820` (`im_livechat.conversation.tag`,
`list,form`). This slice adds the disjoint Core3 route `/livechat/tags` under
Live Chat → Configuration → Tags. The page and API remain separate and join
through `page.id` (`livechat-tags`); the detail form uses `tag-detail` for the
shared side-panel loader contract.

The slice includes deterministic Billing, Follow-up, Urgent, and VIP fixtures,
search/no-results and empty fixtures, list/form rendering, create/update/delete
CRUD, duplicate-name and stale-record guards, transport-error contracts, and
`livechat.read`/`livechat.write` boundaries. Authenticated Odoo/Core3 captures
for 1440x900 and 390x844 are stored outside Git under `/tmp`:

- Odoo: `/tmp/odoo-livechat-tags-desktop-authenticated.png` and
  `/tmp/odoo-livechat-tags-mobile-authenticated.png`
- Core3: `/tmp/core3-livechat-tags-desktop-authenticated.png` and
  `/tmp/core3-livechat-tags-mobile-authenticated.png`
- Core3 detail/search evidence: `/tmp/core3-livechat-tag-detail-desktop-auth-final.png`
  and `/tmp/core3-livechat-tags-empty-desktop-auth-final.png`

The overall sub-plan remains `planned` because the remaining Live Chat action,
conversation, reporting, chatbot, technical, and public-widget surfaces still
require separate parity slices.

## Bounded implementation slice: Technical — Escalated Sessions (2026-09-12)

The owned Odoo 19 reference exposes Technical → Escalated Sessions through
`spreadsheet_dashboard_im_livechat.ongoing_sessions_escalated_menu` (menu id
`571`) and action `spreadsheet_dashboard_im_livechat.ongoing_sessions_escalated_action`
(action id `878`). The live action is a `discuss.channel` window with
`list,form` modes, search view id `2204`, and the exact context
`{'search_default_ongoing': 1, 'search_default_escalated': 1}`. Its menu is
under Live Chat → Technical and is restricted to
`im_livechat.im_livechat_group_manager`. The action has no domain of its own;
the effective result is `livechat_end_dt IS FALSE` and
`livechat_is_escalated IS TRUE` from the hidden search filters.

The source contracts are `/home/nhanjs/projects/odoo/addons/
spreadsheet_dashboard_im_livechat/data/livechat_ongoing_sessions_actions.xml`
and `/home/nhanjs/projects/odoo/addons/im_livechat/views/
discuss_channel_views.xml`. The list view is `discuss.channel.list` (view id
`2205`), create/edit disabled, ascending display is not used here: the
default order is `create_date desc, id desc`. Visible fields are Date,
Customer, Agents, Country, Language, Expertise, Duration, Messages, and
Rating; optional fields include requesting/providing agent, Chatbot, Tags,
Channel, and Comment. The shared search view supports Agent, requesting or
providing agent, Country, Customer, My Sessions, Ongoing, Happy/Neutral/
Unhappy/Unrated, Session Date (24 hours/7/30/365 days), and grouping by
Channel, Agent, requesting/providing agent, Rating, Country, Customer, or
Session Date. The read-only form is `discuss.channel.form` (view id `2207`)
with Participants, Session Date, rating image/Rating, and Comment.

Core3 will add the disjoint route `/livechat/technical/escalated-sessions`
with page id `livechat-technical-escalated-sessions`; its backend fragment
will join by that same `page.id` and expose a separate read-only detail page
with page id `livechat-technical-escalated-session-detail`. The bounded
fixture profile uses stable escalated and non-escalated ongoing/closed rows so
the query proves both Ongoing and Escalated semantics rather than filtering a
pre-filtered static list. It covers default, search no-results, explicit
empty, missing, forbidden, and transport-error states. Reads require
`livechat.read`, navigation and the Technical menu require `livechat.manage`,
and create/update/delete/server mutations are intentionally absent because
Odoo's action has `create=false` and `edit=false`.

Acceptance requires deterministic idempotent migrations, permission/error
metadata, page/API separation, focused integration coverage, and authenticated
Odoo/Core3 comparison captures at 1440x900 and 390x844 under `/tmp` only.
The shared Fluent shell versus Odoo's purple shell remains an intentional
global residual; any slice-specific visual mismatch is fixed before evidence
sign-off.

Implementation and evidence are complete in the isolated worktree in four
separate commits:

- `9dc7d32b` — contract and live source/database action inventory.
- `ce31e1be` — page-only YAML, separate API fragments, manifest route,
  deterministic migration, and focused integration tests.
- `f12c6d49` — comparison fix for the Escalated facet, Odoo optional-column
  defaults, and the corresponding query/test parameter.
- The evidence commit records the final captures and verification below.

Focused validation is
`test/livechat_technical_escalated_sessions.integration.test.ts`: 3 tests
passed, 0 failed, and 40 expect assertions. It verifies the action/menu
contract, matching page/API ids and discovered routes, five matching rows
against nonmatching ongoing/closed rows, idempotent migration, search/rating/
country/empty/no-results/detail/error states, and the read-only permission/no
CRUD boundary. Discovery audit passed with 541 pages, 548 routes, and 942
datasources. `bun run lint`, the full `bun run frontend:build` (including all
CSS builds and a 179-module Vite production build), and `git diff --check`
passed.

Authenticated headless comparison evidence is outside Git under `/tmp` and
was checked after the comparison fix. Every PNG is the stated viewport size:

| Viewport and state | Odoo reference | Core3 implementation |
| --- | --- | --- |
| Desktop 1440x900, list | `/tmp/odoo-livechat-escalated-sessions-1440x900.png` — `2d0084a3671d7bf1dddf45be44e63b8323cc5ef432a35611512ec19201135f93` | `/tmp/core3-livechat-escalated-sessions-1440x900.png` — `a75d6bd8d124a9af52159d19a8a7be3904ddce33d356e1a9b6103e2e299c81a2` |
| Mobile 390x844, list | `/tmp/odoo-livechat-escalated-sessions-390x844.png` — `d4a231112844a63ea25ffe7510ee56b01d87b24717ff8fb34b2d86d37bbed4ba` | `/tmp/core3-livechat-escalated-sessions-390x844.png` — `f8c60ab0f860391e8cf794b28527da9883c963bb1a39b47ee4281d8622d6fbcc` |
| Desktop 1440x900, read-only form | `/tmp/odoo-livechat-escalated-session-detail-1440x900.png` — `757d7d8e8f37d59a501416ab3014bc375995c44553d16f4c27b8d14874b87b05` | `/tmp/core3-livechat-escalated-session-detail-1440x900.png` — `122d2ee7fc74a0655a5e76fc5e8a417dc4884bacadfb4b8e5c314456a098cc5b` |
| Mobile 390x844, read-only form | `/tmp/odoo-livechat-escalated-session-detail-390x844.png` — `bf1220979c2dcc9118aabafc70ea6769c400f5d685781a2339b6bd457c37df68` | `/tmp/core3-livechat-escalated-session-detail-390x844.png` — `3af20c1f1ad56c34a98a1f56dd04e8e5d610ff71b2d956d9723db1017c4ca5f7` |

The browser pass reached both authenticated surfaces, exercised the first
record into the form state, and confirmed exact 1440/390 document widths with
no Core3 page errors or failed requests. Odoo reported only teardown-aborted
background requests (`mail/data`: one desktop and one mobile; two mobile
avatar requests); there were no non-aborted Odoo request failures or page
errors. The live Odoo database has one current matching demo session, while
Core3 intentionally renders five stable matching fixtures for deterministic
search/filter coverage. Odoo hides the filter chips on its mobile toolbar, as
shown in the reference capture. The shared Fluent shell versus Odoo's purple
shell and the richer Odoo conversation/status pane remain documented global/
follow-up differences; the bounded route, list columns, facets, permissions,
and data semantics are aligned.

## Bounded implementation slice: Conversations — Looking for Help (2026-09-10)

The owned Odoo reference exposes `menu_livechat_looking_for_help` through
`discuss_channel_looking_for_help_action` (`discuss.channel`,
`list,kanban,form`) with the domain `livechat_status = need_help`, create
disabled, ascending session order, and the empty help copy “No conversations
found”. This slice adds the disjoint Core3 route `/livechat-sessions/help`
under Live Chat → Conversations → Looking for Help. The page and backend API
fragment remain separate and join through `page.id` (`livechat-help-queue`);
existing session details are opened in the shared side panel.

The queue has fixed-date, idempotent fixtures for three help requests plus the
existing demo request, including customer fallback, requesting agents,
countries, languages, expertise, tags, message counts, and durations. It
supports populated, search no-results, explicit empty/no-results fixture, and
transport-error states. Queue rows expose read-only navigation and
`livechat.write`-guarded Join and Close actions. Conversation create/delete is
not exposed because the Odoo action is an existing-session queue with
`create=false`; the focused test asserts that boundary. All session workflow
transitions now require `expected_row_version` in their state guards, and the
new Join transition only accepts `Looking for Help` sessions.

Focused validation: `test/livechat_looking_for_help.integration.test.ts` covers
the menu/action route, page/API datasource join, deterministic fixtures,
search/empty/error states, read/write permission metadata, no-create/delete
boundary, optimistic state guards, Join, and Close. Authenticated browser
checks reached the Odoo action 700 and Core3’s published route at desktop and
mobile sizes. Captures are outside Git at
`/tmp/odoo-livechat-help-desktop-authenticated.png`,
`/tmp/core3-livechat-help-desktop-authenticated.png`, and
`/tmp/core3-livechat-help-mobile-authenticated.png`. Core3 rendered the menu,
route, and deterministic rows, but its dev frontend did not load the normal
stylesheet/assets in this environment, so those Core3 images are functional
route/data evidence rather than a visual-parity sign-off.

## Bounded implementation slice: Conversations — Sessions (2026-09-10)

The owned reference database exposes Live Chat → Conversations → Sessions as
Odoo action `817` (`discuss.channel`, `kanban,list,pivot,graph,form`) with a
last-30-days session filter. This slice keeps the Core3 route
`/livechat-sessions`, adds the flat session card/list presentation, and joins
page layout to service-owned API fragments using `page.id`.

The slice includes deterministic populated, search-empty, and empty fixtures;
session detail navigation; livechat workflow action contracts; transport-error
states; and `livechat.read`/`livechat.write` permission boundaries. Authenticated
Odoo/Core3 captures for 1440x900 and 390x844 are stored outside Git under
`/tmp`:

- Odoo: `/tmp/odoo-livechat-sessions-desktop-1440x900.png` and
  `/tmp/odoo-livechat-sessions-mobile-390x844.png`
- Core3: `/tmp/core3-livechat-sessions-desktop-1440x900.png` and
  `/tmp/core3-livechat-sessions-mobile-390x844.png`
- Core3 detail/search-empty evidence:
  `/tmp/core3-livechat-session-detail-desktop.png` and
  `/tmp/core3-livechat-sessions-empty-desktop.png`

## Bounded implementation slice: Configuration — Expertise (2026-09-11)

The personal Odoo reference exposes Live Chat → Configuration → Expertise as
action `770`, model `im_livechat.expertise`, with `list,form` modes. Its list is
inline editable and visibly contains the exact columns `Name` and `Operators`;
the seeded rows are `Discuss` and `Livechat`, each assigned to `Mitchell Admin`.
The source view is `addons/im_livechat/views/im_livechat_expertise_views.xml` and
the live action/menu records were verified in `core3_personal` (`ir.actions` 770,
`ir.ui.menu` 505).

This slice adds the disjoint Core3 route `/livechat/expertise` under Live Chat →
Configuration → Expertise, with a side-panel detail route
`/livechat/expertise/detail`. Page YAML and API YAML remain separate and join by
`page.id` (`livechat-expertise` and `expertise-detail`). Fixtures are
idempotent and fixed to `Discuss`, `Livechat`, and `Mitchell Admin`; supported
states include default, search no-results, explicit empty, forbidden, missing
detail, and transport error. Manager-only `livechat.manage` mutations cover create/update/
delete, duplicate and required-name validation, in-use protection for assigned
expertise, and optimistic row-version conflicts. The visible operator assignment
is represented as a deterministic comma-separated operator display in this
bounded slice; a future slice can replace it with a true many2many operator
editor once the shared relation mutation contract is approved.

Focused validation is `test/livechat_expertise.integration.test.ts`. Authenticated
desktop/mobile captures are stored outside Git under `/tmp`:

- Odoo: `/tmp/odoo-livechat-expertise-desktop-list.png`,
  `/tmp/odoo-livechat-expertise-desktop-detail.png`,
  `/tmp/odoo-livechat-expertise-mobile-list.png`, and
  `/tmp/odoo-livechat-expertise-mobile-detail.png`
- Core3: `/tmp/core3-livechat-expertise-desktop-list.png`,
  `/tmp/core3-livechat-expertise-desktop-detail.png`,
  `/tmp/core3-livechat-expertise-mobile-list.png`, and
  `/tmp/core3-livechat-expertise-mobile-detail.png`

The Odoo list uses native many2many chips and an inline bottom editor. Core3
matches the action hierarchy, density, labels, rows, responsive shell, and
manager/read-only boundaries, but intentionally documents the bounded display
editor limitation above; screenshots are evidence only and are not committed.

## Bounded implementation slice: Conversations — Channels (2026-09-11)

The installed Odoo reference exposes Live Chat → Conversations → Channels as
the `im_livechat_channel_action` kanban/form action at `/odoo/livechat`. The
visible list is `Live Chat Channels` with `New`, search, pager, and channel
cards for `YourWebsite.com` (`18 Sessions`, `Leave`, `81%`) and `Support`
(`7 Sessions`, `Join`, `50%`). The configured channel form is at
`/odoo/livechat/1` and visibly contains `Channel Name`, the `Agents`,
`Options`, `Rules`, and `Widget` tabs, plus `Join Channel`/`Leave Channel`.

Core3 implements the bounded action at `/livechat` and the detail route
`/livechat/channel/detail?id=livechat-channel-demo-002`. The page-only YAML
fragments use page ids `livechat` and `livechat-channel-detail`; the matching
API fragments provide the list/detail datasources, deterministic fixtures,
manager create/edit permissions, `livechat.write` Join/Leave mutations,
optimistic row-version guards, search/empty/forbidden/transport-error
boundaries, and Sessions/Happy navigation actions. The migration seeds the two
reference channels and the detail tabs use the exact Odoo labels `Agents`,
`Options`, `Rules`, and `Widget`.

Focused validation:

```text
bun test test/livechat_channels.integration.test.ts
4 pass, 0 fail, 38 expect() calls
```

Authenticated paired captures were taken outside Git at 1440x900 and 390x844.
Each file is a PNG with the stated dimensions; SHA-256 values are recorded so
the evidence can be checked without committing screenshots.

| Viewport | Odoo reference | Core3 implementation |
| --- | --- | --- |
| Desktop 1440x900, channels | `/tmp/odoo-livechat-channels-desktop-1440x900-20260911.png` — `217ae2ba5b3f6883a9475460b28ff54bd9829524166cd658a31211f1a31204e4` — 1440×900 | `/tmp/core3-livechat-channels-desktop-1440x900-20260911-final.png` — `8d6b536e3569e7d216e5e08b63a81e1fbe3d1588621a67d94854164343a5cc85` — 1440×900 |
| Desktop 1440x900, channel form | `/tmp/odoo-livechat-channel-form-desktop-1440x900-20260911.png` — `7505d0a4734dfaafc4fbac5fc3d4729da6205609bc69e4eedc0d4b2460bad6be` — 1440×900 | `/tmp/core3-livechat-channel-form-desktop-1440x900-20260911-final.png` — `a94a15d430516996fb620c6f999b729018bc4c951e273c4859fabb60cb388cd6` — 1440×900 |
| Mobile 390x844, channels | `/tmp/odoo-livechat-channels-mobile-390x844-20260911.png` — `28624885ec1099ae52e8b849f60e835f832dba7d2185e13c1a0c32d5fcd4ebb1` — 390×844 | `/tmp/core3-livechat-channels-mobile-390x844-20260911-final.png` — `31ff5d1637c37b261944a999330d5289343d1cb91c5c6568cc437d33248c1a55` — 390×844 |
| Mobile 390x844, channel form | `/tmp/odoo-livechat-channel-form-mobile-390x844-20260911.png` — `63b1b6de002e8004714ad864567e12e20fcbd0d54a6f4c97fc3a6119a53dddde` — 390×844 | `/tmp/core3-livechat-channel-form-mobile-390x844-20260911-final.png` — `124c76ca8678b9178e12cf22adbab469f8062c9574e9dd177772305c1102aaf8` — 390×844 |

Comparison and fixes: the first Core3 captures exposed missing generated
global/auth/Live Chat CSS in the fresh worktree; the final captures were
re-rendered after the CSS build and inspected with Inter styles, no page or
request errors, and no horizontal overflow at either viewport. The refinement
commits changed the channel view id to the card renderer, removed the desktop
mobile-only flag, removed duplicate raw form fields before the notebook, and
aligned the two-agent deterministic fixture (`Marc Demo, Mitchell Admin`).

Residual mismatches: Core3 uses the shared Fluent shell rather than Odoo's
purple shell; the generic card renderer displays `Join`/`Leave` as card text
rather than Odoo's inline card buttons; the generic form displays the two
agents as a deterministic text value rather than Odoo's many2many operator
rows; and the list currently orders `Support` before `YourWebsite.com` while
the reference orders `YourWebsite.com` first. The Options/Rules/Widget content
is a bounded read/display surface; Odoo exposes richer editable controls there.
These are recorded as follow-up parity work, not hidden by the evidence.

## Bounded implementation slice: Configuration — Chatbots (2026-09-11)

The installed Odoo 19 reference exposes Live Chat → Configuration → Chatbots
as menu id `503`, action id `764`, model `chatbot.script`, and view mode
`list,form`. The menu is restricted to `im_livechat_group_manager`. The source
contracts are in `/home/nhanjs/projects/odoo/addons/im_livechat/views/
chatbot_script_views.xml`, `chatbot_script_step_views.xml`, and
`chatbot_script_answer_views.xml`. The live database contains four scripts:
`Lead Generation Bot`, `Odoo`, `Support Bot`, and `Welcome Bot`.

Core3 implements the source-backed action as three joined page/API fragments:

- `/livechat/chatbots`, page id `livechat-chatbots`, list of deterministic
  chatbot titles with Odoo's `Create a Chatbot` empty help text and manager-only
  create/navigation.
- `/livechat/chatbots/detail`, page id `livechat-chatbot-detail`, editable
  `Chatbot Name` form and `Script` line grid with `Message`, `Step Type`,
  `Answers`, `Only If`, and add/edit/delete step actions.
- `/livechat/chatbots/steps/detail`, page id
  `livechat-chatbot-step-detail`, editable step fields and answer rows with
  `Answer`, `Optional Link`, and add/edit/delete answer actions.

Page YAML and API YAML are separate and joined by matching `page.id`. The
manager permission is `livechat.manage`. The API contracts cover deterministic
fixtures, ordered search, explicit empty/no-results, missing detail, forbidden,
transport failure, required/duplicate validation, parent/child ownership,
optimistic row-version stale guards, and foreign-key-safe delete ordering.
The fixtures mirror the Odoo-visible `Lead Generation Bot` five-step script,
including its free-input, forward-to-operator, text, email, and create-lead
steps; Odoo's three demo answer choices are also seeded deterministically.

Focused validation:

```text
bun test test/livechat_chatbots.integration.test.ts
4 pass, 0 fail, 75 expect() calls
```

Authenticated paired captures were taken against the owned Odoo 19 instance
and the isolated Core3 runtime at 1440x900 and 390x844. Screenshots are under
`/tmp`, are not committed, and have these verified dimensions and SHA-256
values:

| Viewport | Odoo reference | Core3 implementation |
| --- | --- | --- |
| Desktop 1440x900, chatbot list | `/tmp/odoo-livechat-chatbots-desktop-1440x900-20260911.png` — `72ab492704dec3685db11e06207f4a7cea4220beb305c8072a23ac7d8897c040` — 1440×900 | `/tmp/core3-livechat-chatbots-desktop-final2-1440x900-20260911.png` — `ffdc09c8ba4cd74ad027a6f83be5d185395cf752689bc292cd18a2655b9ef2ec` — 1440×900 |
| Desktop 1440x900, chatbot form | `/tmp/odoo-livechat-chatbot-form-1440x900-20260911.png` — `17fb43cc25a53612c2018dab1ce779abf8ec83b1b3dc793bd41c636638227c1e` — 1440×900 | `/tmp/core3-livechat-chatbot-detail-desktop-final2-1440x900-20260911.png` — `4a26f394291b569fb007aef648ff490c7f98db30a71ea94f1a8ae4106ca94e50` — 1440×900 |
| Desktop 1440x900, step form | same Odoo chatbot form capture — 1440×900 | `/tmp/core3-livechat-chatbot-step-desktop-final2-1440x900-20260911.png` — `f442e1fded3948ef43261e2fa4ee4531d0e15011b154cf36a1a5a0e4cfb85156` — 1440×900 |
| Mobile 390x844, chatbot list | `/tmp/odoo-livechat-chatbots-mobile-390x844-20260911.png` — `a5a505b93403fc42d42a3bdc8b3d443d4a67d4dd640c93bb527d8aaac5b91ed5` — 390×844 | `/tmp/core3-livechat-chatbots-mobile-final2-390x844-20260911.png` — `b12a12dfdc0e316363f488524307eb4564aa8da16e5d1712078064e66cfb0867` — 390×844 |
| Mobile 390x844, chatbot form | `/tmp/odoo-livechat-chatbot-form-390x844-20260911.png` — `6383caa26c9bd76fa71f7bda005c4175d295e50f079327b29a6af8bde7079d8f` — 390×844 | `/tmp/core3-livechat-chatbot-detail-mobile-final2-390x844-20260911.png` — `f8619ee6137f1c357734542fec9429de152bb3123fad274e97edaf311c5b5717` — 390×844 |
| Mobile 390x844, step form | same Odoo chatbot form capture — 390×844 | `/tmp/core3-livechat-chatbot-step-mobile-final2-390x844-20260911.png` — `229ee3efa55105632aa9e91442d63f9c5e84e8b6de84fef7cef0898d2984e558` — 390×844 |

Comparison-driven fixes included rebuilding the isolated global and Live Chat
CSS after the initial loader capture, hiding the helper `step_name` column from
the desktop grid while retaining ordered `Step 1`…`Step 5` mobile cards, and
removing Core3-only Bot Operator, Active, and zero-valued Channels controls
that were not visible in the Odoo source form. The final authenticated browser
pass reached all six routes, matched seeded body text, reported no non-aborted
request/page failures, and had no horizontal overflow at either viewport.

Residual scope is explicit: Core3 retains the shared Fluent shell instead of
Odoo's purple shell, has no Odoo bot avatar, and uses generic icon edit/delete
affordances. The step editor is a bounded field/display contract rather than a
full many2many expertise/triggering-answer branch editor. `Create Lead` is a
deterministic step type only; public widget transport, chatbot execution,
conversation/lead integration, reports, member history, and transcript/user
integration remain planned follow-up slices.

## Bounded implementation slice: Configuration — Canned Responses (2026-09-11)

The next uncovered visible Live Chat action is Configuration → Canned Responses.
The active authenticated reference database `core3_user_demo` exposes this as
`/odoo/action-126`, action `mail.mail_canned_response_action`, model
`mail.canned.response`, with `list,form,kanban` view modes. The live menu audit
showed it beneath Live Chat → Configuration alongside the already-covered
Chatbots, Expertise, and Tags actions.

The source contract is in
`/home/nhanjs/projects/odoo/addons/mail/views/mail_canned_response_views.xml`
and `/home/nhanjs/projects/odoo/addons/mail/models/mail_canned_response.py`:
the list is editable at the bottom and shows Shortcut, Substitution, optional
Authorized Groups, and optional Last Used; the form edits Shortcut,
Substitution, and Authorized Groups; the mobile kanban shows the shortcut,
substitution, and authorized-group tags. Search supports Shortcut and
Substitution, with Private/Shared filters and Authorized Groups grouping. The
empty help copy is “No canned response found. Let's create one!” followed by
the `::shortcut` usage guidance. Seed data from `mail_canned_response_data.xml`
and `mail_canned_response_demo.xml` establishes `hello` and `bye` responses.

Core3 will expose only this action at `/livechat/canned-responses` with a
side-panel detail route `/livechat/canned-responses/detail`. Page YAML and API
YAML remain separate and join through page ids
`livechat-canned-responses` and `livechat-canned-response-detail`. The
service-owned datasource will provide stable ids, `::` shortcut display,
substitution, authorized groups, shared/editable flags, creator, and a
relative-date Last Used value. Deterministic default, private/shared,
no-results, empty, missing, forbidden, and transport-error profiles are
required; migrations must be idempotent and avoid runtime timestamps or random
ids.

CRUD uses `livechat.write`, while reads use `livechat.read`. Create/update
requires a lowercase shortcut token (`[a-z0-9_-]`, max 64), non-empty
substitution, duplicate-name protection, missing-record protection, and
optimistic row-version guards. Shared rows are readable but not editable by a
read-only user; deleting a missing or stale row is rejected. The focused test
must cover the page/API join, source-backed list/form/kanban contract,
search/filter/empty/error states, deterministic migration, CRUD and stale/
validation/permission boundaries. Authenticated Odoo/Core3 browser evidence
must compare the action at 1440x900 and 390x844, with captures only in `/tmp`.

Implementation and evidence are complete in isolated commits:
`6c62444c` adds the page/API fragments, manifest route, deterministic
migration, CRUD guards, and focused contract suite; `4e061de6` records the
pre-implementation contract. The final authenticated browser comparison used
the active Odoo reference (`core3_user_demo`, `/odoo/action-126`) and Core3's
isolated runtime. Both list and detail routes were exercised; list captures
are:

| View | Odoo | Core3 |
| --- | --- | --- |
| Desktop 1440x900 list | `/tmp/odoo-livechat-canned-responses-desktop-1440x900-20260911.png` — `90ce766a8e90846e7d5c15d6b9502dbe40eaa6214e47bf033a03108dfb9f6217` | `/tmp/core3-livechat-canned-responses-desktop-final-20260911.png` — `8befb8b59be972cf648036f7534ec60c188e752678f30bea5ffa3238039a786d` |
| Mobile 390x844 list | `/tmp/odoo-livechat-canned-responses-mobile-390x844-20260911.png` — `5bec184e1faf07ae53003f37f3d566c5af674e99a29c3cc5a607a43f33a695df` | `/tmp/core3-livechat-canned-responses-mobile-final-20260911.png` — `a8daa7361ceb3b4bdb840614c1b05ea5d5d4281067394418e4a6e3b59f64a3ef` |

Core3 detail-route captures are `/tmp/core3-livechat-canned-response-detail-desktop-20260911.png`
(`3931b93eee9c0525b8a7953da6a07add683bae73deb6f84fd18bfe6e3dc9b601`) and
`/tmp/core3-livechat-canned-response-detail-mobile-20260911.png`
(`7b5269d2ba18d5c76e6d4b72734e132d1be3947321ae6bad377a4c62d75416cf`). The
browser pass found zero request failures, page errors, or HTTP responses at
least 400, and document/body widths were exactly 1440/1440 and 390/390.
Focused tests passed 4/4 with 44 assertions; the UI audit passed with 515
pages, 522 routes, and 907 datasources; ESLint, global/Live Chat Sass builds,
and `git diff --check` passed. The overall Live Chat plan remains planned
because this is one bounded action and the other inventory surfaces remain.

## Bounded implementation slice: Reporting — Agents (2026-09-11)

The next uncovered installed visible action is Live Chat → Reporting → Agents.
The authenticated `core3_personal` database exposes it at `/odoo/action-772`
with action name `Agents`, model `im_livechat.channel.member.history`, view
mode `pivot,graph`, and the domain `livechat_member_type = agent`. The source
records are in
`/home/nhanjs/projects/odoo/addons/im_livechat/views/im_livechat_channel_member_history_views.xml`:
menu `menu_reporting_livechat_agent` (parent `menu_reporting_livechat`,
sequence 10), action `im_livechat_agent_history_action`, search view
`im_livechat_agent_history_view_search`, graph view
`im_livechat_agent_history_view_graph`, and pivot view
`im_livechat_agent_history_view_pivot`. The live desktop and mobile states
show the default `Date: Last month` filter, `Agent` grouping, and the
`Livechat Support Statistics` pivot with `Total`, `OdooBot`, `Marc Demo`, and
`Mitchell Admin` rows.

The action is read-only for Live Chat users and managers. Source ACL
`access_im_livechat_channel_member_history_user` grants read only to
`im_livechat_group_user`; there are no create, write, or unlink operations.
Core3 therefore exposes `/livechat/agent-analysis` under Reporting → Agents
with `livechat.read`, no CRUD or row navigation, and separate page/API YAML
fragments joined by page id `livechat-agent-analysis`.

The API datasource `livechat_agent_history` must provide deterministic,
query-replaceable agent rows with `id`, `agent_name`, `session_date`,
`session_date_month`, `session_start_hour`, `session_week_day`, `channel_name`,
`country_name`, `expertise_names`, `tag_names`, `session_outcome`,
`help_status`, `rating_text`, `session_count`, `response_time_hour`,
`session_duration_hour`, `rating`, `call_count`, `call_percentage`, and
`call_duration_hour`. The fixture profile mirrors the visible reference totals:
13 agent histories overall, with OdooBot 1, Marc Demo 1, and Mitchell Admin 11;
the seeded measures must aggregate to 30 seconds response time, 55 seconds
session duration, 58.3 rating percent, and 4 sessions with calls. It also
defines deterministic last-month, search no-results, explicit empty, missing,
transport-error, and forbidden profiles. The default report groups by Agent;
the supported filters/groupings are Agent, channel, country, expertise, tags,
status, rating, help status, hour of day, day of week, and Date.

The page must reproduce Odoo's report title, `Measures` control, `Total` row,
visible agent rows, pivot/graph tabs, date filter, search, and responsive
mobile drawer/content behavior at 1440x900 and 390x844. The focused test must
assert the action/menu/page/API contract, exact aggregations, empty/error/
permission states, and the no-create/no-write/no-unlink boundary. Odoo
captures are outside Git at `/tmp/odoo-livechat-agents-desktop-1440x900-
20260911.png` (SHA-256 `633912d9d0a58a4d895dedd432831566bf400cb9ab65fb601f8ca7799cddbace`, 1440x900) and `/tmp/odoo-livechat-agents-mobile-1440x900-20260911.png` (SHA-256 `122c3a96a138423dde67c4b3a5fd71455984334d825fa272a5ce0e7da59400e7`, 390x844; the historical filename retains `1440x900`).

The authenticated Core3 comparison used the isolated runtime after rebuilding the global Sass bundle. Fixed viewport captures are:

| View | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Core3 Agents Pivot | 1440x900 | `/tmp/core3-livechat-agents-desktop-pivot-final-20260911.png` | `775d2534bdcd3d767fcadb543661c0166b39a3d630a693cc8b8be539abe64a19` |
| Core3 Agents Graph | 1440x900 | `/tmp/core3-livechat-agents-desktop-graph-final-20260911.png` | `e706216e8651f5c7177f63b4a560eca5932f74b39587dde2d28c2ad63098f216` |
| Core3 Agents Pivot | 390x844 | `/tmp/core3-livechat-agents-mobile-pivot-final-20260911.png` | `88390c0b953958d14b221c44b44e7fe6184610ee1db4af8259b22a030922cb03` |
| Core3 Agents Graph | 390x844 | `/tmp/core3-livechat-agents-mobile-graph-final-20260911.png` | `09682a90fb3c0b8ae58eb435087b3f13e88cef0e515d9223d402286632ac8285` |

Both Core3 modes were populated with the seeded agent rows at both viewports; the browser pass had no failed requests or page errors, and document/body width matched the configured viewport (1440/1440 and 390/390). The compact mobile Pivot table preserves Odoo's report columns inside its own table viewport while the page remains responsive. Core3 retains the shared Fluent shell and renderer formatting differences from Odoo's purple shell; the action is read-only as in the source ACL.

## Bounded implementation contract: Technical — Member History (2026-09-11)

The next uncovered Live Chat action is Technical → Member History. The active
authenticated `core3_user_demo` reference exposes
`im_livechat.im_livechat_channel_member_history_action` at `/odoo/action-800`
for model `im_livechat.channel.member.history`, with `list,form` view modes and
context `{ "create": false }`. The source menu is
`livechat_technical` → `im_livechat.menu_member_history` in
`/home/nhanjs/projects/odoo/addons/im_livechat/views/im_livechat_channel_member_history_views.xml`;
the parent Technical menu is restricted to `base.group_no_one`.

The source list contract is the ordered, newest-first fields Created on,
Channel, Partner, Chatbot Script, Guest, Session Duration, and Member Type. The
read-only generated form exposes the member identity, channel, partner/guest,
chatbot script, member type, agent expertise, conversation tags, country,
outcome, weekday, rating, Live Chat channel, session start hour and duration,
call history/measures, message count, response time, and help status. The ACL
`access_im_livechat_channel_member_history_user` grants read only to
`im_livechat_group_user` (`1,0,0,0`), so this slice has no create, update, or
delete operation, row actions, or writable fields.

Core3 will add exactly one Technical menu item at
`/livechat/member-history`, protected by `livechat.technical`; the datasource
uses `livechat.read` to reflect the source model ACL. Page and API YAML remain
separate and join by `page.id` as
`livechat-member-history` and `livechat-member-history-detail`. Deterministic
service-owned fixtures provide the visible list, search/no-results, explicit
empty, missing detail, forbidden, and transport-error states. The migration is
idempotent, uses stable ids and fixed fixture dates, and retains a detail
route for the source `form` mode. No mutation YAML is permitted; focused tests
must assert the no-create/no-write/no-unlink boundary, exact source fields,
page/API joins, migration idempotence, permissions, and failure states.

Authenticated Odoo/Core3 comparisons are required at 1440x900 and 390x844 for
the list and read-only detail route. Captures remain in `/tmp` only.

## Bounded implementation slice: Technical — Member History (2026-09-11)

Implementation and evidence are complete in the isolated worktree
`/home/nhanjs/projects/core3-worktrees/odoo-ui-livechat-canned-responses-20260911`.
The contract was approved in `7ea4eabb`; implementation is in `9ee7ff11`, and
the comparison-driven duration normalization fix is in `2726cf9b`. The slice
adds only the Technical → Member History route, with `livechat.technical` on
the menu/page and the source-accurate `livechat.read` read-only datasource.
There are no create, update, or delete actions.

The final authenticated browser pass used Odoo 19 at
`http://localhost:8069`, database `core3_user_demo`, action `/odoo/action-800`,
and Core3 at the isolated runtime `http://localhost:3022`. Both list and first
record detail routes were exercised at both required viewports. Captures are
only in `/tmp` and are not committed:

| View | Odoo reference | Core3 implementation |
| --- | --- | --- |
| Desktop 1440x900 list | `/tmp/odoo-livechat-member-history-desktop-list-final-20260911.png` — `6ca9dc6e12dcd07e63217c84bc1306c10cdd53cdb51395d9752177205c31e0c9` | `/tmp/core3-livechat-member-history-desktop-list-final-20260911.png` — `bc43c3822bc6ca3109e3ce8663f333828cdfe40189d93eb9f2480f8730123490` |
| Desktop 1440x900 read-only form | `/tmp/odoo-livechat-member-history-desktop-detail-final-20260911.png` — `dfd7acf62ba22af7e5300275062c79fbe931f84875112c57fb4bdcfcd662dbfd` | `/tmp/core3-livechat-member-history-desktop-detail-final-20260911.png` — `5fb65616445e2d2b151306bee33b5fc12a42c7952f9d5ebe7141f4da27665fad` |
| Mobile 390x844 list | `/tmp/odoo-livechat-member-history-mobile-list-final-20260911.png` — `5631a76540c65b44ff339cf15a2953ec5f9b151a3fbccafa7a1cf333228b11dc` | `/tmp/core3-livechat-member-history-mobile-list-final-20260911.png` — `ed990156987a41cb6ae396a829ad532168fa377d0fa515b6ccd17fe8dd8298e0` |
| Mobile 390x844 read-only form | `/tmp/odoo-livechat-member-history-mobile-detail-final-20260911.png` — `1cc433a4e2f10a025f74a4d92501fb95c4a8c9fd7779faaa6dccf9224bebaa5c` | `/tmp/core3-livechat-member-history-mobile-detail-final-20260911.png` — `d11be44d64c880df7c11bf5a947ebd3d9b1ab9fb4f5cfb8f1abbe4288f87caa9` |

Both authenticated browser passes reported zero page errors, failed requests,
or HTTP responses at least 400. Body and document widths matched the viewport
at desktop (1440/1440) and mobile (390/390). The final focused suite passed
3/3 with 34 assertions. The UI audit passed with 517 pages, 524 routes, and
909 datasources; ESLint passed; global and Live Chat Sass builds passed; and
`git diff --check` passed. The worktree is clean and no image is tracked.
There are no pre-existing blockers for this bounded slice; the overall Live
Chat plan remains planned because its other inventory surfaces are follow-up
work.

## Bounded implementation contract: Technical — Ongoing Sessions (2026-09-11)

The next uncovered visible action in the active `core3_user_demo` database is
Technical → Ongoing Sessions. The recursive menu audit found
`Live Chat > Technical > Ongoing Sessions` (menu id 570), backed by live action
877 (`ongoing_sessions_all_action`) from the installed
`spreadsheet_dashboard_im_livechat` module. Its action name is `Sessions`, model
`discuss.channel`, view modes `list,form`, domain `channel_type = livechat`,
and context `search_default_ongoing = 1`. This is a distinct manager-only
technical action and is not the already-covered general Sessions route.

The source contract is
`/home/nhanjs/projects/odoo/addons/spreadsheet_dashboard_im_livechat/data/livechat_ongoing_sessions_actions.xml`
plus `addons/im_livechat/views/discuss_channel_views.xml`. The list is
read-only (`create="false"`) and shows Date, Customer, Agents, Country,
Language, Expertise, Duration, Messages, and Rating, with Ongoing as the
active state. Its form is also read-only (`create="false"`, `edit="false"`) and
shows Participants, Session Date, rating image, and rating feedback.

Core3 will expose exactly this action at
`/livechat/technical/ongoing-sessions` with a separate read-only detail route.
Page and API YAML remain separate and join by page ids
`livechat-technical-ongoing-sessions` and
`livechat-technical-ongoing-session-detail`. The manager-only menu/page uses
`livechat.manage`; the named list/detail datasources use `livechat.read` to
match the underlying model read ACL. Deterministic service-owned fixtures
provide ongoing live-chat rows, search/filter no-results, empty, missing,
forbidden, and transport-error states. No mutation actions are allowed; tests
must prove the no-create/no-write/no-unlink boundary, default ongoing domain,
source columns, page/API joins, idempotent fixtures, permissions, and
read-only detail behavior. Authenticated Odoo/Core3 comparisons are required
at 1440x900 and 390x844, with captures only in `/tmp`.

### Evidence and acceptance — Technical Ongoing Sessions (2026-09-11)

The implementation is committed in `b65ffdc7` after the contract approval in
`7e2dc3e2`. The focused integration contract passes 3 tests with 35
assertions. The page/API separation, default `Ongoing` facet, manager-only
menu, read-only list/detail behavior, deterministic 12-row fixture, and
unauthorized/forbidden/empty/no-results/not-found/transport states are all
covered by `test/livechat_technical_ongoing_sessions.integration.test.ts`.

The browser comparison used the authenticated `admin@core3.local` account in
`core3_user_demo`. Odoo source captures are `/tmp/odoo-livechat-ongoing-
sessions-desktop-list-20260911.png` (1440x900, SHA-256
`54b4ed33d20dcedb7a91818bb7ecaae93ae47ee5b8d2007929972daf9f97f5a6`),
`/tmp/odoo-livechat-ongoing-sessions-mobile-list-20260911.png` (390x844,
`3ac9735a8e2a6dc74db1206bcd4f3c521ade0006fdad794e628bb0f631a00a6f`),
`/tmp/odoo-livechat-ongoing-sessions-desktop-detail-20260911.png` (1440x900,
`87889e4a964a303a28166a0778aaa10ef01a217e521587f6e3e974fd75c4a654`), and
`/tmp/odoo-livechat-ongoing-sessions-mobile-detail-20260911.png` (390x844,
`88db3c2e563e875a3210caba85b887ee83a3fd805cb43bab1ff9bd5704ad8342`).

Core3 post-fix captures are `/tmp/core3-livechat-ongoing-sessions-desktop-list-postfix-20260911.png`
(1440x900, `0c94cec70200d412311eba65ff0455243f0f8cba6883b89e758c400044fa2e57`),
`/tmp/core3-livechat-ongoing-sessions-mobile-list-postfix-20260911.png`
(390x844, `2ef510374dffc171c7949e5a3aa32c5123295fe03f3f1ccfc63caab4de38e499`),
`/tmp/core3-livechat-ongoing-sessions-desktop-detail-postfix-20260911.png`
(1440x900, `5fc72a87cf4d7a4734e78aff0f970b9b014ae1a84009787318bdc3cc8fc36878`),
and `/tmp/core3-livechat-ongoing-sessions-mobile-detail-postfix-20260911.png`
(390x844, `e5f4bb54d306b9e424c17e0e1c37ffd94773973349aa9a095d87a41acc8d5dfb`).
The visual review found that Odoo exposes the active `Ongoing` search facet;
Core3 now declares the same default facet visibly while retaining the
server-side ongoing domain. No screenshots are tracked in Git.

## Channels continuation audit (2026-09-12)

This branch revalidated the bounded Channels implementation and corrected the
remaining deterministic card ordering drift: the datasource now owns an
explicit `sequence`, returning `YourWebsite.com` before `Support` as shown by
the installed Odoo action. The migration is idempotent and the focused suite
passes 4 tests with 39 assertions. The implementation correction is committed
as `a7f7be8c`.

The active Odoo reference at `http://localhost:8073` was reachable. Prior
authenticated paired captures remain valid source evidence and were copied
without modification under `/tmp/core3-odoo-parity/livechat-channels-20260912`
for this audit; no image is tracked. Their hashes are the same as the original
captures: Odoo desktop list `217ae2ba5b3f6883a9475460b28ff54bd9829524166cd658a31211f1a31204e4`,
Odoo desktop form `7505d0a4734dfaafc4fbac5fc3d4729da6205609bc69e4eedc0d4b2460bad6be`,
Odoo mobile list `28624885ec1099ae52e8b849f60e835f832dba7d2185e13c1a0c32d5fcd4ebb1`,
Odoo mobile form `63b1b6de002e8004714ad864567e12e20fcbd0d54a6f4c97fc3a6119a53dddde`,
Core3 desktop list `8d6b536e3569e7d216e5e08b63a81e1fbe3d1588621a67d94854164343a5cc85`,
Core3 desktop form `a94a15d430516996fb620c6f999b729018bc4c951e273c4859fabb60cb388cd6`,
Core3 mobile list `31ff5d1637c37b261944a999330d5289343d1cb91c5c6568cc437d33248c1a55`,
and Core3 mobile form `124c76ca8678b9178e12cf22adbab469f8062c9574e9dd177772305c1102aaf8`.

A fresh authenticated browser comparison could not be completed in this
continuation audit: the shared host's Vite watcher limit raised `EMFILE`, and
the built Core3 server exposed a development import-map shell that rendered
blank without the Vite source server. This is an environment limitation, not a
visual-parity claim; the existing authenticated screenshots remain the latest
trusted visual evidence. The known residuals remain the shared Fluent shell,
generic card Join/Leave text actions, text-rendered agent values, and bounded
read/display Options, Rules, and Widget tabs versus Odoo's richer controls.

## Reporting > Sessions bounded slice (2026-09-12)

The selected Odoo action is `im_livechat.report_channel`, action 439, with Sessions list/graph/pivot reporting and the source measures/groupings. Core3 keeps the existing `/livechat/reporting/sessions` route, fixes its page/API binding, and declares deterministic session rows, date/search/empty states, `livechat.read` access, and the 503 transport contract. The focused test passes 3 tests and 40 assertions.

Authenticated Odoo and Core3 captures are under `/tmp/core3-odoo-parity/livechat-next-20260912/` at both 1440x900 and 390x844; the paired browser run reported no application failures or horizontal overflow. The expected bounded residual is the shared Core3 Fluent shell and compact report renderer versus Odoo's purple shell and richer chart controls.
