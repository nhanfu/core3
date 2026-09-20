# Employees detailed QA test plan

Module: employees  
QA owner: employees-qa  
Developer owner: employees module owner  
Reference addon/version: hr, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This checklist follows [`employees.md`](../../employees.md); executed results
are recorded in [`../employees.md`](../employees.md).

## Coverage inventory

| Menu/action family | Core3 routes | Scope |
| --- | --- | --- |
| People | `/employees`, `/employees/directory`, `/employees/detail`, `/employees/employee/analysis`, `/employees/activities` | Kanban/List/Cards/Activity/Graph/Pivot, directory-safe fields, employee detail tabs and activity queue |
| Configuration | `/employees/activity-plans`, `/employees/activity-plans/detail`, `/employees/work-locations`, `/employees/work-locations/detail`, `/employees/working-schedules`, `/employees/working-schedules/detail`, `/employees/departure-reasons`, `/employees/departure-reasons/detail`, `/employees/settings` | CRUD, manager/settings boundaries, archive/restore and linked records |
| Recruitment/configuration | `/employees/jobs`, `/employees/jobs/detail`, `/employees/contract-templates`, `/employees/contract-templates/detail`, `/employees/employment-types` | List/form, validation, active/archive and manager actions |
| Learning/records | `/employees/skill-types`, `/employees/skill-types/detail`, `/employees/certifications`, `/employees/certifications/detail`, `/employees/training-attendances`, `/employees/versions`, `/employees/departments`, `/employees/departments/detail` | Relation-backed lists/forms, reporting, certifications and employee records |

Actors: HR manager, HR user, ordinary directory user, Fleet ordinary user,
wrong-company user and unauthenticated user. Stable fixtures include
`employee-demo-001..004`, fixed departments, jobs, activity plans, schedules,
work locations, departure reasons, skill/certification rows and employee
versions.

## Functional and data cases

| Case ID | Class | Route/action | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| EMP-FUNC-001 | functional | Employees list/detail | Search/filter/group/sort/paginate, open detail and edit Work/Resume/Personal/Payroll/Settings tabs | focused suite; route matrix | pass |
| EMP-FUNC-002 | functional | Employee CRUD/lifecycle | Create/edit/archive/restore with required fields, stable row versions and reload persistence | focused suite; browser archive/restore | pass |
| EMP-FUNC-003 | functional | Directory/all activities | Public fields only; activity filters include active employees with activities | focused tests | pass |
| EMP-FUNC-004 | functional | Departments/jobs/types | CRUD, search, archive/restore, duplicate, in-use and missing guards | focused suites | pass |
| EMP-FUNC-005 | functional | Plans/schedules/locations | CRUD, links, schedule validation and archive/restore persist | focused suites | pass |
| EMP-FUNC-006 | functional | Learning/certifications/records | Skill types, certification validity, training attendance and version records use relation-backed data | focused suites | pass |
| EMP-FUNC-007 | functional | Empty/error/not-found | Every registered list/detail/report exposes deterministic empty, missing and transport-error states | focused suites; matrix | planned |
| EMP-FUNC-008 | data | Migrations/seeds | Reapply migrations on clean/existing development DB without duplicates or moving fixture dates | focused suites | pass |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Expected side effect | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| EMP-WF-001 | workflow | Employee archive/restore | Explicit action values override submitted form state; active/action visibility changes and survives reload | stale/missing row returns 409/404 | pass |
| EMP-WF-002 | workflow | Activity plans | Launch/onboarding/offboarding plans preserve ordered steps and responsible role | duplicate/retry does not duplicate steps | planned |
| EMP-WF-006 | workflow | Register Departure wizard | Active employee departure records reason/details/date, archives atomically, optionally closes contract and removes an unshared related user | invalid contract date, stale, missing, reason, company, and retry leave the employee unchanged | pass |
| EMP-WF-007 | workflow | Create User modal | ERP-manager creates one durable invited auth user from employee defaults and links it back to the employee | duplicate login, existing link, stale/missing employee, invalid login, and failed link roll back the user insert | pass |
| EMP-WF-003 | integration | Department/category links | Counts and linked forms stay consistent when records change | in-use delete returns 409 without dangling rows | pass |
| EMP-WF-004 | integration | Employee records/contract | Version/contract state and validity reports remain deterministic | invalid dates and stale update are rejected | pass at contract level |
| EMP-WF-005 | integration | Durable/external boundary | Mail, timers, payroll/resource integrations use Temporal when long-running or cross-module | replay/restart/retry/timeout/compensation before activation | planned |

## Permission and security cases

