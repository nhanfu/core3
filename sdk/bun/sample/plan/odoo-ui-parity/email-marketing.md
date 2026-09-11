# Odoo 19 UI parity — Email Marketing

Status: `planned`

This is the implementation gate for the Odoo 19 Community `mass_mailing`
addon. The overall register remains a plan and evidence record; completed
action slices may add their scoped product code, migrations, fixtures, and
tests. `ready` is reserved for the point at which all six register gates have
evidence, including an installed authenticated Odoo desktop/mobile reference.
The original reference database does not meet that bar.

## Reference gate and exact live limitation

- Source: `/home/nhanjs/projects/odoo`, revision
  `659759969d535d286b656c96b675e4612b925ddd` (`65975996`), addon
  `/home/nhanjs/projects/odoo/addons/mass_mailing`.
- Manifest: `__manifest__.py` identifies **Email Marketing**, version `2.7`,
  category `Marketing/Email Marketing`, application `True`, license `LGPL-3`,
  and dependencies `contacts`, `mail`, `html_builder`, `utm`, `link_tracker`,
  `social_media`, `web_tour`, and `digest`.
- Official data is extensive: security/groups/access, digest/config/cron,
  attachments and mailing templates, lists/subscriptions/opt-outs, tours,
  compose/import/add-to-list/merge/test/schedule wizards, trace reports,
  blacklist/filter/link-tracker/contact/list/mailing/subscription/settings/
  campaign views, portal/unsubscribe templates, themes, and mail snippets.
- Official demo data is present and loaded only when demo is enabled:
  `demo/utm.xml`, `demo/mailing_list_contact.xml`,
  `demo/mailing_subscription.xml`, `demo/mailing_mailing.xml`,
  `demo/mailing_trace.xml`, and `demo/res_users.xml`. It includes Imported
  Contacts, seven contacts, subscriptions and opt-outs, a blacklist entry,
  Newsletter 1, an attachment, eight trace states (reply/open/sent/error/
  bounce), link clicks, and demo users. Relative `DateTime.today()` values
  must become fixed seed-date values in Core3.
- Live audit date: `2026-09-10`, `http://localhost:8069`, database
  `core3_demo`, authenticated as `admin@core3.local` using credentials in the
  parent plan. The authenticated `ir.module.module.search_read` result is:
  `name=mass_mailing`, `state=uninstalled`, `demo=false`,
  `latest_version=false`, `installed_version=19.0.2.7`.
- Because `mass_mailing` is uninstalled, the live Odoo UI exposes no Email
  Marketing app menu, mailing action, record, view mode, settings, report,
  builder, or addon route. The authenticated fallback is Discuss at
  `/odoo/discuss`; it is not evidence of an installed Email Marketing UI.
  Do not install/activate the addon in the original plan-only task and do not invent
  installed/demo screenshots, payloads, menu visibility, or record IDs.

## Truthful authenticated screenshots

These are real authenticated fallback captures made with headless Chrome after
login, with no failed requests observed. They prove the uninstalled limitation
only and must never be used as installed Email Marketing visual references.

| Surface | Viewport | Capture |
| --- | --- | --- |
| Authenticated Odoo Discuss fallback; Email Marketing absent | 1440x900 | `/tmp/odoo-email-marketing-uninstalled-desktop.png` |
| Authenticated Odoo Discuss fallback; Email Marketing absent | 390x844, touch/mobile emulation | `/tmp/odoo-email-marketing-uninstalled-mobile.png` |

The captures were checked as PNGs at exactly `1440x900` and `390x844`.
The desktop login landed at `/odoo` and showed Discuss; the mobile login then
navigated to `/odoo/discuss` and showed the compact Discuss surface. A future
installed reference must use a disposable database with `mass_mailing`
installed and demo loading explicitly recorded, navigate from the authenticated
app menu/action, assert the title and records, record failed requests, and save
desktop/mobile pairs under `/tmp`. Images are evidence only and are never
committed.

## Implemented action slice — Optout Reasons (2026-09-10)

The first disjoint installed action slice is Odoo
`mass_mailing.mailing_subscription_optout_action` (action 845, model
`mailing.subscription.optout`, `list,form`). It is exposed in Core3 at
`/email-marketing/email-optout-reasons` with the configuration menu permission
`email_marketing.manage`. The page layout and service API are separate and
joined by `page.id`:

- Layout: `services/email-marketing/pages/optout-reasons.yaml` and
  `services/email-marketing/pages/email-optout-reason-detail.yaml`.
- API: `services/email-marketing/api/optout-reasons.yaml` and
  `services/email-marketing/api/optout-reason-detail.yaml`.
- Fixtures/migration: `services/email-marketing/migrations/20260910250000-003-email-optout-reasons.yaml`.
- Focused contract test: `test/email_marketing_optout_reasons.integration.test.ts`.

