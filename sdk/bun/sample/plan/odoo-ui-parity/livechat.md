# Live Chat — Odoo UI parity gate sub-plan

Status: `planned`

This plan is not ready for implementation. The Odoo source is available, but
the authenticated reference database at `http://localhost:8069` does not have
`im_livechat` installed: login succeeds as `admin@core3.local`, the home menu
contains Discuss and its Channels action only, and the live configuration menu
contains Notifications, Voice & Video, and Canned Responses. No Live Chat app,
`/odoo/livechat` action, Live Chat configuration tree, or Live Chat report was
available to capture. Install/enable the addon in the reference database and
repeat the route and screenshot gate before changing this status to `ready`.

## Reference and evidence

- Odoo checkout: `/home/nhanjs/projects/odoo`, revision
  `659759969d535d286b656c96b675e4612b925ddd`.
- Addon: `addons/im_livechat`; manifest name `Live Chat`, version `1.0`,
  `installable=True`, `application=True`, category `Website/Live Chat`.
- Dependencies: `mail`, `rating`, `digest`, `utm`.
- Official demo data is present: one channel, chatbot, chatbot sessions, and
  live chat sessions in `demo/im_livechat_channel/*.xml` (30 files in the
  manifest list). Preserve demo-off and demo-on fixture modes.
- Authenticated reference evidence captured without claiming Live Chat parity:
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
| 2. Menus/actions/views | Pass from source inventory below; live visibility remains unverified because the addon is uninstalled. |
| 3. Routes and 1440x900/390x844 reference UI | Blocked by the exact uninstalled limitation above. Current authenticated screenshots prove only the fallback Discuss shell, not Live Chat. |
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
