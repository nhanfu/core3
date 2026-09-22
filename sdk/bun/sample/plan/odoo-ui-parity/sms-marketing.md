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

## Bounded action: SMS delivery traces and retry failed

Source-backed gap selected for this wave: the existing campaign form did not
expose Odoo's `Retry` behavior for failed SMS recipients, and Core3 had no
durable per-recipient trace list/form. Odoo 19 implements
`mailing.mailing.action_retry_failed_sms` in
`/home/nhanjs/projects/odoo/addons/mass_mailing_sms/models/mailing_mailing.py`:
it removes failed `sms.sms` records and their traces, then calls
`action_put_in_queue`. The SMS trace views in
`mass_mailing_sms/views/mailing_trace_views.xml` are readonly list/form views
with recipient number, sent/click dates, status, failure type, and mailing
fields. This bounded Core3 mapping persists equivalent retry state instead of
deleting audit rows: failed attempts become `pending`, their attempt number
increments, and the mailing returns to `In Queue` under a row-version guard.

Core3 paths are `pages/delivery-traces.yaml` + `api/delivery-traces.yaml`,
`pages/delivery-trace-detail.yaml` + `api/delivery-trace-detail.yaml`, joined
by `page.id`, with the campaign action in
`api/campaign-detail.yaml` and the visible `Retry`/`View Traces` actions in
`pages/sms-campaign-detail.yaml`. Durable state is
`sms_delivery_attempts`, created by migrations
`20260921100000-009-sms-delivery-retry.yaml` and
`20260921101000-010-sms-delivery-retry-demo.yaml`. Reads require
`sms_marketing.read`; retry requires `sms_marketing.write`; missing, forbidden,
transport, wrong-company, invalid-state, and stale-row contracts are explicit.

The focused test is `sms_marketing_delivery_retry.integration.test.ts`. It
covers Odoo source mapping, page/API separation, trace filters and empty state,
idempotent migration replay, failed-attempt retry, invalid/stale/state/company
guards, and file-backed restart persistence. Provider callback ingestion and
Temporal delivery execution remain a separate future bounded feature; this
slice does not claim external-provider parity.

## Bounded action: SMS Marketing / Configuration / Blacklisted Phone Numbers

The next uncovered configuration action is `SMS Marketing` → `Configuration` →
`Blacklisted Phone Numbers` (`mass_mailing_sms_menu_configuration` →
`phone_blacklist_menu` → `phone_validation.phone_blacklist_action`). The menu
is declared in `/home/nhanjs/projects/odoo/addons/mass_mailing_sms/views/mailing_sms_menus.xml`;
the action and list/form/search contract come from
`/home/nhanjs/projects/odoo/addons/phone_validation/views/phone_blacklist_views.xml`.
Odoo exposes `Blacklist` and `Unblacklist` form actions, an `Archived` search
filter, a `Blacklist Date` column, and the empty-state copy “Add a phone number
in the blacklist” / “Blacklisted phone numbers won't receive SMS Mailings
anymore.” The unblacklist action is a confirmation wizard with an optional
reason, and the model sanitizes numbers, preserves inactive records, and
reactivates an existing number when added again.

Core3 maps this contract to `pages/phone-blacklist.yaml` +
`api/phone-blacklist.yaml`, and `pages/phone-blacklist-detail.yaml` +
`api/phone-blacklist-detail.yaml`, joined by matching `page.id`. Durable state
is `sms_phone_blacklist`, created by migrations
`20260922100000-011-sms-phone-blacklist.yaml` and
`20260922101000-012-sms-phone-blacklist-demo.yaml`. The bounded mapping stores
the optional unblacklist reason as an audit field, normalizes E.164-style input,
and preserves inactive rows instead of deleting them. Reads and configuration
mutations require `sms_marketing.manage`; invalid numbers, duplicate numbers,
missing rows, stale versions, state changes, empty results, and transport
failures have explicit contracts.

Focused coverage is `sms_marketing_phone_blacklist.integration.test.ts`; it
verifies Odoo menu/source mapping, page/API separation, deterministic active and
archived reads, normalization, CRUD, state guards, migration replay, and the
manager-only permission boundary. The authenticated Odoo reference currently
exposes SMS Marketing only as an installable Apps entry; `mass_mailing_sms` is
not installed in `core3_reference`, so its SMS configuration menu/action cannot
be opened and no paired Odoo screen claim is made.

## Bounded action: SMS Marketing / Configuration / Link Tracker (wave 5)

Stable ID: `SMS-LINK-TRACKER-001`.