The fixed seed date is `2026-01-15`; fixture IDs are stable `email-optout-*`
IDs and the five Odoo reasons are seeded idempotently. The slice covers
permission-bound list/form access, create/update/delete, inline editing,
duplicate/blank/stale/missing guards, search, empty data, and a deterministic
503 transport-error state. The installed Odoo comparison used the disposable
`core3_owned` database with `mass_mailing` installed and demo data loaded.

Evidence for this slice is recorded by the focused test, `bun run audit`, and
the authenticated browser captures listed below. The broader Email Marketing
register remains `planned` until its other actions and shared gates are
implemented.

| Surface | Viewport | Capture |
| --- | --- | --- |
| Authenticated Odoo Optout Reasons | 1440x900 | `/tmp/odoo-email-optout-reasons-authenticated-desktop-final-20260910.png` |
| Authenticated Odoo Optout Reasons | 390x844 | `/tmp/odoo-email-optout-reasons-authenticated-mobile-final-20260910.png` |
| Authenticated Core3 Optout Reasons | 1440x900 | `/tmp/core3-email-optout-reasons-authenticated-desktop-final-20260910.png` |
| Authenticated Core3 Optout Reasons | 390x844 | `/tmp/core3-email-optout-reasons-authenticated-mobile-final-20260910.png` |
| Authenticated Core3 Optout Reason detail | 1440x900 | `/tmp/core3-email-optout-reason-detail-authenticated-desktop-final-20260910.png` |

## Implemented action slice — Mailing List Contacts and Subscriptions (2026-09-10)

The next bounded installed action slice maps Odoo `action_view_mass_mailing_contacts`
and the `mailing.subscription` records exposed from a mailing list. Core3 exposes
the list at `/mailing-contacts`, with the existing mailing-list Subscribers stat
button now routing here with `list_id`. The page and API remain separate and are
joined by `page.id`:

- Layout: `services/email-marketing/pages/mailing-contacts.yaml`.
- API: `services/email-marketing/api/mailing-contacts.yaml`.
- Fixtures/schema: `services/email-marketing/migrations/20260910270000-006-email-mailing-contacts.yaml`
  and `20260910271000-007-email-mailing-contact-demo.yaml`.
- Focused contract test: `test/email_marketing_mailing_contacts.integration.test.ts`.

The fixed seed date remains `2026-01-15`; seven Odoo demo contact names are
stable and subscriptions cover active, opted-out, bounced, blacklisted, and
multi-list cases. The slice covers permission-bound listing and subscription
CRUD, list/contact/reason options, search/list/status filters, add/remove list
membership, unsubscribe/resubscribe workflow, blacklist and inactive guards,
stale row-version rejection, empty results, and deterministic 503 transport
errors. Counts on the selected mailing list are updated transactionally when a
subscription is added or removed. No screenshots are committed; installed
Odoo visual evidence remains limited by the plan's `mass_mailing` uninstalled
database gate unless a disposable installed reference is available.

## Implemented action slice — Mailings (2026-09-11)

This slice covers the installed Odoo `mass_mailing.mailing` action
`mass_mailing.mailing_mailing_action_mail` (action 789), whose live contract is
`list,kanban,form,calendar` with the mail-only domain and the default My
Mailings filter. The disposable personal Odoo 19 database was used because the
original plan database is still uninstalled: Odoo was authenticated as
`codex@core3.local` at `http://localhost:8069`, and Core3 was authenticated as
`admin@tms.local` at the isolated runtime `http://localhost:32615`.

The bounded Core3 implementation keeps the layout and API fragments separate,
joined by page ownership:

- Layout: `services/email-marketing/pages/mailings.yaml` and
  `services/email-marketing/pages/mailing-detail.yaml` (`page.id:
  email-mailings` and `mailing-detail`).
- API: `services/email-marketing/api/mailings.yaml` and
  `services/email-marketing/api/mailing-detail.yaml`.
- Schema/fixtures: migrations `20260911010000-008-email-mailings.yaml` and
  `20260911011000-009-email-mailings-demo.yaml`.
- Focused contract test: `test/email_marketing_mailings.integration.test.ts`.

The fixed seed date is `2026-01-15`, with six stable, idempotent mailing
fixtures covering Draft, In Queue, Sending, Sent, archived/favorite, realistic
recipient models, schedule/sent dates, delivery metrics, mailing lists, body,
and send/test/schedule/cancel/retry/archive/restore/favorite action contracts.
The focused test result is **4 pass, 0 fail, 61 expect() calls**. The follow-up
implementation fix is commit `8ac1ad98`, which binds the detail page basename
correctly and exposes desktop Kanban; the original implementation is
`67b65620`.

### Authenticated visual evidence

All captures were inspected as PNGs. Odoo action route was
`/odoo/action-789` (landing at `/odoo/email-marketing`); Core3 route was
`/email-marketing/email-mailings`. Both desktop captures used `1440x900` and
both mobile captures used `390x844`. Browser target-route request failures were
empty for the final Core3 desktop/mobile checks and the Odoo desktop/mobile
checks. `scrollWidth` equaled the viewport width in all final checks (Core3:
1440/390; Odoo: 1440/390).

