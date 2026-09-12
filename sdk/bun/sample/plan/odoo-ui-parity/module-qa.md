# Odoo UI parity module QA and bug-fix ledger

This is the single shared tester ledger. Test cases and bug fixes are merged
into one file but separated by module. The shared tester owns every section;
module agents retain ownership until their module is signed off or source
blocked. Screenshots remain under `/tmp/core3-odoo-parity/` and are never
committed.

## Shared case categories

Every module section uses these cases where applicable:

| Case | Required verification |
| --- | --- |
| UI-001 | Odoo menu tree, action, ordering, labels, and visibility |
| UI-002 | Authenticated desktop comparison at 1440x900 |
| UI-003 | Authenticated mobile comparison at 390x844 with overflow check |
| UI-004 | Populated, empty, filtered, error, and permission states |
| UI-005 | Visible List/Kanban/Form/Pivot/Graph/Calendar navigation |
| UI-006 | Search, filters, grouping, navigation, CRUD, and dialogs |
| UI-007 | Deterministic fixture/data and visible-field coverage |
| UI-008 | Permission boundaries |
| UI-009 | Focused tests, audit, lint, and diff check after repairs |
| UI-010 | Tester sign-off or exact blocker |

For each module, complete the test table first and record every related repair
in the bug table directly below it. Do not claim visual evidence from static
YAML, readiness probes, or unauthenticated login pages.

## Module sections

The following sections are intentionally separate even though they share one
file. Add concrete rows beneath the relevant module; do not create another
ledger file.

### base

| Test ID | Odoo action/route | Core3 route | State | Desktop | Mobile | Result | Tester/date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BASE-TBD | pending | pending | pending | pending | pending | pending | shared tester |

| Bug ID | Mismatch/failure | Evidence | Owner | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BF-004 | Extra `company-northwind` fixture row in independent Base test | test output | base agent | — | pending | open |

### chat
### crm

| Test ID | Odoo action/route | Core3 route | State | Desktop | Mobile | Result | Tester/date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CRM-PIPELINE-20260912 | `crm.crm_opportunity_report_action` / Pipeline Analysis | `/crm/analysis` | active opportunity analysis | Core3 capture present | Core3 capture present | contract correction verified; Odoo authentication throttled, no visual sign-off | shared tester 2026-09-12 |

| Bug ID | Mismatch/failure | Evidence | Owner | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CRM-BF-001 | Core3 used expected-closing month and My Pipeline default instead of Odoo creation-month pivot contract | Odoo source trace and focused test | crm agent | `90e349fd` | 2 tests / 20 assertions, audit, lint | fixed; visual retest open |

### order

| Test ID | Odoo action/route | Core3 route | State | Desktop | Mobile | Result | Tester/date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SALES-TEMPLATE-20260912 | `sale.mail_template_menu` / Quotation Templates | `/order/quotation-templates` | populated list and detail | Core3 capture present | Core3 capture present | Odoo files were unauthenticated login pages; no visual sign-off | shared tester 2026-09-12 |

| Bug ID | Mismatch/failure | Evidence | Owner | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SALES-BF-001 | Reference login throttle prevented fresh authenticated Odoo comparison | capture directory | shared tester | `64c9022a` | Core3 rendered list/detail only | open |
### point-of-sale
### sale-subscription
### sale-renting
### accounting

| Test ID | Odoo action/route | Core3 route | State | Desktop | Mobile | Result | Tester/date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ACCOUNTING-SALES-20260912 | Sales journal items action | `/accounting/sales` | populated list | Core3 capture attempted | pending | reference authentication throttled; no visual sign-off | shared tester 2026-09-12 |

### expenses

| Test ID | Odoo action/route | Core3 route | State | Desktop | Mobile | Result | Tester/date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EXP-TBD | pending | pending | pending | pending | pending | pending | shared tester |

| Bug ID | Mismatch/failure | Evidence | Owner | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- |
| — | none registered | — | shared tester | — | — | clear |

### documents
### approvals
### spreadsheet

### inventory

| Test ID | Odoo action/route | Core3 route | State | Desktop | Mobile | Result | Tester/date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INV-TBD | pending | pending | pending | pending | pending | pending | shared tester |

| Bug ID | Mismatch/failure | Evidence | Owner | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BF-001 | Recursive Vite watcher hit `EMFILE` during captures | runtime logs | runtime owner | `b6f4c931` | Core3 single-module runner rendered both viewports | Core3 resolved; paired Odoo open |

### manufacturing
### purchase
### maintenance

| Test ID | Odoo action/route | Core3 route | State | Desktop | Mobile | Result | Tester/date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MAINTENANCE-DASHBOARD-20260912 | Maintenance team dashboard | `/maintenance` | populated team cards | Core3 capture present | Core3 capture present | Top Priorities action and card rendering verified; Odoo authentication throttled | shared tester 2026-09-12 |

| Bug ID | Mismatch/failure | Evidence | Owner | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MAINTENANCE-BF-001 | Card actions were declared in YAML but not rendered or counted | focused client/integration tests | maintenance agent | `2e64e62e` | 3 integration tests / 36 client tests | fixed; visual retest open |
### field-service
### helpdesk
### quality
### plm
### employees

| Test ID | Odoo action/route | Core3 route | State | Desktop | Mobile | Result | Tester/date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EMPLOYEES-WORK-20260912 | `hr.employee` Work tab | `/employees` | active employee detail | Core3 capture present | Core3 capture present | import-map and conditional-group repairs verified; Odoo authentication throttled | shared tester 2026-09-12 |

| Bug ID | Mismatch/failure | Evidence | Owner | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- |
| EMPLOYEES-BF-001 | ActivityView import was missing and inactive-only form groups rendered unconditionally | browser error and focused test | employees agent | `a618fe94` | 1 client test, audit, lint | fixed; visual retest open |
### recruitment
### time-off
### appraisals
### referrals
### fleet
### email-marketing
### sms-marketing
### events
### surveys
### marketing-automation
### project

### timesheets

| Test ID | Odoo action/route | Core3 route | State | Desktop | Mobile | Result | Tester/date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TIMESHEET-TBD | pending | pending | pending | pending | pending | pending | shared tester |

| Bug ID | Mismatch/failure | Evidence | Owner | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BF-003 | Inline mutation in embedded task grid is deferred | timesheets plan | timesheets agent | — | pending | open |

### website
### ecommerce
### blog
### forum
### livechat

## Tester sign-off summary

| Module | Module-agent status | Tester status | Open bug IDs | Sign-off/date |
| --- | --- | --- | --- | --- |
| all modules | pending | pending | pending | pending |
