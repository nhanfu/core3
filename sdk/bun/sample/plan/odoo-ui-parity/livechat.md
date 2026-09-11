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
