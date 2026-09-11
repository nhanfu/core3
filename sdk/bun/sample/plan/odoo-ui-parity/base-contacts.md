# Base and Contacts — UI-only sub-plan

Status: `in-progress`

### Current batch evidence: Country Groups localization

- Source reviewed in the authenticated Odoo 19 demo database: Contacts /
  Configuration / Localization / Country Groups, action 63, with the
  populated list, detail, and new-form states. Core3 owns separate layout and
  API YAML fragments joined by `page.id`, deterministic ten-group fixtures,
  country lookup data, read/write permissions, and guarded create/update/delete
  actions.
- Odoo captures remain outside Git: `/tmp/odoo-base-country-groups-desktop-20260911.png`,
  `/tmp/odoo-base-country-groups-mobile-20260911.png`,
  `/tmp/odoo-base-country-group-detail-desktop-20260911.png`,
  `/tmp/odoo-base-country-group-detail-mobile-20260911.png`,
  `/tmp/odoo-base-country-group-new-desktop-20260911.png`, and
  `/tmp/odoo-base-country-group-new-mobile-20260911.png`. Core3 list/detail/new
  captures are `/tmp/core3-base-country-groups-desktop-list-final-20260911.png`,
  `/tmp/core3-base-country-groups-mobile-list-final-20260911.png`,
  `/tmp/core3-base-country-group-detail-desktop-final-20260911.png`,
  `/tmp/core3-base-country-group-detail-mobile-final-20260911.png`,
  `/tmp/core3-base-country-group-new-desktop-final-20260911.png`, and
  `/tmp/core3-base-country-group-new-mobile-final-20260911.png`.
- The authenticated edit comparison initially exposed a real parity defect:
  the country lookup defaulted to 25 rows and the multi-select initialized
  only the first matching subset. The shared YAML API prefetch now requests up
  to 100 option rows, and `AsyncSelect` preserves all initial values when
  `multiple` is enabled. Post-fix edit captures show all 27 countries at both
  1440x900 and 390x844: `/tmp/core3-base-country-group-edit-desktop-postfix2-20260911.png`
  (SHA-256
  `50f7bd833d8b0b960d1ac8c8589a039176e8a08b8cb766e7fbf32c47edf75e3e`) and
  `/tmp/core3-base-country-group-edit-mobile-postfix2-20260911.png` (SHA-256
  `9df5f24b48787df9325ee6f3a25689d701ef7654aff45fc9cfa86ac02c3a4e65`).
  Both have no page/request errors and body/document widths equal the viewport.
- Focused validation remains 3 tests / 31 assertions, UI audit passes, ESLint
  passes, global CSS rebuild passes, and `git diff --check` passes. Images are
  not committed.

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

### Current batch evidence: archive and restore filter

- Source reviewed: the live personal Odoo database `core3_personal` on
  2026-09-11. The reference list exposes Active and Archived status filters;
  the archived view contains `Archived Contact` and `Archived Directory
  Contact`.
- Core3 owns the same status filter through `contacts` datasource parameters
  and the `base.contacts.archive` / `base.contacts.unarchive` actions. The
  focused test now covers archive, restore, permission, and stale-row guards:
  `test/base_contacts.integration.test.ts` (5 tests, 56 assertions).
- Authenticated Odoo captures, deliberately excluded from Git:
  `/tmp/odoo-base-contacts-archive-active-desktop-20260911.png`,
  `/tmp/odoo-base-contacts-archive-active-mobile-20260911.png`,
  `/tmp/odoo-base-contacts-archive-archived-desktop-20260911.png`, and
  `/tmp/odoo-base-contacts-archive-archived-mobile-20260911.png`.
- Authenticated Core3 captures used `admin@tms.local` / `admin123`, and were
  recaptured after an earlier unauthenticated capture was rejected:
  `/tmp/core3-base-contacts-archive-active-desktop-auth-20260911.png`,
  `/tmp/core3-base-contacts-archive-active-mobile-auth-20260911.png`,
  `/tmp/core3-base-contacts-archive-archived-desktop-auth-20260911.png`, and
  `/tmp/core3-base-contacts-archive-archived-mobile-auth-20260911.png`.
  They are 1440x900 and 390x844 captures respectively; the authenticated
  browser pass loaded the nine active rows and two archived rows with no
  horizontal overflow. Screenshots remain outside Git.
- Known bounded visual differences remain the Fluent Core3 shell versus
  Odoo's purple shell, Core3's deterministic nine-row fixture versus Odoo's
  larger demo catalog, and shared filter/list density. The archive state,
  labels, row counts, and responsive behavior are now directly evidenced.