The next uncovered SMS Marketing menu action after Blacklisted Phone Numbers is
`SMS Marketing` → `Configuration` → `Link Tracker` (`link_tracker_menu_main` is
re-parented by `mailing_sms_menus.xml` to the SMS Configuration menu and
uses `link_tracker.link_tracker_action`). Odoo's Link Tracker addon defines the
action in `/home/nhanjs/projects/odoo/addons/link_tracker/views/link_tracker_views.xml`
with `list,form,graph` modes. The list exposes Create Date, Link Tracker, Page
Title, Target URL, Button label, click count, and optional Campaign/Medium/Source
columns. The form is `Website Link`, groups Target Link and UTM fields, and has
`Visit Page` plus `Clicks` stat actions. Odoo validates target URLs and prevents
duplicate URL/UTM/label combinations; tracked URLs use generated short codes.

Core3 maps this action to `services/sms-marketing/pages/link-trackers.yaml` plus
`api/link-trackers.yaml`, and the detail form to
`pages/link-tracker-detail.yaml` plus `api/link-tracker-detail.yaml`, joined by
`page.id`. Migration `20260922120000-013-sms-link-trackers.yaml` creates durable
storage and `20260922121000-014-sms-link-trackers-demo.yaml` adds fixed,
idempotent SMS link fixtures. `sms_marketing.read` protects list/detail/stat
reads and `sms_marketing.write` protects create, edit, and delete. Invalid URLs,
duplicate trackers, missing records, stale row versions, empty results, and
transport failures have explicit contracts. The action is isolated to SMS-owned
storage; the existing Email Marketing Link Tracker implementation is not reused
as a shared datasource.

Focused coverage is `test/sms_marketing_link_trackers.integration.test.ts`.
Authenticated Odoo desktop/mobile evidence could not be captured because the
BrowserSkill borrow of the existing signed-in Odoo tab in browser instance
`245ea108` timed out while awaiting the configured borrow confirmation. The tab
remained in the user's window and was not accessed through another browser
backend; no Odoo visual-parity claim is made. Core3 visual evidence remains
pending until an authenticated browser pass succeeds.

## Bounded action: SMS Marketing / Campaigns (wave 6)

Stable ID: `SMS-UTM-CAMPAIGNS-001`.

The next missing SMS Marketing action is the campaign group menu
`SMS Marketing` → `Campaigns` (menu_email_campaigns), which points to the
shared Odoo action `mass_mailing.action_view_utm_campaigns`. Local Odoo source
in `/home/nhanjs/projects/odoo/addons/mass_mailing/views/utm_campaign_views.xml`
defines the action as `utm.campaign` with `kanban,list,form`, the domain
`is_auto_campaign = False`, and mailing-campaign help text. Its search supports
campaign title, tags, responsible user, My Campaigns, Archived, and grouping by
stage, responsible, or tags. The form supports a stage statusbar, Campaign
Name, Responsible, Tags, archive/restore, and a Mailings stat/action; the
mass-mailing inheritance adds the Send Mailing and mailing list/stat surfaces.
The SMS menu declaration is in
`/home/nhanjs/projects/odoo/addons/mass_mailing_sms/views/mailing_sms_menus.xml`.

Core3 maps this bounded action to `pages/utm-campaigns.yaml` +
`api/utm-campaigns.yaml` and `pages/utm-campaign-detail.yaml` +
`api/utm-campaign-detail.yaml`, joined by matching page IDs
`sms-utm-campaigns` and `sms-utm-campaign-detail`. The SMS-owned durable
projection stores non-automatic campaigns, stages, tags, responsible users,
SMS mailing counts, active/archive state, and row versions. Migration
`20260922130000-015-sms-utm-campaigns.yaml` creates the storage and
`20260922131000-016-sms-utm-campaigns-demo.yaml` adds fixed, idempotent
fixtures. `sms_marketing.manage` protects the campaign-group action and all
CRUD/archive/restore transitions. Duplicate slugs, invalid stages, missing
records, stale row versions, empty fixtures, and transport failures have
explicit contracts. SMS mailing navigation stays bound to the existing
`/sms-campaigns` action.

Focused coverage is `test/sms_marketing_utm_campaigns.integration.test.ts`.
Authenticated Odoo desktop/mobile evidence is blocked because BrowserSkill's
single borrow request for the existing signed-in tab in browser instance
`245ea108` timed out while awaiting the configured confirmation; no
independent login or alternate browser backend was used, and no visual-parity
claim is made. Evidence is recorded under
`evidence/sms-marketing/2026-09-22/SMS-UTM-CAMPAIGNS-001/`.

