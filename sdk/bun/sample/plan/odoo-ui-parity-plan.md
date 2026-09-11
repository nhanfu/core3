# Odoo 19 UI parity — module register

## Scope

Clone the Odoo 19 Community UI in Core3, module by module and menu by menu.
This is UI-only work: pages use deterministic YAML fixture data until backend work
is explicitly planned. A module may not enter implementation until its linked
sub-plan is approved and marked `ready`.

Website Builder, Forum, Blog, eCommerce, and other composition-oriented modules
remain YAML-driven are on-hold for an appropreate architecture.
frontend code is not copied.

## Binding fidelity contract

This is a strict UI/UX parity project. For every module, implementation MUST
follow the Odoo menu tree first and build screens only after the complete visible
menu, submenu, action, permission, and ordering inventory has been recorded.
No screen may be added as an isolated approximation or placed in a different
menu merely because it is convenient for Core3 routing. Any unavoidable route
difference must be explicitly documented as a deliberate alias or redirect.

For every Odoo screen, the implementation MUST reproduce the observed layout
hierarchy and visual language: page frame, toolbar, content widths, colors,
backgrounds, borders, radii, typography, spacing, responsive breakpoints, tabs,
sections, section ordering, component types, labels, helper text, empty states,
and action placement. Visible text must match Odoo exactly, including menu
labels, tab labels, section headings, field labels, button labels, status text,
placeholders, and explanatory copy, except where a documented localization or
Core3 security constraint requires a difference.

ListView view-mode navigation MUST use visible text tabs (for example List,
Kanban, Pivot, Graph, or Calendar) and MUST NOT use icon-only navigation. This
rule applies even where an icon-navigation implementation already exists; such
navigation must be replaced or disabled for parity work. Icons may remain as
decorative or supplementary controls, but they must not be the sole way to
change a view or discover a screen.

Each screen is accepted only after authenticated desktop and mobile headless
browser captures have been compared with the corresponding Odoo screen. The
comparison must check menu location and labels, layout geometry, color and
spacing tokens, tabs, sections, component and text parity, responsive behavior,
and all visible interactive states. A module is not ready when its screens work
but its menu structure or visual/UX details remain approximate.

## Live Odoo reference environment

- URL: `http://localhost:8073`
- Database: `core3_codex_demo_20260912`
- Login email: `codex@core3.local`
- Login password: `Core3CodexAdmin20260912!`
- Master password: `Core3CodexMaster20260912!`
- Odoo container: `odoo-core3-codex-20260912`
- PostgreSQL container: `odoo-core3-codex-20260912-db`
- Start command: `docker start odoo-core3-codex-20260912-db odoo-core3-codex-20260912`
- Stop command: `docker stop odoo-core3-codex-20260912 odoo-core3-codex-20260912-db`

The former `odoo-core3-user` Odoo container was stopped and retained as
`odoo-core3-user-stopped`; its PostgreSQL container and volumes are preserved
for rollback. The active reference is a separately provisioned Odoo 19 image
with a dedicated PostgreSQL 16 database, a dedicated Odoo data volume, and
official demo data enabled during database creation. New parity captures must
use the active URL and credentials above. Keep credentials out of source code
outside this local parity plan.

The `core3_codex_demo_20260912` database has demo-enabled Odoo modules
installed for CRM, Sales, Purchase, Accounting, Inventory, Point of Sale,
Events, Employees, Recruitment, Expenses, Time Off, Timesheets, Project,
Maintenance, Fleet, Manufacturing, Email Marketing, Live Chat, Calendar, and
the related source modules required by those applications. Its verified demo
data includes partners, products, CRM leads, events, sales orders, projects,
expenses, leave records, maintenance requests, fleet vehicles, surveys, POS
catalog records, and manufacturing/inventory records.

## Module register

