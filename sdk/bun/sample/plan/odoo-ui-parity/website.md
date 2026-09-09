# Website — UI-only sub-plan

Status: `planning`

## Reference and source availability

- Odoo addon: `website`; supplied Odoo 19 source: available; verify demo-data flag.
- Core3 service: `website` (`sdk/bun/sample/services/website`), explicitly YAML-driven composition; do not copy bespoke Odoo frontend code.

## Menu, action, route, and view inventory

- Website (`/website`) / Content → Websites: list/card, website detail, domain/company/language/theme/published settings, create/edit, empty.
- Content → Pages (`/website-pages`): list, search/filter/publish/archive, editor/composition, URL/menu/visibility metadata, preview, mobile.
- Content → Menus (`/website-menus`): nested tree/list, reorder/nesting, label/URL/parent/published, create/edit/delete, empty.
- Reporting → Website Analysis (`/website-analysis`): KPI cards, date filters, traffic chart/table, populated/no-data.
- Publish/unpublish, duplicate/archive/delete, confirmation/error/permission dialogs, breadcrumbs, preview, mobile nav.

## YAML composition and backend mock-data plan

Page YAML defines layout, slots, components, routes, and datasource IDs only. Backend datasource YAML owns `mock_data` for websites, website detail, pages/page detail, menus/tree, analysis, users/companies/languages, and workflow results. Include multiple sites, published/unpublished pages, nested menu items, blocks/slots, domains/languages, exact KPI/chart labels/values/dates, filtered/search/paginated/empty/no-data, mobile preview, and permission/error states.

## Shared UI primitives

Reuse shell/control panel, list/card/form, nested tree/reorder, publish/statusbar, composition slots/sections, preview toggle, KPI/chart/date filter, dialogs/toasts, permission state, and responsive navigation. Record composition gaps before implementation.

## Screenshots

Capture Odoo 19/Core3 at `1440x900` and `390x844`: website/detail, page/editor/preview, menu tree, publish dialogs, analysis populated/no-data, permission/error. Record route, fixture state, viewport, screenshot path.

## Acceptance

- Menus, content tree, composition/editor controls, publish workflow, analysis, and responsive layout match.
- All content/chart data is backend `mock_data`; page YAML has no fixture records and layouts render with backend unavailable.
- Reorder, publish, filters, preview, empty/no-data, permission/mobile states are deterministic; visual review and `git diff --check` are clean.