| Case ID | Actor/scope | Route/API/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| EMP-PERM-001 | HR manager | Configuration/settings/CRUD | Allowed and persisted | planned |
| EMP-PERM-002 | HR user | Employee and learning writes | Allowed only for declared `employees.write` scope | planned |
| EMP-PERM-003 | Directory user | `/employees/directory` | Public fields visible; private HR fields excluded | planned |
| EMP-PERM-004 | Fleet ordinary user | settings/direct mutations | 403 and no mutation | read/settings boundary pass; write probe planned |
| EMP-PERM-005 | Wrong company | list/detail/update | No cross-company leakage or update | planned |
| EMP-PERM-006 | Unauthenticated/expired | all routes/APIs | Redirect/401/403 without data leakage | planned |
| EMP-PERM-007 | Stale/missing | mutations | 409/404/422 and unchanged database state | pass |
| EMP-PERM-008 | ERP manager | Employee Create User | `auth.users.manage` can create the linked invited user; an ordinary Employees writer cannot invoke it | pass |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| EMP-UI-001 | Employee list/detail | 1440x900, 390x844 | Odoo menu, tabs, fields, statusbar, actions, cards and overflow match | partial |
| EMP-UI-002 | Directory/activity/report | both | Public-safe columns, activity controls, Graph/Pivot and filters match | partial |
| EMP-UI-003 | Configuration forms | both | Forms, dialogs, status/actions, settings full-width behavior and permissions match | partial |
| EMP-UI-004 | Current route regression | all 28 manifest routes | 56 authenticated checks with no page/request/HTTP errors, blank states or overflow | pass |

## Exit criteria

- Every current Employees route/action family has functional, permission,
  persistence, responsive and visual cases.
- Full sign-off requires paired Odoo comparison, actor mutation probes, and
  restart persistence in addition to the route matrix.

## EMP-LAUNCH-PLAN-001 execution (2026-09-20)

| Case | Scope | Result |
| --- | --- | --- |
| EMP-WF-008 | Employee detail Launch Plan action, ordered expansion, retry | pass; 4 focused tests / 33 assertions |
| EMP-PERM-009 | employees.write, row-version, active/company/eligible-plan guards | pass |
| EMP-UI-005 | Authenticated Core3/Odoo desktop and mobile captures | captured; company fixture mismatch and narrow Odoo action visibility recorded as blockers |

The route matrix is enumerated in
`evidence/employees/2026-09-20/EMP-LAUNCH-PLAN-001/route-matrix.json`.

## EMP-ROUTE-CRUD-GATE-001 execution (2026-09-20)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-MATRIX-001 | All 28 parameterized Employees routes, desktop/mobile, seeded detail IDs | pass 56/56 after settled-route retry |
| EMP-CRUD-009 | Authenticated Admin create/edit/archive/restore employee | pass; persisted browser states captured |
| EMP-ACTOR-009 | Admin, Fleet ordinary user, unauthenticated settings/detail boundary | pass; Admin allowed, Fleet 403, unauthenticated redirected |
| EMP-OODOO-005 | Paired Odoo Employees list/detail desktop/mobile | pass; no failed requests or page errors |

The browser artifacts are under
`evidence/employees/2026-09-20/EMP-ROUTE-CRUD-GATE-001/`. No new source-backed
feature was missing after the settled route/data/permission pass.

## EMP-TEMPLATE-LOAD-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-010 | Employee Payroll / Load a Template | Eligible company template copies to employee and active version; stale/retry is safe | pass |
| EMP-PERM-010 | Template actor/company boundary | employees.write is required; wrong company, inactive employee, ineligible template, and stale row reject without writes | pass |
| EMP-DATA-010 | Restart durability | Template provenance and copied fields remain after migration replay and DuckDB restart | pass |
| EMP-UI-006 | Core3/Odoo desktop and mobile | Odoo modal captured; Core3 authenticated company/fixture mismatch is an exact blocker | conditional |

## EMP-BARCODE-GENERATE-001 execution (2026-09-20)

| Case | Scope | Result |
| --- | --- | --- |
| EMP-WF-011 | Employee Settings Generate Badge ID, durable output and retry | pass; 4 focused tests / 23 assertions |
| EMP-PERM-011 | Actor, `employees.write`, company, active, stale and uniqueness guards | pass |
| EMP-DATA-011 | Unique index migration replay and DuckDB restart | pass |
| EMP-UI-007 | Authenticated Core3/Odoo desktop/mobile Settings comparison | Odoo pass; Core3 exact company/fixture blocker recorded |

Evidence: `evidence/employees/2026-09-20/EMP-BARCODE-GENERATE-001/`.
Verification: full Employees **65 tests / 658 assertions**, audit **673 pages /
682 routes / 1,219 datasources**, focused ESLint, and diff-check pass.

## EMP-PRINT-BADGE-001 execution (2026-09-20)