| Surface | Viewport | Path | SHA-256 |
| --- | --- | --- | --- |
| Odoo Mailings list | 1440x900 | `/tmp/odoo-email-marketing-mailings-list-desktop-20260911.png` | `767273f28267b6e0f7e39da90602d19a1a073f29030025b5c5d836f18f6e0594` |
| Core3 Mailings list + detail side panel | 1440x900 | `/tmp/core3-email-marketing-mailings-list-desktop-20260911.png` | `f8e4d48d403f12b3055dda23bac474452cd22f68efac053a810d0e5d1929601b` |
| Odoo Mailings Kanban | 1440x900 | `/tmp/odoo-email-marketing-mailings-kanban-desktop-20260911.png` | `6880ca9f4c7ad5e6d501c0c7680634f951f58520eff8b1386f2ccfe34c7a7e6f` |
| Core3 Mailings Kanban | 1440x900 | `/tmp/core3-email-marketing-mailings-kanban-desktop-20260911.png` | `cced3119b4ed5c14bdbfd565207876194f45c3550219a9669f0b53afd7429fe9` |
| Odoo Mailings Calendar | 1440x900 | `/tmp/odoo-email-marketing-mailings-calendar-desktop-20260911.png` | `23b517282e282bcd8e5826b1a9e87621244749272ffbaba592c9a1d2b8984ad2` |
| Core3 Mailings Calendar | 1440x900 | `/tmp/core3-email-marketing-mailings-calendar-desktop-20260911.png` | `78dd324c5ca5e04f5292b7293110149e574ee2bc3373d98ce7f9083b0c310525` |
| Odoo draft mailing form | 1440x900 | `/tmp/odoo-email-marketing-mailings-draft-form-desktop-20260911.png` | `7407a3c329153cc2988c3442094ebe8ec8b79836ca8a225edd02668319f217e1` |
| Core3 draft mailing form | 1440x900 | `/tmp/core3-email-marketing-mailings-draft-form-desktop-20260911.png` | `930fd2ec44e496ab09e49e4fc671e99e445d3145b6c32c4ab223a4e0a2fd749f` |
| Odoo Mailings mobile Kanban | 390x844 | `/tmp/odoo-email-marketing-mailings-list-mobile-20260911.png` | `fdd368e9eacc280f93740c17dccc7c31a24e5b735a0c2a7b3d05c96376244e51` |
| Core3 Mailings mobile Kanban | 390x844 | `/tmp/core3-email-marketing-mailings-list-mobile-20260911.png` | `160a43da38e360768a9269a44dc8e7763429bfb1e56845a8b4ecfe3d9b7afb8c` |
| Odoo mobile Kanban reference | 390x844 | `/tmp/odoo-email-marketing-mailings-kanban-mobile-20260911.png` | `5c9fc4bf627e94124c76cf108f55e92cd35f4d701e9eae9f18c7b5f88f21626e` |
| Odoo draft mailing form | 390x844 | `/tmp/odoo-email-marketing-mailings-draft-form-mobile-20260911.png` | `3cfc1dc077512a291b54d85b3585c50c4ea0657ac99cf59e942423ba9a26965e` |
| Core3 draft mailing form | 390x844 | `/tmp/core3-email-marketing-mailings-draft-form-mobile-20260911.png` | `976af036698490d312d9ec66334e2e4fbd7c39040fad52832e09172f93db83b5` |

Comparison: the Core3 list, Kanban columns, Calendar month, state/statusbar,
exact column labels, draft actions, recipient metrics, and responsive mobile
cards/detail hierarchy match the selected Odoo action contract. Core3 adds the
deterministic five-record fixture set so every workflow state is visible;
Odoo's personal demo has three records and current-relative dates. Residuals
are the expected shell and renderer differences: Core3 uses the Fluent shell
instead of Odoo's purple shell, Core3's mail body is safe metadata/text rather
than Odoo's full HTML builder with Blocks/Style/Design panels, Core3's desktop
form is a side panel while Odoo opens a full form with chatter, and Core3's
calendar is a presentation-only month grid without Odoo's right-side filter
drawer. Chatter/activity, rich HTML builder/preview, and Odoo-specific avatars
remain deferred shared primitives; no horizontal mobile overflow was observed.

## Mass Mailing Analysis action 783

The next bounded slice implements the installed Odoo `mailing_trace_report_action_mail`
(`mailing.trace.report`) action as a separate page/API contract. Core3 exposes the
Odoo-style Graph, Pivot, and List tabs, the `Date: This year` range, mailing/campaign
grouping fields, sent/delivered/opened/replied/clicked measures, status filtering,
pagination, the Odoo empty-state copy, and the `email_marketing.read` permission
boundary. The deterministic report migration seeds five mailings, including the
Odoo-visible `Newsletter 1` category and realistic delivery counters.

