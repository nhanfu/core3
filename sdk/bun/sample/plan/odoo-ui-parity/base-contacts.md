# Base and Contacts — UI-only sub-plan

Status: `in-progress`

## 2026-09-20 Reference data contract repair

- Converted the Base Configuration/Localization landing page to the standard
  page-only/API-owned contract, added its explicit route, and preserved the
  four navigation actions through the API fragment.
- Added declared read permission, empty, forbidden, and transport boundaries
  with focused discovery and migration-backed tests. Authenticated desktop and
  mobile comparison for the full Base module remains an open gate.

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

Focused validation is `test/base_partner_bank_accounts.integration.test.ts` (3 tests, 29 assertions). It covers route/menu discovery, page/API separation, idempotent migration, normal/archived/empty/transport/not-found reads, partner relation validation, create/update/delete, archive/restore, duplicate and required validation, permission declarations, and stale row-version writes. `bun run audit`, the focused test, and `git diff --check` pass. This worktree has no `lint` script; `bun run frontend:build` is the applicable frontend build check.

Browser verification limitation: the `playwright-interactive` skill is not exposed in this Codex session (`js_repl` is unavailable). An isolated temporary Playwright runner authenticated successfully to the documented Odoo database and wrote login/runtime probes under `/tmp/core3-odoo-parity/base-batch6-20260912/`, but the direct model URL was not a supported Bank Accounts action route, so those probes are not comparison evidence. Core3 backend startup selected port 3002, then Vite exited with `EMFILE: too many open files, watch .../sample/vite.config.ts`; no authenticated Core3 page could render. No visual parity claim is made for this slice. Images remain outside Git.

## Country detail bounded slice (2026-09-12)

Odoo trace: `addons/contacts/views/contact_views.xml:65-70` defines Contacts → Configuration → Localization → Countries (`menu_country_partner`, sequence 1), targeting `base.action_country`. Odoo 19 `odoo/addons/base/views/res_country_views.xml:7-16` defines `res.country.list` as Country then Code with create/delete disabled; lines 18-63 define `res.country.form` with Country, Currency, Code, Phone Code, VAT Label, ZIP Required, State Required, and an inline State/Code list; lines 65-86 define the Countries search/action (`base.action_country`) and its “No Country Found!” help state.

Core3 implements the visible form at `/base-country-detail?id=US`. `pages/country-detail.yaml` is presentation-only and renders the Odoo field groups; the shared Core3 form primitive has no inline one-to-many renderer, so deterministic states are shown as a read-only summary in the bounded slice. `api/country-detail.yaml` owns the `country_detail` datasource, read/503/not-found states, and the permissioned `edit_country_detail` update contract, joined by `page.id: country-detail`. Migration `20260912130000-015-country-detail.yaml` adds deterministic phone/VAT/required-field values to the existing country fixtures. Countries remains read-only for create/delete, matching the Odoo list/form contract; update requires `base.reference.write` and rejects missing records with `BASE_COUNTRY_NOT_FOUND`.

Focused validation: `test/base_countries.integration.test.ts` passes 3 tests / 23 assertions, covering discovery and route ownership, idempotent fixtures, search/empty/transport states, US detail with California state data, detail not-found/503, update, missing-record guard, and read/write permission declarations. `bun run audit` passes with 608 pages, 617 routes, and 1047 datasources; `bun run frontend:build` passes; `git diff --check` passes.

Browser evidence attempt: Odoo was reachable at `http://127.0.0.1:8069`, but the unauthenticated browser landed at `/web/login?redirect=%2Fodoo%2Fcontacts%3F`; an `admin` / `admin` login attempt remained on `/web/login`. Those unauthenticated attempt images are `/tmp/core3-odoo-parity/base-country-detail-20260912/odoo-desktop.png`, `odoo-mobile.png`, and `odoo-auth-attempt-desktop.png`. Core3 startup was attempted with `bun run dev --db=ddb --memory`; it failed before serving HTTP because the existing unrelated YAML contract error is `Named action sms_marketing.mailings.cancel permission does not match its workflow transition` from `packages/server/src/routes/yaml-api.ts:253`. Consequently no authenticated Core3 or Odoo captures were produced, and no visual-parity claim is made for this slice. Images remain outside Git.