| Case | Scope | Result |
| --- | --- | --- |
| EMP-WF-012 | Employee detail Print Badge action, printable badge page, durable history | pass; 4 focused tests / 30 assertions |
| EMP-PERM-012 | `employees.read`, actor/company identity, barcode and stale guards | pass |
| EMP-DATA-012 | Report history migration replay and DuckDB restart | pass |
| EMP-UI-008 | Authenticated Core3/Odoo desktop/mobile comparison | Odoo pass with PDF download; Core3 exact pre-auth Auth schema blocker |

Evidence: `evidence/employees/2026-09-20/EMP-PRINT-BADGE-001/`.
Full Employees rerun records 57 pass / 12 fail across 69 tests because of the
concurrent Surveys duplicate action `print_survey_results`; audit remains
green at 675 / 684 / 1,225 and Employees-scoped lint/diff-check pass.

## EMP-LOAD-SAMPLE-DATA-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-013 | Empty Employees / Load Sample Data | Three deterministic current-company employees and departments are created; retry rejects without duplication | pass |
| EMP-PERM-013 | Actor/company boundary | Authenticated `employees.write` actor and current company required; non-empty scope rejects; Fleet cannot read or invoke | pass |
| EMP-DATA-013 | Replay/restart | Audit row and employee rows survive migration replay and file-backed restart | pass |
| EMP-UI-009 | Core3/Odoo desktop and mobile | Core3 Admin action/create/reload pass; Odoo seeded list pass, empty action not rendered because reference company is non-empty | conditional |

Evidence: `evidence/employees/2026-09-20/EMP-LOAD-SAMPLE-DATA-001/`.

## EMP-BANK-ACCOUNT-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-014 | Personal bank-account add/edit/delete and allocation | Durable line-item CRUD with allocation guard | pass |
| EMP-PERM-014 | Actor/company/active/duplicate/stale boundaries | Invalid mutations reject atomically | pass |
| EMP-DATA-014 | Migration replay and file-backed restart | Rows and mutations persist | pass |
| EMP-UI-010 | Authenticated Core3/Odoo desktop and mobile | Populated comparison | conditional; exact fixture/reference-data blockers recorded |

Evidence: `evidence/employees/2026-09-20/EMP-BANK-ACCOUNT-001/`.

## EMP-EMERGENCY-CONTACT-001 execution (2026-09-20)

| Case ID | Class | Route/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| EMP-WF-015 | workflow | Employee detail Personal / Emergency Contact | Create and edit contact and phone durably | pass |
| EMP-PERM-015 | permission/security | Employee detail API edit | Employees write, company, missing and stale guards enforce scope | pass |
| EMP-DATA-015 | data/regression | Migration replay and restart | Seeded fields persist without duplicate migration effects | pass |
| EMP-UI-011 | visual/responsive | Authenticated Core3/Odoo Personal tab | Emergency Contact group visible at desktop/mobile | conditional; Odoo pass, Core3 exact shared-discovery blocker |

Evidence: `evidence/employees/2026-09-20/EMP-EMERGENCY-CONTACT-001/`.

## EMP-FAMILY-INFO-001 execution (2026-09-20)

| Case ID | Class | Route/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| EMP-WF-016 | workflow | Employee detail Personal / Family | Create and edit marital, spouse, and dependent-child values durably | pass |
| EMP-PERM-016 | permission/security | Employee detail API edit | Employees write, company, stale, marital, date, and count guards enforce scope | pass |
| EMP-DATA-016 | data/regression | Migration replay and restart | Seeded family fields persist without duplicate effects | pass |
| EMP-UI-012 | visual/responsive | Authenticated Core3/Odoo Personal tab | Family group and conditional spouse fields visible at desktop/mobile | pass; Odoo shell noise recorded |

Evidence: `evidence/employees/2026-09-20/EMP-FAMILY-INFO-001/`.

## EMP-EDUCATION-001 execution (2026-09-20)

| Case ID | Class | Route/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| EMP-WF-017 | workflow | Employee detail Personal / Education | Durable certificate and study-field CRUD | pass |
| EMP-PERM-017 | permission/security | Employee detail API edit | Write, company, stale, and certificate guards | pass |
| EMP-DATA-017 | data/regression | Migration replay/restart | Fixtures persist without duplicates | pass |
| EMP-UI-013 | visual/responsive | Authenticated Core3/Odoo Personal tab | Education visible desktop/mobile | conditional; exact Core3 blocker recorded |

Evidence: `evidence/employees/2026-09-20/EMP-EDUCATION-001/`.

## EMP-BIRTH-IDENTITY-001 execution (2026-09-20)

