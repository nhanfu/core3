# Odoo 19 UI parity - SMS Marketing

## Bounded action: SMS Marketing / Mailing Lists (wave 2)

This wave implements the next concrete Odoo menu/action entry beyond the SMS
mailings slice: `SMS Marketing` (`mass_mailing_sms_menu_root`, sequence 120) →
`Mailing Lists` (`mass_mailing_sms_menu_contacts`, sequence 2) → `Mailing
Lists` (`mailing_list_menu_sms`, sequence 1, action
`mailing_list_action_sms`). The source action is `mailing.list`, has context
`{'mailing_sms': True}`, and orders its views `kanban,list,form`.

Source evidence was read from `/home/nhanjs/projects/odoo/addons/mass_mailing_sms`:
`views/mailing_sms_menus.xml` defines the menu hierarchy and permissions;
`views/mailing_list_views.xml` inherits the base mailing-list kanban/form,
adds SMS contact counts and a `Send SMS` form button, and declares the action;
the inherited base view in
`/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_list_views.xml`
defines the list columns (`name`, public, mailings, bounce, opt-out, blacklist,
recipients), kanban responsive layout, and the empty-state copy.

Core3 maps that contract to `pages/lists.yaml` + `api/lists.yaml`, joined by
`page.id: sms-lists`, and `pages/list-detail.yaml` + `api/list-detail.yaml`,
joined by `page.id: sms-list-detail`. The list page preserves Odoo's
`kanban,list,form` order, responsive kanban cards, search, active/archive
filter, Odoo list metrics, empty state, and row navigation. The detail page
preserves the editable list form and `Send SMS` action; the latter routes to
the existing SMS mailing action with list context. No Odoo frontend code is
copied.

The migration `20260912153000-004-sms-mailing-lists.yaml` adds deterministic
SMS audience metrics and two additional realistic lists, with idempotent
fixtures and fixed values. Reads use `sms_marketing.read`; create, edit, and
Send SMS use `sms_marketing.write`; duplicate names, missing records, stale
row versions, empty fixtures, and transport failures have explicit contracts.

## Bounded action: SMS Marketing mailings

Source: local Odoo 19 addon `/home/nhanjs/projects/odoo/addons/mass_mailing_sms`
(`mass_mailing_sms/__manifest__.py`, version 1.1, application addon, demo data
provided). This batch implements the `mailing_mailing_action_sms` window action
and its list/form entry point only; contacts, trace reporting, blacklist, link
tracker, and campaign menus remain separate actions.

### Odoo source inventory

The visible tree is **SMS Marketing** (`mass_mailing_sms_menu_root`, sequence
120, `mass_mailing.group_mass_mailing_user`) → **SMS Marketing**
(`mass_mailing_sms_menu_mass_sms`, sequence 1, action
`mailing_mailing_action_sms`). The action is restricted to SMS mailings with
domain `[('mailing_type', '=', 'sms')]`, defaults `user_id`, `mailing_type: sms`,
and `mailing_sms: true`, and enables the modes `list,kanban,form,calendar,graph`.
The list and kanban views are explicitly sequenced first and second. The
search view renames the inherited assigned-to-me filter to **My SMS Marketing**.

The SMS list source view (`mailing_mailing_view_tree_sms`) renders **Date**,
**Title**, optional **Recipients**, **Sent**, **Clicked (%)**, optional
**Bounced (%)**, and status badge; campaign and A/B Test columns are visible
only to `mass_mailing.group_mass_mailing_campaign`. Draft and queued rows use
the info decoration and sending/done rows use the success decoration.

The SMS form inherits the mass-mailing form. SMS-only fields are **Title**,
the **SMS Content** notebook page using `body_plaintext`/`sms_widget`, and
**Options** containing `sms_allow_unsubscribe`; the content is readonly in
`sending`/`done`. Header actions are Send/Send Now according to
`mailing_type`, `state`, `schedule_type`, and `sms_force_send`. The SMS form
also exposes credit/account warning states. This Core3 slice preserves the
visible Title, SMS Content, Settings/Options, statusbar, Send, Schedule, and
Cancel states; provider credit setup and SMS test wizard are deferred.

### Core3 contract

Frontend layouts are `services/sms-marketing/pages/campaigns.yaml` and
`pages/campaign-detail.yaml`; backend datasources/actions are
`api/campaigns.yaml` and `api/campaign-detail.yaml`, joined by matching
`page.id`. The fixture migration `20260912150000-003-sms-mailing-action.yaml`
uses fixed 2026-09-12 timestamps and idempotent inserts. It covers Draft,
In Queue, Sent, search, empty/not-found fixture state, create, edit, schedule,
send, cancel, validation, and optimistic stale-row handling.

Permissions are `sms_marketing.read` for reads, `sms_marketing.write` for
create/edit/workflow entry points, and `sms_marketing.manage` for the existing
workflow completion boundary. Transport failures are explicit 503 contracts;
missing details are explicit 404 contracts.

