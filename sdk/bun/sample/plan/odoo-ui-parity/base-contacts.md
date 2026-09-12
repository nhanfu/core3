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

### Current batch evidence: Banks configuration (Odoo action `base.action_res_bank_form`)

- Source reviewed: Odoo 19 `odoo/addons/base/views/res_bank_views.xml` and
  `odoo/addons/contacts/views/contact_views.xml`. The source menu is Contacts →
  Configuration → Bank Accounts → Banks; the list shows Bank, BIC, and Country,
  with an Archived filter, and the form contains Bank Details, Bank Address, and
  Communication Details.
- Core3 ownership: `pages/banks.yaml` and `pages/bank-detail.yaml` are
  presentation-only; `api/banks.yaml` and `api/bank-detail.yaml` own datasource,
  action, fixture, error, and permission contracts, joined by `page.id: banks`
  and `page.id: bank-detail`. Migration `20260912110000-012-banks.yaml` seeds
  Odoo demo-shaped ING, BNP Paribas, and archived Reserve records.
- Core3 route: `/base-banks`, qualified under Bank Accounts, with detail at
  `/base-bank-detail?id=<bank id>`. Focused validation is
  `test/base_banks.integration.test.ts` and covers discovery, idempotent
  fixtures, search, archive filtering, empty/503/404 states, permissioned
  create/update/archive/restore/delete, required and duplicate validation, and
  optimistic stale-write guards.
- Browser comparison is attempted under
  `/tmp/core3-odoo-parity/base-batch4-20260912/`; the first runtime failure and
  its exact limitation will be recorded here before finalizing this batch.
- Runtime limitation encountered: the initial focused test could not start in
  the fresh worktree because Bun reported `Cannot find module
  '@core3/server/database/duckdb-database'`; workspace dependencies had not yet
  been installed. This is an environment limitation, not a Banks contract
  result; dependency installation and source-level validation continue.
- Browser runtime limitation: `bun run dev --db=ddb --memory` started the
  backend but Vite exited before serving the frontend with
  `EMFILE: too many open files, watch .../sample/vite.config.ts`; therefore no
  authenticated Core3 desktop/mobile capture could be rendered in this batch.

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

### Current batch evidence: Fed. States localization

- Source reviewed: Odoo 19 `base.action_country_state` (action 64), reached
  from Contacts → Configuration → Localization → Fed. States. The source is
  an editable-bottom list of State Name, State Code, and Country with a State
  form, Country search field, Country grouping, and the help text “Create a
  State”.
- Core3 now exposes `/base-fed-states` under the same Localization menu. The
  layout is `pages/fed-states.yaml`; `api/fed-states.yaml` owns the datasource,
  country lookup, inline create/update/delete actions, and stable permission,
  validation, duplicate, not-found, and transport-error contracts. The
  fragments join through `page.id: fed-states`; migration `0.0.9` adds the
  row-version column required by guarded writes without changing the existing
  three base state fixtures.
- Focused validation is `test/base_fed_states.integration.test.ts`: 3 tests,
  21 assertions. It verifies page/API discovery, deterministic Germany/US/
  Vietnam rows, search, empty/error reads, and permissioned CRUD guard
  declarations. The authenticated Core3 browser pass rendered three rows at
  both target viewports with zero page/request errors and no horizontal
  overflow.
- Comparison captures remain outside Git:
  - Odoo list, desktop: `/tmp/odoo-base-fed-states-desktop-list-final-20260911.png`
    (`2bba67397af2eff0a31941f320ddb9bd677161db6e9866501d8f9e02555f249e`)
  - Odoo list, mobile: `/tmp/odoo-base-fed-states-mobile-list-final-20260911.png`
    (`19a1f14b68c3a401202239eeac9cf9879625f01e499057c9672b4af17c754451`)
  - Core3 list, desktop: `/tmp/core3-base-fed-states-desktop-final-20260911.png`
    (`cb9ed1de96caa9b30053c3719deaf76703a21b7e6a5919932be49f537cc21791`)
  - Core3 list, mobile: `/tmp/core3-base-fed-states-mobile-final-20260911.png`
    (`beec0d0e0466f88df2580104366fb92e1931475b079017fc24131d7bcd646ef2`)
- Visual review confirms the same editable list interaction shape, columns,
  New action, pager, country data, and responsive width behavior. Odoo has
  2,131 live state rows while this bounded Core3 replacement retains the
  existing deterministic three-row base fixture; the purple Odoo shell and
  larger source catalog remain explicit reference differences.

## Countries bounded slice (2026-09-12)

Core3 adds the Contacts > Configuration > Localization > Countries action at `/base-countries`, with a page/API pair joined by `page.id`, deterministic country fixtures, read-only `base.reference.read` access, search, empty, and transport states. The focused test passes 3 tests and 15 assertions.

The active Odoo reference produced desktop/mobile list and error-state captures under `/tmp/core3-odoo-parity/base-next-20260912/`. Core3 initial captures were also attempted, but the final paired comparison was not completed before the isolated browser process ended; no full visual parity claim is made. Images remain outside Git.

