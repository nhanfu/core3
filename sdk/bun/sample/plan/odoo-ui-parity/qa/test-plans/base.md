# Base and Contacts detailed QA test plan

Module: base  
QA owner: base-qa  
Developer owner: base module owner  
Reference addon/version: base and contacts, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This checklist follows [`base-contacts.md`](../../base-contacts.md); executed
evidence remains in [`../base.md`](../base.md).

## Coverage inventory

| Menu/action family | Core3 routes | Scope |
| --- | --- | --- |
| Contacts | `/base/contacts`, `/base/contacts/detail`, `/base/activity-detail` | List/Card/Kanban, detail, activities, chatter, smart buttons and relational data |
| Companies | `/base/companies`, `/base/company-detail` | List/card/form, hierarchy, archive and linked counts |
| Localization | `/base/base-countries`, `/base/base-country-detail`, `/base/base-fed-states`, `/base/base-country-groups`, `/base/base-country-groups/new`, `/base/base-country-group-detail` | Read catalogs and Country Groups CRUD/multi-country form |
| Configuration catalogs | `/base/base-industries`, `/base/base-contact-tags`, `/base/category-detail`, `/base/base-banks`, `/base/base-bank-detail`, `/base/base-partner-bank-accounts`, `/base/base-partner-bank-account-detail` | List/form, search, archive, relation and validation states |
| Users/reference data | `/base/users`, `/base/user-detail`, `/base/user-groups`, `/base/user-group-detail`, `/base/base-reference-data`, `/base/currency-detail`, `/base/language-detail` | Permissioned administration and read-only reference screens |

Actors: Administrator, Base manager/user, ordinary Fleet user,
unauthenticated user, wrong-company scope, and dependent CRM/Purchase/Live
Chat callers. Stable fixtures include `contact-demo`, companies, tags,
countries, states, industries, bank accounts, country groups, users and
activities.

## Functional and data cases

| Case ID | Class | Route/action | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| BASE-FUNC-001 | functional | Contacts/company list/detail | Search/filter/group/paginate, open detail, edit/save/discard and preserve relation fields after reload | focused contacts/companies tests | pass |
| BASE-FUNC-002 | functional | Contact activity/chatter/stats | Schedule activity, send message, log internal note, view timeline and stat counts with deterministic records | focused contacts/chatter tests | pass at contract level |
| BASE-FUNC-010 | functional/data/permission | Contact chatter followers | Discover candidates, add/remove a follower, persist the relation and audit entry, refresh the candidate list, and enforce company/write/stale/duplicate guards | `test/base_contact_chatter.integration.test.ts`; paired browser evidence | pass at contract level; Core3 visual blocked |
| BASE-FUNC-003 | functional | Country groups | Create/edit/delete groups and multi-select countries; duplicate/required/stale guards persist | country group tests | pass |
| BASE-FUNC-004 | functional | Banks/partner bank accounts | CRUD, relation validity, archive/restore, duplicate and in-use guards | bank tests | pass |
| BASE-FUNC-005 | functional | Companies/tags/industries | CRUD/search/archive and linked record constraints | focused catalog tests | pass |
| BASE-FUNC-006 | functional | Countries/states/reference | Read-only catalogs, search, empty and transport-error states | catalog tests | pass |
| BASE-FUNC-007 | data | Migration/seed | Reapply schema/demo data with fixed IDs/dates and no duplicates | focused suites | pass |
| BASE-FUNC-008 | data | Empty/error/not-found | Every current route returns explicit empty, missing and transport-error behavior | focused suites; matrix | planned |
| BASE-FUNC-009 | functional | Attachments/import/export/bulk | Upload/download, import/export and bulk archive/delete are exercised when renderer/actions are available | attachment journey covered; import/export and bulk remain deferred | partial |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Expected result | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| BASE-WF-001 | workflow | Contact archive/restore | Active filter changes and state survives reload | stale/missing record returns 409/404 | pass at contract level |
| BASE-WF-002 | integration | CRM contact lookup/create | Allowlisted service returns contacts and creates/links contact safely | missing permission/downstream failure leaves source unchanged | pass at contract level |
| BASE-WF-003 | integration | Purchase vendor/contact relation | Vendor and bank relations remain scoped and valid | deleting in-use relation is rejected | pass at contract level |
| BASE-WF-004 | integration | Live Chat/contact stat | Stat navigation returns contact-scoped history | missing contact yields safe empty/not-found | pass at contract level |
| BASE-WF-005 | integration | Durable external boundary | Mail, file, webhook, or long-running cross-module actions use Temporal when activated | retry/timeout/compensation/replay/restart required | planned |

## Permission and security cases

| Case ID | Actor/scope | Route/API/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| BASE-PERM-001 | Administrator/manager | all Base CRUD/configuration | Allowed and persisted | planned |
| BASE-PERM-002 | Base user | contact ordinary operations | Only declared read/write actions allowed | planned |
| BASE-PERM-003 | Fleet ordinary user | direct Base mutation/settings | 403 and no database changes | planned |
| BASE-PERM-004 | Wrong company | contact/company/bank detail | No cross-company leakage or update | planned |
| BASE-PERM-005 | Unauthenticated/expired | all routes/APIs | Redirect/401/403 without data leakage | planned |
| BASE-PERM-006 | Stale/missing | mutations | 409/404/422 and unchanged current row | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| BASE-UI-001 | Contacts list/detail | 1440x900, 390x844 | Odoo menu, tabs, cards, form sections, smart buttons, chatter and overflow match | Odoo follower/composer captures; Core3 capture blocked by unrelated discovery error | partial |
| BASE-UI-002 | Configuration lists/forms | both | Menu ordering, labels, columns, relational controls and responsive forms match | partial |
| BASE-UI-003 | Empty/error/permission | both | Correct empty, error, denied and missing-record states are visible and safe | planned |
| BASE-UI-004 | Current route regression | all 26 manifest routes | 52 authenticated checks with no page/request/HTTP errors, blank states or overflow | pass |

## Exit criteria

- Every current Base route/action family has functional, security, persistence,
  responsive and visual cases.
- Attachment journey, import/export/bulk controls, richer configuration, and
  paired Odoo comparison remain explicit sign-off gates.
