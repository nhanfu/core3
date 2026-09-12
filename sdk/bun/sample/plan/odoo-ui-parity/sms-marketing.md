# Odoo 19 UI parity - SMS Marketing

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

The authenticated browser pass could not run in this worktree. The
`playwright-interactive` skill was inspected, but its required `js_repl` tool is
not exposed in this session. The fallback runtime also could not render Core3:
the dev frontend failed with `EMFILE: too many open files` while Vite watched
`vite.config.ts`; the backend then failed in full startup with DuckDB
`Parser Error: Adding columns with constraints not yet supported`; and the
built-server attempt failed with `Unable to connect to event mediator`. No
authenticated Core3 screenshots were captured, and this batch makes no visual
parity claim. No screenshot is added to Git.
