# Base and Contacts — UI-only sub-plan

Status: `ready`

## Reference and source availability

- Odoo addons: `base`, `contacts`; supplied Odoo 19 source: available.
- Demo data: manifests provide demo/reference records; capture demo-enabled and disabled configurations.
- Core3 service: `base` (`sdk/bun/sample/services/base`). ORM internals are out of scope.

## Menu, action, and view inventory

1. App switcher and Contacts application entry.
2. Contacts list: populated/empty states, search, filters, group-by, favorites, sort, pager, import/export, archive, bulk actions, List/Card/Kanban switcher.
3. Contact/company form: create/edit/save/discard, avatar, company/person, name, address, phone/email/website, language, tags, salesperson, notebook, chatter, activities, attachments, smart buttons, archive/delete/duplicate.
4. Company hierarchy and child contacts; country/state, tags, users, and relational popovers.
5. Mobile navbar, search/filter drawer, cards, form sections, dialogs, overflow, validation, and permission-denied states.

Use `view_navigation: tabs` with ListView, CardView, and inline FormView for collections. Related lists on a detail form use `responsive_card: true` and no nested switcher.

## Backend datasource mock-data plan

Backend datasource YAML owns `mock_data`; page YAML remains layout-only. Add fixtures for companies, people, addresses, tags, countries/states, currencies, users, activities, chatter, attachments, and smart-button counts. Include enough records for two pages, hierarchy, search/filter/group outcomes, archived records, relation options, and named `empty` and `filtered` states while retaining the populated default. Every visible field and relation must have deterministic values.

## Shared UI primitives

Assess/reuse shell, app switcher, navbar, breadcrumb, control panel, search panel, view switcher, pager, dialogs, notifications, mobile navigation, avatar, tags, many-to-one, address, notebook, status, smart button, attachment, activity, and chatter primitives. Record any missing primitive before implementation.

## Screenshots

Capture Odoo 19 and Core3 at `1440x900` and `390x844` for every inventory item, including populated, empty, filtered, create/edit, relational popover, archive confirmation, permission, and mobile overflow states. Record route, action id, fixture state, viewport, and screenshot path.

## Acceptance

- Menus, actions, labels, icons, breadcrumbs, permissions, list/card/form interactions, relational fields, chatter, activities, dialogs, and responsive behavior match Odoo.
- Every visible datasource returns stable backend `mock_data`; no page-layout YAML contains records and no list/form is blank.
- Search, filter, group, sort, pagination, empty, archive, validation, save/discard, and permission states are reproducible.
- Screenshot comparison is reviewed at both viewports and `git diff --check` is clean before `ready`.

## Current batch evidence

- Batch: canonical Contacts list/card and contact detail interaction.
- Source reviewed: Odoo 19 `addons/contacts/views/contact_views.xml` and `odoo/addons/base/views/res_partner_views.xml`; live reference was available at `/odoo/contacts?view_type=list` and `/odoo/contacts/98`.
- Core3 authenticated routes: `/base/contacts` (page route `/contacts`) and `/base/contacts/detail?id=contact-demo` (page route `/contacts/detail`).
- Core3 API ownership: `api/contacts.yaml` owns `contacts`, filters, deterministic fixture states, and list CRUD/navigation actions; `api/contact-detail.yaml` owns detail, activities, chatter fixture rows, smart-button actions, edit, and activity scheduling. The two page YAML files contain layout only.
- Core3 captures at 1440x900: `/tmp/core3-contacts-final-list-desktop.png`, `/tmp/core3-contacts-final-cards-desktop.png`, `/tmp/core3-contacts-final-detail-desktop.png`.
- Core3 captures at 390x844: `/tmp/core3-contacts-final-list-mobile.png`, `/tmp/core3-contacts-final-detail-mobile.png`.
- Odoo comparison captures: `/tmp/odoo-contacts-final-list-desktop.png`, `/tmp/odoo-contacts-final-detail-desktop.png`, `/tmp/odoo-contacts-final-list-mobile.png`, `/tmp/odoo-contacts-final-detail-mobile.png`.
- Verified with authenticated browser: populated list, visible List/Cards/Kanban tabs, mobile Cards default, full detail navigation (no side panel), avatar initials, six smart buttons, notebook tabs, activities, chatter/follower/attachment tools, edit/save/discard, Activity composer, no unexpected responses >=400, and no horizontal overflow at either viewport.
- API contract evidence: search `Leonie` returns one record, named `empty` returns zero records, named `transport_error` returns HTTP 503 with `BASE_CONTACTS_DATA_UNAVAILABLE`; detail `not_found` returns an empty single-record payload. Focused integration test: `test/base_contacts.integration.test.ts` (4 tests, 44 assertions).
- Deferred scope: Odoo app-switcher/menu label parity (`People` remains the existing Core3 shell group), real binary contact avatars, Person/Company radio control, salesperson and richer relational popovers, import/export/archive/bulk confirmations, full chatter compose/send/note persistence, attachment upload/download, contact hierarchy editing, and the remaining Contacts/Companies configuration screens. Images remain in `/tmp` and are not committed.