### Acceptance and evidence

- Menu label/order, route, page IDs, API separation, and all five text view tabs
  pass the focused integration contract.
- Normal, empty, validation, stale, and CRUD tests pass against an in-memory
  DuckDB with migrations applied twice.
- The shared UI audit passes. CSS compilation passes for SMS Marketing.
- Authenticated Odoo/Core3 desktop and mobile captures are required at
  1440x900 and 390x844 under `/tmp/core3-odoo-parity/sms-marketing-batch-20260912/`.
  If either runtime is unavailable, record the exact limitation here and do not
  claim visual parity.

## Runtime evidence

Focused runtime checks passed after aligning the existing SMS workflow Cancel
transition with its visible `sms_marketing.write` action permission (the
catalog previously rejected the mismatch before loading any page). Core3
started with `bun run dev --db=ddb --memory`, backend 3001, frontend 3002, and
event mediator 3010. The browser fallback used a temporary Playwright install
because the prescribed `js_repl` tool is not exposed in this session.

The required authenticated browser pass remains blocked. At 1440x900 and
390x844, Core3 redirected to `/auth/login`, but `/services/auth/styles/index.css`
returned `401 Unauthorized`, leaving the login form outlet empty; therefore no
Core3 login or route assertion was possible. Odoo was reachable at both
`http://127.0.0.1:8069` and `http://127.0.0.1:8073`, but the attempted
`admin`/`admin` login remained on `/web/login` and did not authenticate. The
attempt images are under
`/tmp/core3-odoo-parity/sms-marketing-batch-20260912/` for all requested
desktop/mobile dimensions, but they are unauthenticated diagnostics only.
This batch makes no visual-parity claim and no images are added to Git.

## Bounded action: SMS Marketing / Mailing List Contacts (wave 3)

The next source menu/action after Mailing Lists is `SMS Marketing` → `Mailing
Lists` → `Mailing List Contacts` (`mailing_contact_menu_sms` →
`mailing_contact_action_sms`). The Odoo action is `mailing.contact`, ordered
`list,form`, with context `mailing_sms: true` and the default
`filter_not_phone_bl`. Its inherited list shows the base mailing-contact
fields plus readonly **Mobile** and phone-blacklist state; the search adds
**Valid SMS Recipients** and **Exclude Blacklisted Phone**. The form adds a
mobile phone row with SMS-enabled phone interaction, and the kanban adds mobile
under the contact identity. This contract was traced from
`/home/nhanjs/projects/odoo/addons/mass_mailing_sms/views/mailing_contact_views.xml`;
no Odoo frontend code is copied.

Core3 implements the visible slice in `services/sms-marketing/pages/mailing-contacts.yaml`
and `api/mailing-contacts.yaml`, joined by `page.id: sms-mailing-contacts`,
with `sms_contacts` and `sms_subscriptions` deterministic fixtures. Reads use
`sms_marketing.read`; add/edit/subscribe/unsubscribe use
`sms_marketing.write`. Duplicate subscriptions, inactive/missing contacts,
blacklisted phones, stale rows, empty results, and transport failures have
explicit contracts. The focused integration test is
`sms_marketing_contacts.integration.test.ts`.

Authenticated Odoo/Core3 screenshots at 1440x900 and 390x844 are required
under `/tmp/core3-odoo-parity/sms-marketing-wave3-20260912/`. If authentication
or runtime startup is blocked, record the exact blocker here and make no
visual-parity claim.

## Bounded action: SMS Marketing / Reporting (wave 4)

The next source menu/action is `SMS Marketing` → `Reporting` → `SMS Marketing
Analysis` (`mass_mailing_sms_menu_reporting` → `mailing_trace_report_action_sms`).
Odoo defines the action on `mailing.trace.report` with `graph,pivot,list` modes,
the SMS domain, and primary graph/pivot/list views. Its SMS view removes the
email-only Opened and Replied measures while retaining Scheduled, Processing,
Pending, Sent, Delivered, Clicked, Bounced, Error, and Canceled metrics. Source
evidence is `/home/nhanjs/projects/odoo/addons/mass_mailing_sms/report/mailing_trace_report_views.xml`.

Core3 implements this visible read-only slice in `pages/analysis.yaml` and
`api/analysis.yaml`, joined by `page.id: sms-analysis`. Migration
`20260912170000-006-sms-trace-report.yaml` creates the report table and
`20260912171000-007-sms-trace-report-demo.yaml` adds fixed, idempotent report
fixtures for sent, queued, and draft SMS mailings. The API uses
`sms_marketing.read` and explicitly covers unauthorized, forbidden, transport,
empty, search, status, and date-range states. There are no write actions for
this Odoo read-only report.

Focused coverage is `sms_marketing_analysis.integration.test.ts`; it verifies
the menu/page/API contract, migration idempotence, deterministic rows, filters,
empty state, and read-only permission boundary. No authenticated screenshots
are claimed in this wave because no browser rendering was performed.