## Contact attachment panel visibility slice (2026-09-13)

The contact detail form now declares `attachment_panel_open: true`, and the
shared Odoo chatter honors that contract. Authenticated Chromium rendered the
attachment panel, seeded `contact-brief.txt`, and the Add attachment control
on `/base/contacts/detail?id=contact-demo` at 1440x900 and 390x844 with no
page/request errors or horizontal overflow. Captures remain outside Git at
`/tmp/core3-base-contact-attachments-qa-desktop.png` and
`/tmp/core3-base-contact-attachments-qa-mobile.png`.

Focused checks pass: client document components 31 tests, Base Contacts 5
tests / 61 assertions, audit (647 pages / 662 routes / 1112 datasources),
frontend build, focused ESLint, and `git diff --check`. The real browser file
upload journey did not return before the runner timeout, so upload persistence
and download delivery remain blocked for QA; this slice claims panel/control
visibility only.

## Contact attachment end-to-end slice (2026-09-13)

Resolved `BASE-ATTACH-001`. Base `storage.yaml` now registers local upload
storage and the `base_contact_attachment` download route. The detail renderer
dispatches the declared upload/download actions, and the form explicitly
propagates its action handler through Chatter and attachment children.

Authenticated Chromium against `http://127.0.0.1:4010` verified upload HTTP
200 for `qa-contact-2.txt`, persistence in the attachment list, and download
of the seeded attachment as `contact-brief.txt`. Desktop 1440x900 and mobile
390x844 both rendered the attachment panel with no page/request errors or
horizontal overflow. Captures remain outside Git at
`/tmp/core3-base-attach-001-desktop.png` and
`/tmp/core3-base-attach-001-mobile.png`.

## Contact chatter message and internal-note slice (2026-09-20)

Odoo 19's `res.partner` form is a mail-thread document: the Contacts form
renders the chatter composer actions `Send message` and `Log note`, and the
mail addon persists each entry against the partner thread. Core3 previously
rendered only deterministic, read-only contact chatter rows. This bounded
slice adds API-owned `send_contact_message` and `log_contact_note` actions to
the existing `contact-detail` contract, with the existing OdooChatter composer
as the user-visible surface.

Migration `20260920130000-019-contact-chatter.yaml` owns the durable
`base_contact_messages` table and one deterministic follow-up fixture. The
actions require `base.contacts.write`, trim and bound content to 4,000
characters, reject missing and cross-company contacts, and record actor,
action label, body, and timestamp. The `contact_messages` datasource reads
both seeded and persisted entries after restart.

Focused evidence: `test/base_contact_chatter.integration.test.ts` covers page
and API separation, both composer actions, message/note persistence, restart,
validation, missing-record, and company-scope guards. The existing Contacts
regression now expects the seeded chatter row as well. Screenshots are not
claimed in this backend/contract slice; paired authenticated Odoo/Core3
composer captures remain a follow-up.

## Contact chatter followers slice (2026-09-21)

Odoo 19's `mail.thread` contact form exposes a follower count/tool beside the
`Send message` and `Log note` composer controls. The live authenticated
reference at `/odoo/contacts/73` showed one follower, the message composer
recipient chip, and the responsive follower/attachment tools. The source
contract is `addons/mail/views/res_partner_views.xml:18` (`<chatter/>`) and
`addons/mail/static/src/chatter/web/chatter.xml:12-25` (composer controls).

Core3 now owns the follower catalog and contact relation in migration
`services/base/migrations/20260921100000-020-contact-followers.yaml`.
`api/contact-detail.yaml` owns the `contact_followers` and
`contact_follower_candidates` datasources plus permissioned
`add_contact_follower` / `remove_contact_follower` actions. The page remains
layout-only and binds these through `page.id: contact-detail`. Add/remove
mutations are company-scoped, require `base.contacts.write`, use the contact
row version, reject duplicate/missing/stale followers, and append durable
audit entries to `base_contact_messages`; reapplying the migration is
idempotent.

Focused validation is `test/base_contact_chatter.integration.test.ts`: 3
tests / 24 assertions. It covers API/page separation, candidate discovery,
add/remove persistence, candidate refresh, audit messages, duplicate and
stale-row guards, and wrong-company rejection.