| Case ID | Class | Route/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| EMP-WF-018 | workflow | Employee detail Personal / birth identity | Durable place, country, and gender CRUD | pass |
| EMP-PERM-018 | permission/security | Employee detail API edit | Write, company, stale, and gender guards | pass |
| EMP-DATA-018 | data/regression | Migration replay/restart | Fixtures persist without duplicates | pass |
| EMP-UI-014 | visual/responsive | Authenticated Core3/Odoo Personal tab | Desktop/mobile comparison | conditional; exact blockers recorded |

Evidence: `evidence/employees/2026-09-20/EMP-BIRTH-IDENTITY-001/`.

## EMP-EMPLOYEE-SKILLS-001 execution (2026-09-20)

| Case ID | Class | Route/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| EMP-WF-019 | workflow | Employee detail Work / Skills | Durable add and archive assignment | pass |
| EMP-PERM-019 | permission/security | Employee skill line action | Actor, company, catalog, duplicate, date, and stale guards | pass |
| EMP-DATA-019 | data/regression | Migration replay/restart | Fixture assignments persist without duplicates | pass |
| EMP-UI-015 | visual/responsive | Authenticated Core3/Odoo Work tab | Desktop/mobile skill comparison | conditional; exact blockers recorded |

Evidence: `evidence/employees/2026-09-20/EMP-EMPLOYEE-SKILLS-001/`.

## EMP-RESUME-LINES-001 execution (2026-09-20)

| Case ID | Class | Route/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| EMP-WF-020 | workflow | Employee detail Resume / Resume Lines | Durable add, edit, and delete | pass |
| EMP-PERM-020 | permission/security | Employee resume line actions | Actor, company, catalog, date, duplicate, and stale guards | pass |
| EMP-DATA-020 | data/regression | Migration replay/restart | Fixtures persist without duplicates | pass |
| EMP-UI-016 | visual/responsive | Authenticated Core3/Odoo Resume tab | Desktop/mobile comparison | conditional; exact blockers recorded |

Evidence: `evidence/employees/2026-09-20/EMP-RESUME-LINES-001/`.

## EMP-BANK-TRUST-001 test plan (2026-09-21)

| Test | Expected evidence | Result |
| --- | --- | --- |
| Source/action mapping | Odoo method/view button map to page/API-separated Core3 row action | pass |
| Toggle lifecycle | Deterministic bank rows flip `trusted`, increment line and parent versions, and return the updated row | pass |
| Permission and scope | Empty actor, wrong company, stale employee, and stale bank row reject without partial writes | pass |
| Persistence | Existing bank-account migration replays idempotently and trusted state survives a file-backed restart | pass |
| Browser comparison | Core3 desktop/mobile plus authenticated Odoo desktop/mobile Personal bank-account surface | conditional; exact Core3 discovery and Odoo fixture blockers recorded |

Focused test: `test/employees_bank_account_trust.integration.test.ts` (3
tests, 20 assertions). Evidence:
`evidence/employees/2026-09-21/EMP-BANK-TRUST-001/`.

## EMP-CREATE-USER-001 execution (2026-09-20)

| Case | Scope | Result |
| --- | --- | --- |
| EMP-WF-021 | ERP-manager Create User workflow | Contract, invited-user persistence, employee link, and Odoo modal defaults | pass; 4 focused tests / 30 assertions |
| EMP-PERM-021 | Permission/company/concurrency boundary | `auth.users.manage`, current-company, duplicate login/link, missing, invalid, and stale guards reject atomically | pass |
| EMP-DATA-021 | Restart durability | Migration replay and file-backed restart retain the disabled invited user and employee link | pass |
| EMP-UI-017 | Authenticated responsive comparison | Odoo desktop/mobile modal pass; Core3 desktop/mobile fixture-company boundary is explicit, with missing-record Create User hidden | conditional |

Evidence: `evidence/employees/2026-09-20/EMP-CREATE-USER-001/`.

## EMP-EMPLOYEE-VERSION-DETAIL-001 execution (2026-09-21)

| Case | Scope | Result |
| --- | --- | --- |
| EMP-WF-022 | Employee Records row-open snapshot | Source `action_open_version`, Core3 row navigation, read-only snapshot fields, and Open employee action | pass; 3 focused tests / 21 assertions |
| EMP-PERM-022 | Read/company boundary | `employees.read` is required and an out-of-company or missing version yields an empty detail record | pass |
| EMP-DATA-022 | Durable version fixtures | Current, future, archived, and expired rows persist through replay and file-backed restart | pass |
| EMP-UI-018 | Authenticated responsive comparison | Core3 exact fixture-company blocker; Odoo desktop list/detail and mobile authenticated detail evidence | conditional |

Evidence: `evidence/employees/2026-09-21/EMP-EMPLOYEE-VERSION-DETAIL-001/`.