| Core3 service | Odoo reference addon | Source status | Sub-plan | Status |
| --- | --- | --- | --- | --- |
| base | contacts, base | available | `odoo-ui-parity/base-contacts.md` | in-progress |
| chat | mail | available | `odoo-ui-parity/chat.md` | ready |
| crm | crm | available | `odoo-ui-parity/crm.md` | in-progress |
| order | sale_management | available | `odoo-ui-parity/sales.md` | ready |
| point-of-sale | point_of_sale | available | `odoo-ui-parity/point-of-sale.md` | in-progress |
| sale-subscription | sale_subscription | unavailable in supplied source | `odoo-ui-parity/subscriptions.md` | planned |
| sale-renting | sale_renting | unavailable in supplied source | `odoo-ui-parity/rental.md` | planned |
| accounting | account | available | `odoo-ui-parity/accounting.md` | in-progress |
| expenses | hr_expense | available | `odoo-ui-parity/expenses.md` | ready |
| documents | documents | unavailable in supplied source | `odoo-ui-parity/documents.md` | planned |
| approvals | approvals | unavailable in supplied source | `odoo-ui-parity/approvals.md` | planned |
| spreadsheet | spreadsheet | available | `odoo-ui-parity/spreadsheet.md` | ready |
| inventory | stock | available | `odoo-ui-parity/inventory.md` | ready |
| manufacturing | mrp | available | `odoo-ui-parity/manufacturing.md` | in-progress |
| purchase | purchase | available | `odoo-ui-parity/purchase.md` | in-progress |
| maintenance | maintenance | available | `odoo-ui-parity/maintenance.md` | ready |
| field-service | industry_fsm | unavailable in supplied source | `odoo-ui-parity/field-service.md` | planned |
| helpdesk | helpdesk | unavailable in supplied source | `odoo-ui-parity/helpdesk.md` | planned |
| quality | quality | unavailable in supplied source | `odoo-ui-parity/quality.md` | planned |
| plm | mrp_plm | unavailable in supplied source | `odoo-ui-parity/plm.md` | planned |
| employees | hr | available | `odoo-ui-parity/employees.md` | in-progress |
| recruitment | hr_recruitment | available | `odoo-ui-parity/recruitment.md` | ready |
| time-off | hr_holidays | available | `odoo-ui-parity/time-off.md` | in-progress |
| appraisals | hr_appraisal | unavailable in supplied source | `odoo-ui-parity/appraisals.md` | planned |
| referrals | hr_referral | unavailable in supplied source | `odoo-ui-parity/referrals.md` | planned |
| fleet | fleet | available | `odoo-ui-parity/fleet.md` | in-progress |
| email-marketing | mass_mailing | available | `odoo-ui-parity/email-marketing.md` | planned |
| sms-marketing | mass_mailing_sms | available | `odoo-ui-parity/sms-marketing.md` | planned |
| events | event | available | `odoo-ui-parity/events.md` | in-progress |
| surveys | survey | available | `odoo-ui-parity/surveys.md` | in-progress |
| marketing-automation | marketing_automation | unavailable in supplied source | `odoo-ui-parity/marketing-automation.md` | planned |
| project | project | available | `odoo-ui-parity/project.md` | ready |
| timesheets | hr_timesheet | available | `odoo-ui-parity/timesheets.md` | ready |
| website | website | available; YAML-driven | `odoo-ui-parity/website.md` | on-hold |
| ecommerce | website_sale | available; YAML-driven | `odoo-ui-parity/ecommerce.md` | on-hold |
| blog | website_blog | available; YAML-driven | `odoo-ui-parity/blog.md` | on-hold |
| forum | website_forum | available; YAML-driven | `odoo-ui-parity/forum.md` | on-hold |
| livechat | im_livechat | available | `odoo-ui-parity/livechat.md` | planned |

`auth` and `ai` are Core3 infrastructure, not Odoo-clone modules, and are outside
this register.

## Required gate for every sub-plan

1. Record the exact Odoo menu tree first: application, menu, submenu, action,
   ordering, visibility groups, route/action context, and every screen reached
   from each visible entry.
2. Record the Odoo addon/version and whether its manifest provides official demo
   data.
3. Enumerate every visible menu, action, and view state.
4. Identify Odoo screenshots/routes at desktop and mobile viewports.
5. Declare Core3 YAML mock data in the screen's backend datasource definition for
   every list, form, kanban, calendar, chart, report, pivot, dashboard, and empty
   state shown by the module. Page-layout YAML remains data-source-only, so its
   backend mock provider can later be replaced by a query without changing UI YAML.
6. Specify the exact screen layout, colors, spacing, tabs, sections, components,
   and visible text to be matched, including the ListView tab-navigation rule.
7. Identify shared UI primitives required by the module; do not implement new
   primitives before recording them here.
8. Define visual, menu-order, responsive, interaction, permission, and
   fixture-data acceptance checks, including the required headless comparison.

Only after all eight are written does implementation begin.

The shared mock-data contract is defined in
`odoo-ui-parity/screen-mock-data.md` and applies to every module sub-plan.