Authenticated Odoo evidence (browser instance `245ea108`, session stopped
after capture) is outside Git: desktop
`/tmp/odoo-base-contact-chatter-desktop-20260921.png` (SHA-256
`7d6b807af051bdf93f85dc296b21542b9a6ae0981bf72ee87723d824659d83bb`) and
mobile `.../odoo-base-contact-chatter-mobile-20260921.png` (SHA-256
`22266a8fb4899a8a9133a79b18a6cbb3467b6dc38d6259e668d3d1af2e0c9e74`). The
mobile browser observation was 390x844 and showed the same composer and
follower controls; opening the follower control showed `Follow`, `Add
Followers`, and `Remove this follower`. The follower-menu capture is
`/tmp/odoo-base-contact-followers-mobile-20260921.png` (SHA-256
`a1a72c50aeb5aff247ee8e5c0739f59844923296139d07e084859b582f6f7bc6`). Core3
paired authenticated captures are blocked by an
unrelated pre-existing page-discovery failure in another module:
`components[0].filters[6].options[0].id must be a non-empty string`; no Core3
visual-parity claim is made for this slice.

## Contact duplicate workflow slice (2026-09-22)

This bounded slice implements the next uncovered Contacts workflow: Odoo's
contact-detail Actions > Duplicate flow. `pages/contact-detail.yaml` owns the
layout-only Actions menu and `api/contact-detail.yaml` owns the client/server
actions, joined by `page.id: contact-detail`. The durable mutation copies the
contact fields and category relations, names the new row `<source> (copy)`,
and enforces write permission, active/current-company scope, row-version
concurrency, and deterministic duplicate-ID guards. File-backed restart and
second-copy behavior are covered by
`test/base_contact_duplicate.integration.test.ts`.

Local Odoo source and the authenticated live reference were compared. Odoo
visual behavior was observed, but the final Core3 bsk sessions stopped before a
fresh desktop/mobile duplicate capture; the evidence folder records the exact
blocker and makes no visual parity claim.

## Contact export bounded slice (2026-09-22)

Stable ID: `BASE-CONTACTS-EXPORT-001`.

Odoo source comparison: `addons/contacts/views/contact_views.xml` defines the
Contacts window action `action_contacts` on `res.partner`; Odoo's generic list
Action menu provides Export, which reads the current search/filter domain and
downloads a CSV after the export-field dialog. The local Odoo 19 source and
the existing Core3 Contacts page were inspected before implementation. Core3
already displayed an `contacts.export` utility item, but it had no matching
API action and clicking it was a no-op.

Core3 now keeps the layout-only `pages/contacts.yaml` fragment joined to
`api/contacts.yaml` through `page.id: contacts`. API-owned client action
`contacts.export` requires `base.contacts.read`, re-queries the Contacts
datasource with the current active/archive, text, type, and country filters,
pages through all result rows in batches of 100, and downloads a CSV containing
Name, Type, Email, Phone, City, Country, Company, and Active. This bounded
slice is read-only, so it needs no migration; the durable source remains
`base_contacts` and its existing migrations.

Focused validation is `test/base_contacts_export.integration.test.ts`: page/API
separation and action binding, complete default result coverage, filtered
result coverage, CSV generation contract, and read permission are asserted.

Browser evidence is blocked for this worker. BrowserSkill instance `245ea108`
is connected, but borrowing the signed-in Contacts tab failed with the exact
daemon response `tab is borrowed by another session` (the tab is owned by
another active BrowserSkill session). The worker did not navigate an
independent tab, inspect credentials, or bypass the borrow. No desktop/mobile
Odoo or Core3 screenshot is claimed; the exact blocker is recorded in
`evidence/base/2026-09-22/BASE-CONTACTS-EXPORT-001/browser-check.md`.

## Contact child relation bounded slice (2026-09-22)

Stable ID: `BASE-CONTACT-HIERARCHY-CHILDREN-001`.

Odoo source comparison: `odoo/addons/base/models/res_partner.py:215-217`
defines `parent_id` and `child_ids`; `odoo/addons/base/views/res_partner_views.xml:219-289`
renders the Contacts notebook tab as an inline `child_ids` kanban with a
Contact / Address form. Core3 previously supported assigning a parent company
but had no child-contact datasource or nested relation actions on the contact
detail form.