## Bank Accounts bounded slice (2026-09-12)

The next uncovered Contacts configuration action is Odoo `base.action_res_partner_bank_account_form`, reached at Contacts > Configuration > Bank Accounts > Bank Accounts. The source is Odoo 19 `odoo/addons/base/views/res_bank_views.xml` plus the menu declaration in `addons/contacts/views/contact_views.xml`. It is a `list,form` action on `res.partner.bank`: the list is ordered by account number and exposes Account Number, optional Partner, Bank, optional multi-company Company, optional Send Money? toggle, and optional Active toggle. Its search view is labeled Bank Accounts, searches Bank Name or account number, includes Partner and context-sensitive Company, and has an Archived filter. The form exposes Account Number, Clearing Number, Partner, Account Holder Name, Bank, Send Money?, optional Company and Currency fields, and a Note notebook page; its help state is “Create a Bank Account” / “From here you can manage all bank accounts linked to you and your contacts.”

Core3 owns `pages/partner-bank-accounts.yaml` and `pages/partner-bank-account-detail.yaml` for layout, while `api/partner-bank-accounts.yaml` and `api/partner-bank-account-detail.yaml` own datasource, relation lookups, actions, validation, and permission contracts joined by `page.id`. Migration `20260912120000-013-partner-bank-accounts.yaml` seeds deterministic normal and archived records idempotently in `base_partner_bank_accounts`; partner and bank choices are sourced from the existing Base tables. The manifest adds the source-qualified Bank Accounts child after Banks.

Focused validation is `test/base_partner_bank_accounts.integration.test.ts` (3 tests, 28 assertions). It covers route/menu discovery, page/API separation, idempotent migration, normal/archived/empty/transport/not-found reads, partner relation validation, create/update/delete, archive/restore, duplicate and required validation, permission declarations, and stale row-version writes. `bun run audit`, the focused test, and `git diff --check` pass. This worktree has no `lint` script; `bun run frontend:build` is the applicable frontend build check.

Browser verification limitation: the `playwright-interactive` skill is not exposed in this Codex session (`js_repl` is unavailable), and no authenticated Core3 browser renderer was available. Therefore no authenticated Core3 screenshots were captured under `/tmp/core3-odoo-parity/base-batch5-20260912/`, and no visual parity claim is made for this slice. Odoo source inspection is recorded above; browser evidence remains required before marking the module ready. Images remain outside Git.

## Country detail bounded slice (2026-09-12)

Odoo trace: `addons/contacts/views/contact_views.xml:65-70` defines Contacts → Configuration → Localization → Countries (`menu_country_partner`, sequence 1), targeting `base.action_country`. Odoo 19 `odoo/addons/base/views/res_country_views.xml:7-16` defines `res.country.list` as Country then Code with create/delete disabled; lines 18-63 define `res.country.form` with Country, Currency, Code, Phone Code, VAT Label, ZIP Required, State Required, and an inline State/Code list; lines 65-86 define the Countries search/action (`base.action_country`) and its “No Country Found!” help state.

Core3 implements the visible form at `/base-country-detail?id=US`. `pages/country-detail.yaml` is presentation-only and renders the Odoo field groups; the shared Core3 form primitive has no inline one-to-many renderer, so deterministic states are shown as a read-only summary in the bounded slice. `api/country-detail.yaml` owns the `country_detail` datasource, read/503/not-found states, and the permissioned `edit_country_detail` update contract, joined by `page.id: country-detail`. Migration `20260912130000-015-country-detail.yaml` adds deterministic phone/VAT/required-field values to the existing country fixtures. Countries remains read-only for create/delete, matching the Odoo list/form contract; update requires `base.reference.write` and rejects missing records with `BASE_COUNTRY_NOT_FOUND`.

Focused validation: `test/base_countries.integration.test.ts` passes 3 tests / 23 assertions, covering discovery and route ownership, idempotent fixtures, search/empty/transport states, US detail with California state data, detail not-found/503, update, missing-record guard, and read/write permission declarations. `bun run audit` passes with 608 pages, 617 routes, and 1047 datasources; `bun run frontend:build` passes; `git diff --check` passes.

Browser evidence attempt: Odoo was reachable at `http://127.0.0.1:8069`, but the unauthenticated browser landed at `/web/login?redirect=%2Fodoo%2Fcontacts%3F`; an `admin` / `admin` login attempt remained on `/web/login`. Those unauthenticated attempt images are `/tmp/core3-odoo-parity/base-country-detail-20260912/odoo-desktop.png`, `odoo-mobile.png`, and `odoo-auth-attempt-desktop.png`. Core3 startup was attempted with `bun run dev --db=ddb --memory`; it failed before serving HTTP because the existing unrelated YAML contract error is `Named action sms_marketing.mailings.cancel permission does not match its workflow transition` from `packages/server/src/routes/yaml-api.ts:253`. Consequently no authenticated Core3 or Odoo captures were produced, and no visual-parity claim is made for this slice. Images remain outside Git.
