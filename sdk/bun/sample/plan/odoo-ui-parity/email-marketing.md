# Email Marketing — sub-plan

Status: `planning`

## Reference

- Odoo addon: `mass_mailing` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; include campaign lifecycle and empty modes
- Core3 service: `email-marketing`

## UI inventory

- Email Marketing dashboard, Mailings, Mailing Lists, Contacts, Reporting, and configuration menus.
- Mailing kanban/list with draft/sent/scheduled stages, recipients, subject, sent date, search/filter/group, favorites, duplicate, archive, and pager.
- Mailing form/editor with subject, sender, recipients, mailing list, body/content preview, schedule/send/test actions, attachments, links, and chatter.
- Mailing list/contact forms, blacklist/unsubscribe states, reporting graph/pivot (sent, delivered, opened, clicked, bounced), mobile editor/list, dialogs, and empty states.

## Core3 backend mock-data plan

Declare `mass_mailings`, `mailing_stages`, `mailing_lists`, `mailing_contacts`, `mailing_recipients`, `mailing_links`, `mailing_metrics`, `mailing_blacklist`, and `mailing_chatter`. `default` contains campaigns in each lifecycle stage, recipients and metrics, lists/contacts, and complete editor data. States: `scheduled`, `sent`, `draft`, `empty`, `metrics_graph`, `metrics_pivot`, `mailing_edit`, `mobile`.

## Shared UI primitives

Kanban/list/form views, rich content preview placeholder, recipient/list relations, status bar, metric cards, graph/pivot, scheduling dialog, confirmation/toast, search controls, and responsive editor.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for dashboard, mailing kanban/list, editor/form, lists/contacts, report graph/pivot, and empty state.

## Acceptance criteria

- Campaign menus, lifecycle actions, editor metadata, list/contact management, metrics, and mobile layouts match Odoo.
- All visible campaign content metadata, recipients, metrics, links, blacklist rows, chatter, and empty states come from backend YAML.
- Send/test/schedule/duplicate/archive, filter/group, report rendering, and editor save/discard work offline; provider IDs are query-replaceable.