Core3 now adds the API-owned `contact_child_contacts` datasource and
`add_contact_child`, `edit_contact_child`, and `delete_contact_child` line-item
actions to `api/contact-detail.yaml`. `pages/contact-detail.yaml` remains
layout-only and binds the OdooFormView Contacts notebook tab to a shared
`LineItemGrid` through the existing `page.id: contact-detail` contract. The
relation uses the durable `base_contacts` table, seeds `contact-demo-child`
under `company-demo`, and guards required names, duplicate IDs/emails,
active-company scope, parent/child row versions, missing rows, and stale
writes. Reapplying migrations and file-backed restart are covered.

Focused validation is `test/base_contact_children.integration.test.ts`: 3
tests / 26 assertions, included in the full Base run of 48 tests / 448
assertions. The UI audit and frontend build pass; `git diff --check` is
required before handoff.

BrowserSkill evidence is blocked. Shared browser instance `245ea108` was
healthy, but the signed-in Contacts tab `1770662590` was already borrowed by
session `ioxf`; the exact response was `tab is borrowed by another session`.
The worker stopped its own session without opening an independent tab or
reading credentials. No Odoo/Core3 desktop or mobile capture, and no visual
parity claim, is made. Details are in
`evidence/base/2026-09-22/BASE-CONTACT-HIERARCHY-CHILDREN-001/`.

## Contact merge wizard bounded slice (2026-09-22)

Stable ID: `BASE-CONTACT-MERGE-001`.

Odoo source comparison: Odoo 19 `odoo/addons/base/wizard/base_partner_merge_views.xml:103-110`
binds `action_partner_merge` to the `res.partner` list and kanban action menu,
opening the `Automatic Merge Wizard` in a modal. Its manual selection state
chooses a destination contact, shows selected contact rows, and exposes
`Merge Contacts` and `Cancel`; `odoo/addons/base/wizard/base_partner_merge.py:410-473`
limits a merge to two or three contacts, rejects parent/child pairs and
differing emails for normal users, redirects related records, and removes
source contacts.

Core3 was missing the list/kanban bulk action, destination form, durable
mutation, related-record reparenting, and audit record. Core3 now keeps
`pages/contacts.yaml` layout-only and joins it to `api/contacts.yaml` through
`page.id: contacts`. The API owns `contact_merge_destinations` and the
permissioned `merge_contacts` server form under `base.contacts.manage`.
Migration `20260922150000-022-contact-merge.yaml` adds deterministic
same-email merge candidates and `base_contact_merge_log`; the mutation
reparents Base-owned activities, chatter messages, attachments, followers,
bank accounts, categories, and child references before deleting sources.
Active/current-company, two-or-three selection, same-email, hierarchy,
destination membership, destination row-version, and stale-write guards are
covered by `test/base_contact_merge.integration.test.ts` (3 tests / 22
assertions), including file-backed restart and idempotent migration replay.

BrowserSkill comparison blocker: Browser instance `245ea108` reported the
signed-in Contacts tab `1770662590` in the user scope, but
`bsk tab borrow 1770662590 --session xcvu` remained pending/unknown and never
placed the tab in the agent scope. After state inspection the worker stopped
session `xcvu`; it did not navigate, log in independently, inspect credentials,
or use Playwright. Odoo/Core3 desktop and mobile captures are therefore not
available for this feature and no visual-parity claim is made. Evidence is in
`evidence/base/2026-09-22/BASE-CONTACT-MERGE-001/`.

## Contact activity completion bounded slice (2026-09-22)

Stable ID: `BASE-CONTACT-ACTIVITY-COMPLETE-001`.

Odoo source comparison: Odoo 19 `addons/mail/views/mail_activity_views.xml:277-284`
declares the Next Activities list actions `action_done` (Done), `action_cancel`
(Cancel), and rescheduling actions. `addons/mail/models/mail_activity.py:451-485`
marks active activities done through `action_feedback`, while lines 647-650
cancel by unlinking the active activity. Core3 previously allowed contacts to
schedule and open activities but had no completion/cancellation mutation.

