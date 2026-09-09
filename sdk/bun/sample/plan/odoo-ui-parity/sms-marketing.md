# SMS Marketing — sub-plan

Status: `planning`

## Reference

- Odoo addon: `mass_mailing_sms` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; include delivery and empty states
- Core3 service: `sms-marketing`

## UI inventory

- SMS Marketing dashboard, SMS Mailings, mailing lists/contacts, reporting, and configuration menus.
- SMS mailing kanban/list with draft/scheduled/sent/failed states, recipients, credits/length, search/filter/group, duplicate, archive, and pager.
- SMS form/composer with sender, recipients/list, message body, character/segment count, schedule/send/test actions, delivery status, and chatter.
- Reporting graph/pivot for sent/delivered/failed/unsubscribed, blacklist/unsubscribe, mobile composer/list, dialogs, and empty state.

## Core3 backend mock-data plan

Use `sms_mailings`, `sms_stages`, `sms_lists`, `sms_contacts`, `sms_recipients`, `sms_delivery`, `sms_metrics`, `sms_blacklist`, and `sms_chatter`. `default` includes messages in each state, segmented lengths, recipients, delivery failures, metrics, and editor relations. States: `scheduled`, `delivered`, `failed`, `empty`, `metrics_graph`, `metrics_pivot`, `composer_edit`, `mobile`.

## Shared UI primitives

Composer with character counter, list/contact relations, kanban/list/form tabs, status bar, delivery badges, graph/pivot, scheduling dialog, blacklist confirmation, and responsive navigation.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for dashboard, mailing list/kanban, composer, contacts/blacklist, report graph/pivot, and failed/empty states.

## Acceptance criteria

- SMS menus, composer fields, segment counter, lifecycle actions, delivery/report views, and mobile layouts match Odoo.
- Backend YAML supplies all visible message metadata, recipient rows, delivery states, report values, blacklist entries, and empty states.
- Send/test/schedule/archive, search/filter/group, report and save/discard interactions render with no live backend.
