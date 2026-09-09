# Sale Subscription — UI-only sub-plan

Status: `planning`

## Reference and source availability

- Odoo addon: `sale_subscription`; supplied Odoo 19 addon source: unavailable.
- Demo data: verify the reference manifest/build and record its availability before capture.
- Core3 scaffold: `sale_subscription` (`sdk/bun/sample/services/sale_subscription`), with subscriptions, plans, invoices, detail, and workflow pages.

## Menu, action, and view inventory

- Subscriptions (`/subscriptions`): list, search/filter/group/sort/pager, List/Card switcher, create/edit, status actions, populated/empty.
- Operations → Recurring Invoices (`/invoices`): invoice list, draft/posted states, subscription/customer relation, post action, search, empty, responsive cards.
- Configuration → Subscription Plans (`/plans`): plan list/form, period/price/trial days, active/archive, create/edit, empty.
- Subscription detail: status bar, customer, plan, recurring revenue/period, dates, invoice one-to-many, chatter/activity/attachments where visible, workflow confirmations.
- Mobile: compact control panel, cards, form sections, status/action overflow, dialogs.

## Backend datasource mock-data plan

Datasource YAML owns `mock_data`; page YAML stays layout-only. Define `subscriptions`, `subscription_detail`, `subscription_plans`, `recurring_invoices`, customers, salespersons, activities, chatter, and action-result fixtures. Include quotation/in-progress/paused/closed/churned records, multiple periods, two pages, draft/posted invoices, active/inactive plans, filtered/search/empty states, relation options, and deterministic workflow transitions. Invoice dates, amounts, totals, and labels must equal the screenshots.

## Shared UI primitives

Reuse shell, control panel, search/filter/group/pager, List/Card/Form tabs, statusbar, monetary/date fields, many-to-one, one-to-many table, smart buttons, confirmation/toast, activity/chatter, and responsive cards. Record recurring-period/workflow gaps before implementation.

## Screenshots

Capture Odoo 19 and Core3 at `1440x900` and `390x844` for every menu, list/form, status, invoice, plan, workflow, populated, filtered, and empty state; retain Odoo build/date because source is unavailable.

## Acceptance

- Menus, subscription/invoice/plan views, states, workflow dialogs, dates, amounts, badges, and responsive behavior match captures.
- All visible datasource content is stable backend `mock_data`; page YAML has no records and renders without a database.
- Search/filter/group/pager, relations, save/discard, archive, post, pause/close/churn, empty, and mobile states are reproducible; `git diff --check` is clean.
