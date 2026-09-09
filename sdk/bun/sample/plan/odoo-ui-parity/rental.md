# Sale Renting — UI-only sub-plan

Status: `planning`

## Reference and source availability

- Odoo addon: `sale_renting`; supplied Odoo 19 addon source: unavailable.
- Demo data: verify reference manifest/build availability before capture.
- Core3 scaffold: `sale_renting` (`sdk/bun/sample/services/sale_renting`), covering rentals, events, availability, detail, and workflow.

## Menu, action, and view inventory

- Rental (`/rentals`): rental-order list, search/filter/group/sort/pager, List/Card switcher, customer/products/dates/status, create/edit, populated/empty.
- Operations → Rental Events (`/events`): event/timeline list, rental/customer/product relation, pickup/return/cancel, filters, empty.
- Planning → Availability (`/availability`): date-range/resource availability, available/occupied/overdue, filters, responsive view.
- Rental detail: statusbar, customer, rental lines, dates, pricing/deposit, event history, chatter/activity/attachments where visible, validation/workflow dialogs.
- Mobile cards, date controls, compact timeline, forms, and action overflow.

## Backend datasource mock-data plan

Datasource YAML owns `mock_data`; page YAML remains layout-only. Define rentals, rental detail/lines/events, availability, customers, products, users, pricing/deposit, activities, chatter, and workflow results. Include draft/confirmed/picked-up/returned/overdue/cancelled, overlapping and available resources, two date ranges, pagination, search/filter/empty states, relation options, and deterministic transitions. Availability carries exact resource/date/occupancy/status values.

## Shared UI primitives

Reuse shell/control panel, search/filter/group/pager, List/Card/Form tabs, date-range picker, calendar/timeline/statusbar, monetary/date fields, relational selector, one-to-many lines, dialogs/toasts, activity/chatter, and responsive cards. Record availability/timeline gaps before implementation.

## Screenshots

Capture Odoo 19/Core3 at `1440x900` and `390x844` for menu, list/form, timeline/availability, workflow, populated, filtered, overdue, returned, and empty states; record route, state, viewport, and build metadata.

## Acceptance

- Rental menus, list/form/event/availability views, dates, status semantics, pricing, occupancy, dialogs, and responsive behavior match.
- Every visible datasource has stable backend `mock_data`; page YAML has no records and no event/availability row is blank.
- Search/filter/group/pager, date ranges, relations, save/discard, pickup/return/cancel, overdue, empty, mobile, and `git diff --check` pass.