During authenticated browser comparison, the first Graph implementation returned
five rows from the API but rendered the empty state because `date_field:
scheduled_date` made the shared graph renderer expand daily date buckets while the
report aggregate was grouped by mailing name. Removing that incompatible date
override keeps the graph category and aggregate keys aligned; Graph, Pivot, and
List now render populated values in both desktop and mobile viewports.

| Capture | Viewport | Evidence | SHA-256 |
| --- | --- | --- | --- |
| Authenticated Odoo Mass Mailing Analysis Graph | 1440x900 | `/tmp/odoo-email-analysis-desktop-1440x900-20260911.png` | `e4fce03ec6658c860066dde719a331769e0f07562b038922c8c2f6b13414497a` |
| Authenticated Core3 Analysis Graph | 1440x900 | `/tmp/core3-email-analysis-desktop-graph-20260911.png` | `769cd21710b65fdd102a2727f6ba96848b1b1dac64c97d227b5b59a3991e53b2` |
| Authenticated Core3 Analysis Pivot | 1440x900 | `/tmp/core3-email-analysis-desktop-pivot-20260911.png` | `03f6e98ff151e91b2eb9d63506adfe3790dbad26f536850cc3f39b236f8e7c1a` |
| Authenticated Core3 Analysis List | 1440x900 | `/tmp/core3-email-analysis-desktop-list-20260911.png` | `251159d3c76d5417dd146d6e3851d15731f6461c1a8f9bfeabd129831ff7fcb1` |
| Authenticated Core3 Analysis Graph | 390x844 | `/tmp/core3-email-analysis-mobile-graph-20260911.png` | `4bcfdbe0da92c41ceaa1c1b83198fefb15d03ddd581be7d0784052895a02b8ee` |
| Authenticated Core3 Analysis Pivot | 390x844 | `/tmp/core3-email-analysis-mobile-pivot-20260911.png` | `ae47872cc5f53c6c73d8a05a827e7472da2f4f41a591010a3779896f07530c8f` |
| Authenticated Core3 Analysis List | 390x844 | `/tmp/core3-email-analysis-mobile-list-20260911.png` | `5e8f97e97ea2fe31ede4e2769c4d3eed5a22251f1cc16c4162c668065ed0b881` |

The authenticated checks had no failed requests, page errors, or horizontal
overflow. Remaining differences are the expected Core3 Fluent shell and shared
renderer styling versus Odoo's purple shell and graph toolbar; rich Odoo report
customization, saved filters, and technical trace drill-down remain separate
actions. Captures stay under `/tmp` and are not committed.

Images remain under `/tmp` and are not committed. The Email Marketing register
status remains `planned`; this slice does not claim completion of the other
actions or the shared gates.

## Implemented action slice — Opt-Out Report (2026-09-11)

The fresh authenticated reference database was verified before implementation:
`mass_mailing` is `installed`, `application: true`, `latest_version:
19.0.2.7`, and `demo: true` in `core3_codex_demo` at `http://localhost:8069`.
The complete installed Email Marketing menu tree was queried as
`codex@core3.local`: Mailings; Mailing Lists → Mailing Lists and Mailing List
Contacts; Campaigns; Reporting → Mass Mailing Analysis and **Opt-Out Report**;
and Configuration → Settings, Campaign Stages, Campaign Tags, Link Tracker,
Blacklisted Email Addresses, Optout Reasons, and Favorite Filters. Technical
Settings → Mass Mailing → Mailing Traces remains outside the ordinary menu.

The one uncovered action selected from that comparison is Odoo's
`mass_mailing.mailing_subscription_action_report_optout` (database action
**483**, menu `mailing_menu_report_subscribe_reason`). Its model is
`mailing.subscription`, domain `opt_out = True`, context default group-by
`opt_out_reason_id`, and modes `graph,pivot,list,form`. Source XML is
`/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_subscription_views.xml`:
the graph is a pie distribution, the pivot groups by unsubscription week and
mailing list, the list is read-only (`create="0"`) with subscription date,
contact, blacklist, list, unsubscription date, reason, and bounce columns, and
the search view provides contact/list/reason/date filters and groupings.

Core3 implements only this report action and keeps the page/API boundary:

- Layout: `services/email-marketing/pages/opt-out-report.yaml` and the
  read-only `opt-out-report-detail.yaml`.
- API: `services/email-marketing/api/opt-out-report.yaml` and
  `opt-out-report-detail.yaml`, joined to the layouts by `page.id`.
- Menu: Reporting → Opt-Out Report at `/email-opt-out-report`, protected by
  `email_marketing.read`; no create/update/delete actions are exposed.
- Modes: default pie Graph, Pivot, List, and read-only Form inspection, with
  Reason/list/contact filters, unsubscription date range, grouping, pager,
  empty state, stable 401/403/404/503 states, and row-version-bearing records.