### Current batch evidence: Contact Tags configuration

- Source reviewed: Odoo 19 `res.partner.category` action `58` (`Contact Tags`), reached at `/odoo/action-58` in the owned `core3_owned` reference database. The seven active demo tags and their parent relationships were copied into deterministic Core3 fixtures; one archived tag covers the archive filter.
- Core3 ownership: `services/base` migration `0.0.5` owns `base_contact_tags`; `api/contact-tags.yaml` owns the `contact_tags` datasource and CRUD/archive actions; `pages/contact-tags.yaml` owns layout only. Both fragments join through `page.id: contact-tags`; the manifest exposes `/base-contact-tags` under People.
- Core3 authenticated route: `/base/base-contact-tags` (page route `/base-contact-tags`). Covered behavior includes active/archived filtering, text search, named empty state, 503 datasource error, create/update/archive/unarchive/delete, duplicate-name and not-found guards, row-version conflict, and read/write permission boundaries. Focused integration test: `test/base_contact_tags.integration.test.ts` (3 tests, 44 assertions). Shared ListView color inline editing is covered by `test/cases/list-view.test.ts` (34 tests).
- Comparison captures at 1440x900: Odoo `/tmp/odoo-base-contact-tags-desktop.png`; Core3 `/tmp/core3-base-contact-tags-desktop-final.png`.
- Comparison captures at 390x844: Odoo `/tmp/odoo-base-contact-tags-mobile.png`; Core3 `/tmp/core3-base-contact-tags-mobile-final.png`.
- Authenticated browser evidence: both Core3 viewports rendered all seven rows with no console errors, failed requests, or horizontal overflow. The dense list, search control, pager, New action, parent category, color swatches, and mobile overflow affordance follow the Odoo interaction shape; the existing Core3 shell palette and shared color palette remain product-level differences.
- Verification: `bun run audit` reports 359 pages, 364 routes, and 637 datasources; `git diff --check` is clean. Screenshots remain in `/tmp` and are not committed.

### Current batch evidence: Industries configuration (Odoo action 59)

- Source reviewed: the live personal Odoo database `core3_personal` on
  2026-09-11 and Odoo 19 source `odoo/addons/base/views/res_partner_views.xml`.
  Contacts → Configuration → Industries is a visible list/form action with
  editable `name` and `full_name` columns, search over both fields, and an
  Archived filter. The live default list contained 21 catalog rows.
- Core3 ownership: `pages/industries.yaml` is presentation-only and joins
  `api/industries.yaml` through `page.id: industries`; migration
  `20260911194000-007-industries.yaml` owns the deterministic Odoo-derived
  21-row catalog plus one archived fixture. The manifest exposes
  `/base-industries` under People → Configuration → Industries.
- Covered behavior: default active list, search matching both name and full
  name, empty fixture, Active/Archived status filter, inline create/update,
  duplicate-name and required-name validation, optimistic row-version guard,
  archive/restore, delete guard, and `base.reference.read` /
  `base.reference.write` permission declarations. Focused test:
  `test/base_industries.integration.test.ts` (3 tests, 25 assertions).
- Authenticated Odoo captures at 1440×900 and 390×844:
  `/tmp/odoo-base-industries-desktop-final-20260911.png` (SHA-256
  `2907797704d9391a6adce0f10626794d830e538ce900d50406e1924c7487dc11`) and
  `/tmp/odoo-base-industries-mobile-final-20260911.png` (SHA-256
  `607e5e192e5e8b537040b6c3b8e9529feb6a6d353181a93a6bfd05fcc590e7ac`).
- Authenticated Core3 captures at 1440×900 and 390×844:
  `/tmp/core3-base-industries-desktop-final-20260911.png` (SHA-256
  `8d4519d4f8339703691e3605491313d758dda9c062cee20ee01e13df93a6648a`) and
  `/tmp/core3-base-industries-mobile-final-20260911.png` (SHA-256
  `eb7e3e5f341616b4ddba99ef2f8acf5a09202d76d0260640895d74c32d78702e`).
  Browser checks found no console/page/request errors and no horizontal
  overflow at either viewport. Screenshots were inspected side by side;
  catalog labels, row count, columns, search affordance, pager, and mobile
  truncation match the Odoo interaction shape. The existing Fluent Core3
  shell/palette and row-action kebab remain product-level visual differences.
- Verification: `bun run audit` reports 460 pages, 467 routes, and 801
  datasources; `git diff --check` is clean. Screenshots remain in `/tmp` and
  are not committed.