## Bounded action: SMS from a UTM campaign form (wave 8)

Stable ID: `SMS-UTM-CAMPAIGN-SEND-001`.

The Odoo campaign form has a distinct SMS-specific header action not covered by
the campaign CRUD slice: `mass_mailing_sms/views/utm_campaign_views.xml`
adds `action_create_mass_sms` with the label **Send SMS**. The implementation
in `mass_mailing_sms/models/utm.py` opens
`mass_mailing.action_create_mass_mailings_from_campaign` with the active
campaign, `default_mailing_type: sms`, the current user, and campaign search
defaults. The existing Core3 UTM campaign form had no equivalent action and
its SMS mailing rows had no durable campaign link.

Core3 maps this action to `create_sms_from_utm_campaign` in
`api/utm-campaign-detail.yaml`, joined to the existing
`pages/utm-campaign-detail.yaml` by `page.id`. The action opens a bounded
server form with SMS mailing name/title/content, active mailing-list selection,
recipient count, sender, and schedule fields. A guarded insert persists
`sms_campaigns.campaign_id`, increments the campaign's SMS mailing projection,
and requires the campaign row version so stale campaign forms cannot create
unlinked mailings. Migration `20260922140000-017-sms-utm-campaign-mailings.yaml`
adds the durable link/index and
`20260922141000-018-sms-utm-campaign-mailings-demo.yaml` links the fixed demo
mailings idempotently. The existing mailing list datasource accepts the
campaign filter and detail/list queries expose the link.

Focused coverage is
`test/sms_marketing_utm_campaigns.integration.test.ts`: Odoo source mapping,
page/API separation, active-list validation, durable campaign linkage and
count increment, migration replay, duplicate protection, and stale-parent
rejection. The Odoo desktop/mobile comparison remains blocked in this run:
BrowserSkill instance `245ea108` is healthy, but the authenticated Odoo tab
`1770662590` was already borrowed by session `ivfy`; it could not be borrowed
or captured without taking over another session. No alternate browser, login,
credential, cookie, or token was used. Desktop and mobile visual captures for
this stable ID are therefore absent, and no visual-parity claim is made.

## Visual verification: SMS Marketing Analysis

On 2026-09-12, the single-module runner (`bun run agent:module -- sms-marketing --port=3317`) was started after `bun install --frozen-lockfile` and the frontend production build. Authenticated Playwright using `/usr/bin/google-chrome` logged in as the seeded Core3 administrator and rendered the resolved route `/sms-marketing/sms-analysis?from_date=2026-01-01&to_date=2026-09-12` (the declared page route is `/sms-analysis`). Graph, Pivot, and List were inspected at 1440x900 and 390x844. Core3 captures are:

- `/tmp/core3-odoo-parity/sms-visual2-20260912/core3-sms-analysis-desktop.png`
- `/tmp/core3-odoo-parity/sms-visual2-20260912/core3-sms-analysis-mobile.png`
- `/tmp/core3-odoo-parity/sms-visual2-20260912/core3-sms-analysis-pivot-desktop.png`
- `/tmp/core3-odoo-parity/sms-visual2-20260912/core3-sms-analysis-pivot-mobile.png`
- `/tmp/core3-odoo-parity/sms-visual2-20260912/core3-sms-analysis-list-desktop.png`
- `/tmp/core3-odoo-parity/sms-visual2-20260912/core3-sms-analysis-list-mobile.png`

The pass verified the Campaigns/Reporting shell, Graph/Pivot/List switcher, This year date filter, graph measure controls, seeded chart values, pivot totals, list density, and mobile layout. The mobile document remained 390px wide with no document-level horizontal overflow; list and pivot content is clipped at the viewport boundary. No browser console, page, or request errors were observed after the frontend build.

The matching installed Odoo action is source-confirmed as `mass_mailing_sms.mailing_trace_report_action_sms`, with `graph,pivot,list`, the SMS domain, and SMS-specific removal of email-only Opened/Replied fields. Odoo was reached at `http://127.0.0.1:8069` using database `core3_reference`, but the available `admin`/`admin` credentials were rejected (`Wrong login/password`), so no authenticated Odoo graph/pivot/list capture or visual-parity claim is made. Odoo diagnostic login captures are at `/tmp/core3-odoo-parity/sms-visual2-20260912/odoo-sms-analysis-desktop.png` and `odoo-sms-analysis-mobile.png`. All images remain outside Git. No source change was justified by the available evidence.