- Fixture/migration: `migrations/20260911150000-012-email-opt-out-report-demo.yaml`
  adds a stable imported opt-out record and normalizes the deterministic demo
  reason/date/list data. Four opt-outs span two lists and three Odoo reasons,
  including the blacklisted Elsa Ericson row; non-opted-out subscriptions are
  excluded by the report domain. Re-running migrations is idempotent.
- Focused contract: `test/email_marketing_opt_out_report.integration.test.ts`
  covers discovery, page/API separation, modes, filters, deterministic
  ordering, opt-out-only filtering, empty results, read-only action boundary,
  and 401/403/503 errors. The shared `GraphView` pie primitive and isolated
  test were added because the existing renderer exposed only bar/line controls.

Validation in the dedicated worktree:

- Focused report test: **3 pass, 39 expect() calls**.
- GraphView primitive test: **3 pass**.
- `bun run audit`: **490 pages, 497 routes, 857 datasources**, passed.
- ESLint, global and Email Marketing CSS builds, and `git diff --check`
  passed.

Authenticated Odoo and Core3 browser checks used populated states at exact
`1440x900` and `390x844` viewports. Every final target check recorded
`requestfailed: []`, `pageerror: []`, and body/document `scrollWidth` equal to
the viewport. Captures were visually inspected and remain under `/tmp` only:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Opt-Out Report graph | 1440x900 | `/tmp/odoo-email-optout-report-desktop-1440x900-20260911.png` | `5e9196b1adc3e3f25cd9331107806b174cd528f3d4bae03538ba023db4ee6937` |
| Odoo Opt-Out Report graph | 390x844 | `/tmp/odoo-email-optout-report-mobile-390x844-20260911.png` | `d5b7393b4cac3ef2cf846cd77f6f6deec07a55dedc633c922706cebc5a026515` |
| Odoo Opt-Out Report list | 1440x900 | `/tmp/odoo-email-optout-report-list-desktop-1440x900-20260911.png` | `5a7603d1ca82870f803e15299d0f4a05d07a21b25f758b8edb68a8b6125d0ba4` |
| Odoo related opt-out form | 1440x900 | `/tmp/odoo-email-optout-report-form-desktop-1440x900-20260911.png` | `a7b013134402a47f1e9d7832b26a5c178368031132160796b112563c07c39bb9` |
| Core3 Opt-Out Report graph | 1440x900 | `/tmp/core3-email-optout-report-desktop-1440x900-20260911.png` | `25436a687978fddf0527267bbe000b99bfdeb9f9519174f9a39037d681aad43b` |
| Core3 Opt-Out Report graph | 390x844 | `/tmp/core3-email-optout-report-mobile-390x844-20260911.png` | `7f98ca02c74d7a59c4eb047a7219d77e536116c6a41e6e2941f9fb1e67ff5365` |
| Core3 Opt-Out Report list | 1440x900 | `/tmp/core3-email-optout-report-list-desktop-1440x900-20260911.png` | `9a37474b8a26fc8450a2de7a245373f49cd98e909281979bbcb3a7197adfc1d9` |
| Core3 Opt-Out Report list | 390x844 | `/tmp/core3-email-optout-report-list-mobile-390x844-20260911.png` | `5c6f018b5b91e081b993b71392d0149d98ba407a473fd4667a35fe1e300c79bd` |
| Core3 read-only subscription detail | 1440x900 | `/tmp/core3-email-optout-report-detail-desktop-1440x900-20260911.png` | `5aaffc9915b516624b0f630557b5b49c3621568dc7927b0cbf1c85e3ea039961` |
| Core3 read-only subscription detail | 390x844 | `/tmp/core3-email-optout-report-detail-direct-mobile-390x844-20260911.png` | `d6e942c540cebaf797860e5f3329b5669ccd1ba6edbe5aed20b7a844bdeddb36` |

The fresh Odoo demo had two visible opt-out groups while Core3 deliberately
uses four deterministic rows to exercise two lists, three reasons, and the
blacklisted state. Residual visual differences are the shared Fluent shell
versus Odoo's purple shell, Core3's read-only subscription detail versus
Odoo's related mailing-contact form/chatter, and renderer-level filter/tool
styling. The Odoo mobile shell hides view switches naturally; the Core3 mobile
graph/list/detail routes were checked directly. Mail-trace drill-down,
contact/chatter mutations, and the other Email Marketing actions remain
separate slices.

## Source menu, action, view, and route inventory

The source-defined visible menu tree is:

- **Email Marketing** (`mass_mailing_menu_root`,
  `mass_mailing.group_mass_mailing_user`)
  - **Mailings** (`mass_mailing_menu` ->
    `mailing_mailing_action_mail`)
  - **Mailing Lists** (`mass_mailing_mailing_list_menu`)
    - **Mailing Lists** (`menu_email_mass_mailing_lists` ->
      `action_view_mass_mailing_lists`)
    - **Mailing List Contacts** (`menu_email_mass_mailing_contacts` ->
      `action_view_mass_mailing_contacts`)
  - **Campaigns** (`menu_email_campaigns` -> `action_view_utm_campaigns`,
    `mass_mailing.group_mass_mailing_campaign`)
  - **Reporting** (`menu_mass_mailing_report`)
    - **Mass Mailing Analysis** (`mailing_menu_report_mailing` ->
      `mailing_trace_report_action_mail`)
    - **Opt-Out Report** (`mailing_menu_report_subscribe_reason` ->
      `mailing_subscription_action_report_optout`)
  - **Configuration** (`mass_mailing_configuration`)
    - **Settings** (`menu_mass_mailing_global_settings` ->
      `action_mass_mailing_configuration`, `base.group_system`)
    - **Campaign Stages** (`menu_view_mass_mailing_stages` ->
      `utm.action_view_utm_stage`, campaign manager)
    - **Tags** (`mass_mailing_tag_menu` -> `utm.action_view_utm_tag`, campaign
      manager)
    - **Link Tracker** (`link_tracker_menu_mass_mailing` ->
      `link_tracker.link_tracker_action`)
    - **Blacklisted Email Addresses** (`mail_blacklist_mm_menu` ->
      `mail.mail_blacklist_action`)
    - **Optout Reasons** (`mailing_subscription_optout_menu` ->
      `mailing_subscription_optout_action`)
    - **Favorite Filters** (`mailing_filter_menu_action` ->
      `mailing_filter_action`)
- Technical `base.menu_custom` -> **Mass Mailing** -> **Mailing Traces**
  (`mailing_mailing_menu_technical`, `menu_email_statistics` ->
  `mailing_trace_action`); document it but keep it out of the ordinary user
  menu.

Action/view contract (including embedded and wizard actions) is:

| Action/model | Source action or view | Modes / required behavior |
| --- | --- | --- |
| `mailing.mailing` | `mailing_mailing_action_mail` | `list,kanban,form,calendar`; mail-only domain, default non-failed filter, create and full-width list/kanban/calendar variants |
| `mailing.mailing` | `action_view_mass_mailings_from_campaign` | `kanban,list,form,calendar`; campaign-scoped |
| `mailing.mailing` | `action_create_mass_mailings_from_campaign` | `form,kanban,list`; campaign default |
| `mailing.mailing` | `action_ab_testing_open_winner_mailing` | `form`; winner/A-B-test context |
| `mailing.list` | `action_view_mass_mailing_lists` | `kanban,list,form`; list cards, contacts/mailings/bounce/opt-out/blacklist stat buttons |
| `mailing.contact` | `action_view_mass_mailing_contacts` | `list,kanban,form,graph,pivot`; default not-blacklisted filter |
| `utm.campaign` | `action_view_utm_campaigns` | `kanban,list,form`; mailings and duplicate actions |
| `mailing.trace.report` | `mailing_trace_report_action_mail` | `graph,pivot,list`; trace measures and grouping |
| `mailing.subscription` | `mailing_subscription_action_report_optout` | `graph,pivot,list,form`; opt-out domain |
| `mailing.trace` | `mailing_trace_action` | `list,form,graph,pivot`; technical traces |
| `mailing.trace` | `action_view_mail_mail_statistics_mailing` | `graph,list,form,pivot`; mailing-scoped statistics |
| `mailing.subscription.optout` | `mailing_subscription_optout_action` | `list,form`; reason CRUD |
| `mailing.filter` | `mailing_filter_action` | `list,form`; saved/favorite filter CRUD |
| `res.config.settings` | `action_mass_mailing_configuration` | `form`; module `mass_mailing`, system-only, outgoing server link |
| `mailing.mailing.schedule.date` | `mailing_mailing_schedule_date_action` | `form`; schedule date validation and save |
| `mailing.mailing.test` | `action_mail_mass_mailing_test` | `form`; send test validation |
| `mailing.contact.import` | `mailing_contact_import_action` | `form`; open base import and import |
| `mailing.contact.to.list` | `mailing_contact_to_list_action` | `form`; Add and Add and Send Mailing |
| `mailing.list.merge` | `mailing_list_merge_action` | `form`; merge confirmation/result |
| inherited `link.tracker` / clicks | linked tracker actions/views | list/form/graph as provided by `link_tracker`, with mailing statistics |
| inherited `utm.stage` / `utm.tag` | referenced UTM actions | list/form/kanban as supplied by `utm`; preserve scoped permissions |

Every visible form must include its source controls, not just fields: mailing
send/schedule/duplicate/test/cancel/retry, favorite, archive/restore, A/B
compare/winner, recipient/stat buttons (cancelled/scheduled/processing/sent/
failed/opened/replied/clicked/delivered/bounced), link trackers and contact
actions; list import/send/stat actions; contact import/add-to-list/blacklist
remove; campaign mailing and duplicate actions; wizard confirmation/error
states; and chatter/activity/follower/attachment integrations inherited from
`mail`. Include search fields, filters, group-by, favorites, optional columns,
bulk actions, pager, row open, and all view switches for each applicable action.