Core3 now extends the API-owned `contact-detail` contract with
`complete_contact_activity` and `cancel_contact_activity`, binds both actions
to the contact activity list, and exposes completion timestamp and row version
fields. Migration `20260922170000-023-contact-activity-completion.yaml` adds
durable `row_version` and `completed_at` columns to `base_activities`.
Completion and cancellation require `base.activities.write`, a signed-in
actor, current-company scope, planned state, and the expected row version;
completion persists `done`/timestamp state and both mutations write a durable
contact chatter audit entry.

Focused validation is `test/base_contact_activity_completion.integration.test.ts`
(3 tests, 25 assertions). It covers source/action mapping, page/API
separation, idempotent migration, planned reads, actor/company/stale guards,
durable completion, cancellation, and chatter audit persistence.

BrowserSkill was attempted against the shared authenticated Odoo tab
`1770662590` in instance `245ea108`, but explicit borrowing was denied because
the tab was already borrowed by session `trfx`. The worker did not retry,
navigate independently, inspect credentials, or use Playwright; its BrowserSkill
session `aotm` was stopped. No Odoo desktop/mobile capture or visual-parity
claim is made. Evidence is in
`evidence/base/2026-09-22/BASE-CONTACT-ACTIVITY-COMPLETE-001/`.

Remaining gaps for this slice are feedback/attachments on completion, the
standalone Activities menu and activity form parity, and authenticated paired
visual evidence.

## Contact activity rescheduling bounded slice (2026-09-22)

Stable ID: `BASE-CONTACT-ACTIVITY-RESCHEDULE-001`.

Odoo source comparison: `addons/mail/views/mail_activity_views.xml:277-295`
binds the Next Activities list header to Today, Tomorrow, and Next Week
reschedule actions and exposes row reschedule controls. The implementations in
`addons/mail/models/mail_activity.py:638-645` set active deadlines to today,
tomorrow, or the Monday of next week.

Core3 keeps `pages/contact-detail.yaml` layout-only and extends the existing
`contact-detail` API contract with bulk and row reschedule actions. The page
binds selectable activity rows, bulk actions, and a row action menu. The API
updates only planned activities, applies current-company and authenticated
actor guards, increments `row_version`, and uses database date arithmetic for
the three Odoo deadlines. No migration was needed because activity row
versions were added by the preceding completion slice.

Focused validation is `test/base_contact_activity_reschedule.integration.test.ts`:
3 tests / 29 assertions. It covers source/action mapping, page/API separation,
bulk Today/Tomorrow/Next Week persistence, row-action concurrency, actor and
company boundaries, planned-state rejection, and file-backed restart.

Authenticated paired visual evidence remains blocked by the shared BrowserSkill
tab borrow: instance `245ea108`, Contacts tab `1770662590`, exact daemon
response `tab is borrowed by another session` from session `gvwd`. The worker
did not retry, open an independent tab, inspect credentials, or use Playwright.
Details are in
`plan/odoo-ui-parity/evidence/base/2026-09-22/BASE-CONTACT-ACTIVITY-RESCHEDULE-001/`.

## Contact activity feedback bounded slice (2026-09-22)

Stable ID: `BASE-CONTACT-ACTIVITY-FEEDBACK-001`.

Odoo source comparison: `addons/mail/models/mail_activity.py:482-485`
defines `action_feedback(feedback=False, attachment_ids=None)` and passes the
feedback into `_action_done`; `addons/mail/models/mail_activity.py:514-600`
posts the completion message and archives the activity. Core3 now exposes a
`complete_contact_activity_feedback` server form from the contact activity
list. It requires `base.activities.write`, an authenticated actor, current
company scope, planned state, the expected row version, and 1-4000 characters
of feedback. The mutation persists feedback, done state, completion time,
row-version increment, and a chatter audit detail. Migration `0.0.24` adds the
durable feedback field. The page remains layout-only and joins the API by
`page.id: contact-detail`.

Focused validation is
`test/base_contact_activity_feedback.integration.test.ts`: 2 tests / 17
assertions. Contacts regression remains green at 15 tests / 121 assertions.
The implementation does not claim Odoo attachment transfer, standalone
Activities-menu parity, activity form parity, or authenticated paired visual
evidence. Evidence is in
`evidence/base/2026-09-22/BASE-CONTACT-ACTIVITY-FEEDBACK-001/`.