Record-level route/view decisions for Core3 must be explicit. Use stable
routes such as `/email-campaigns`, `/email-campaigns/:id`, `/mailing-lists`,
`/mailing-lists/:id`, `/mailing-contacts`, `/mailing-contacts/:id`,
`/email-campaigns/analysis`, `/email-campaigns/opt-outs`, `/email-traces`,
`/email-settings`, `/email-campaign-stages`, `/email-tags`, `/email-link-
trackers`, `/email-blacklist`, `/email-optout-reasons`, and
`/email-favorite-filters`. Preserve the existing `/email-campaigns`,
`/mailing-lists`, and `/email-analysis` aliases. Each route must declare its
default view mode, all switchable modes, action/query parameters, and
permission.

The separate Odoo HTTP/controller surface in `controllers/main.py` and
`controllers/legacy.py` must not be silently folded into desktop menus:

- authenticated `/mailing/my` subscription management;
- public tokenized `/mailing/<mailing_id>/unsubscribe`,
  `/unsubscribe_oneclick`, `/confirm_unsubscribe` and POST
  `/mailing/confirm_unsubscribe`, plus legacy
  `/mail/mailing/<mailing_id>/unsubscribe`;
- public JSON-RPC `/mailing/list/update`, `/mailing/feedback`,
  `/mailing/blocklist/add`, `/mailing/blocklist/remove`;
- public `/mailing/<mailing_id>/view`, `/view`, `/mailing/report/unsubscribe`,
  `/mail/track/<mail_id>/<token>/blank.gif`, and `/r/<code>/m/<trace_id>`;
- authenticated `/mailing/mobile/preview`.

Implement or explicitly defer each as a separately permissioned portal/public
contract. Token validation must produce stable bad-request/unauthorized/
not-found behavior without leaking mailing IDs. The mail HTML builder and
iframe/theme/snippet surfaces are an explicit architecture item: preserve
editable HTML, preview, mobile preview, templates/snippets, link conversion,
tracking pixels and unsubscribe placeholders; do not replace them with a plain
text field.

## Existing Core3 surface and gap

`sdk/bun/sample/services/email-marketing` currently contains `manifest.yaml`,
`permissions.yaml`, `storage.yaml`, two migrations, `email-workflow.yaml`, and
pages `campaigns.yaml`, `campaign-detail.yaml`, `lists.yaml`, and `analysis.yaml`.
It has DuckDB/Postgres-compatible `mailing_lists` and `email_campaigns` tables,
one synthetic list/campaign, Draft/Scheduled/Sending/Sent/Cancelled workflow,
campaign list/detail, mailing-list list/create, and a five-stat analysis/chart.
Its pages own datasource SQL and there is no `services/email-marketing/api/`
directory. It does not yet cover contacts/subscriptions/opt-outs/blacklist,
campaign UTM stages/tags, link trackers, trace/report models, settings,
wizards, HTML builder/preview, A/B testing, mail/chatter/activity/attachments,
portal routes, technical traces, or the source permissions.

## Required shared primitives

Reuse and verify generic contracts before creating Email Marketing-specific
renderers:

- Odoo `ListView`, responsive card/`KanbanView`, `FormView`/`OdooFormView`,
  `CalendarView`, `GraphView`/`Chart`, `PivotView`, search/filter/group-by,
  saved views/favorites, optional columns, pager, bulk actions and row menus;
- statusbar/status chips, stat buttons, many2one/many2many tags, avatars,
  HTML rich editor, safe iframe/mobile preview, snippet/theme picker, file and
  image attachments, link-tracker fields, UTM campaign/stage/tag controls,
  recipient domain/filter builder, A/B comparison, scheduling dialog, and
  chatter/activity/follower panels;
- permission-aware action menus, import/merge/test wizards, validation and
  confirmation dialogs, loading/empty/error states, stable 401/403/404/409/422
  responses, responsive action menus, and content-only mobile scrolling;
- `SettingsView` with the established full-width Odoo settings layout.

If any primitive is absent, record its generic API and test it in isolation
before adding an Email Marketing-specific replacement.

## Deterministic Core3 datasource/API/mock contract

Frontend page YAML must become layout-only. Add convention-discovered,
service-owned `services/email-marketing/api/*.yaml` fragments keyed by
`page.id`; do not add them to an explicit frontend `pages:` manifest. Use
declared service operations for contacts, partners, users, companies, mail,
activities, attachments, UTM, link tracking, portals and reports. Every list,
form, kanban, calendar, graph, pivot, wizard, preview, settings, portal,
loading, empty and error state must declare stable `mock_data` until a real
query exists. No page-local records, random IDs, current-time SQL, browser
fixtures, remote assets, or live Odoo calls.

Use seed date `2026-01-15`, stable IDs/order and idempotent migrations. Fixture
coverage must include:

- Newsletter 1 / Monthly Newsletter, draft/scheduled/sending/done/cancelled
  mailings, archived/active/favorite records, failed and retriable recipients,
  A/B siblings/winner, sender/reply-to, recipient model/domain, HTML body,
  tracking links, attachment and mobile/desktop preview;
- mailing lists Customers, Imported Contacts and an empty list; public/private
  lists; contacts Aristide Antario, Beverly Bridge, Carol Cartridge, David
  Dawson, Elsa Ericson (bounce and blacklist), Franz Faubourg, Gilbert Gilson;
  active/opt-out/invalid/bounced subscriptions and opt-out reasons;
- traces with sent/open/click/reply/delivered/bounce/error/cancelled states,
  deterministic sent/open/reply dates and link clicks; trace report totals,
  pivot/graph groupings, no-data and failed-delivery records;
- campaigns, stages, tags, link trackers, favorite filters, outgoing-server
  availability, settings values, attachments, activities, followers and
  chatter; HTML editor snippets/themes represented as deterministic metadata,
  with safe content fixtures rather than copied proprietary assets;
- Email Marketing User, Campaign Manager, system settings user, multi-company
  user, denied user, portal user and public token scenarios;
- empty collections and loading/server-error/missing-record/stale-row-version
  responses for every route and mode.

Required operations include mailing/list/contact/subscription/opt-out/
blacklist/campaign/stage/tag/filter/tracker/trace CRUD; send, test, schedule,
queue, cancel, retry, duplicate, favorite/archive/restore, A/B compare/select
winner; contact import/add/merge; report/export; settings save; preview and
mobile preview; activity/chatter/follower/attachment actions; and tokenized
subscribe/unsubscribe/blocklist/feedback operations. Guards must enforce
required sender/subject/body/audience fields, valid email/token, list and
company scope, send state transitions, immutable sent records, uniqueness,
row versions, mail-server availability, blacklist/opt-out rules, safe HTML,
and stable 401/403/404/409/422 results.

## Six register gates and status

1. **Addon/version/demo contract — evidenced.** Manifest, dependencies, data,
   demo files, source revision, and the fixed-date translation requirement are
   recorded above.
2. **Complete menu/action/view inventory — source-evidenced, live-unverified.**
   The source tree and embedded/wizard/technical actions are inventoried above,
   but the installed authenticated menu cannot be inspected because the addon
   is uninstalled.
3. **Authenticated desktop/mobile route and screenshot evidence — blocked.**
   Only truthful authenticated Discuss fallback captures exist at the required
   dimensions; installed Email Marketing routes and modes are unavailable.
4. **Deterministic datasource/mock-data contract — planned, not implemented.**
   The required contract is specified above, but the current page-local SQL and
   synthetic two-table fixtures are not parity evidence.
5. **Shared primitives — planned, reuse evidence missing.** Required generic
   contracts are recorded, but no focused primitive verification has been run.
6. **Visual, fixture, permission, empty/error/mobile acceptance — planned.**
   Acceptance is specified below, but Core3 implementation and authenticated
   browser evidence do not exist.

Therefore the status remains `planned`, not `ready`. It must not change to
`ready` until gates 2–6 have implementation evidence and an installed Odoo
desktop/mobile reference has been captured. If the addon remains unavailable,
retain this exact limitation and status.

## Acceptance and focused validation

- An installed-reference audit, when possible, navigates through every visible
  menu/action from the authenticated app menu, asserts title/records/view mode,
  records no failed requests, and saves the required `/tmp` desktop/mobile
  captures. No image is committed.
- Authenticated Core3 browser checks cover every mapped route, list/kanban/form/
  calendar/graph/pivot mode, search/filter/group/favorite/optional-column/
  pagination/bulk/row actions, HTML/mobile preview, dialogs, and mobile action
  menus at `1440x900` and `390x844`; mobile has no horizontal page overflow and
  only content scrolls.
- Forms cover create/edit/archive/restore/delete, duplicate, send/test/schedule/
  queue/cancel/retry, A/B winner, list/contact import/add/merge, subscriptions,
  blacklist/opt-out, links, reports, settings save, chatter/activity/
  attachments, preview, stale/conflict and mail-server validation.
- Permission checks prove ordinary User versus Campaign Manager versus system
  settings access, technical traces hidden from ordinary users, multi-company
  isolation, portal/public token boundaries, and stable 401/403/404/409/422.
- Datasource checks prove API discovery by `page.id`, no page-local data,
  deterministic IDs/dates/order, idempotent fresh install and upgrade, fixed
  demo-on/off behavior, and replacement-ready service queries.
- Run focused YAML/schema/API validation, authenticated desktop/mobile browser
  smoke and visual checks, `bun run audit` and `bun run audit:yaml` where
  applicable, then `git diff --check`. Action slices must commit only code and
  docs; screenshots remain under `/tmp`.
